const db = require('../../db/db');
const { Paynow } = require('paynow');
const fetch = require('node-fetch');
const cron = require('node-cron');
require('dotenv').config();

const { 
    getInvoice, 
    checkStudentMedicalAid, 
    getMedicalAidAmount, 
} = require('./Utilityfunctions');

// Paynow configuration
const paynowIntegrationIdUSD = process.env.PAYNOW_INTEGRATION_ID_USD;
const paynowIntegrationKeyUSD = process.env.PAYNOW_INTEGRATION_KEY_USD;
const paynowemail = process.env.PAYNOW_EMAIL;

const paynowUSD = new Paynow(paynowIntegrationIdUSD, paynowIntegrationKeyUSD);
paynowUSD.resultUrl = 'http://example.com/gateways/paynow/update';
paynowUSD.returnUrl = 'http://localhost:3000/Cart';

// Function to generate a random Paynow reference
function generatePaynowReference() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let reference = '';
    for (let i = 0; i < 30; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        reference += charset.charAt(randomIndex);
    }
    return reference;
}

// Function to create a Paynow USD payment
const createPaynowUSDPayment = async (req, res) => {
    const { reg_number, class_type, form, year, term, amount_paid } = req.body;

    try {
        // Check if the student exists in the students table
        const [student] = await db.query('SELECT * FROM students WHERE reg_number = ?', [reg_number]);
        if (!student.length) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if the student is in the new_students table
        const [newStudent] = await db.query('SELECT * FROM new_students WHERE reg_number = ?', [reg_number]);

        let registrationAmount = 0;
        if (newStudent.length > 0) {
            // Fetch the registration fees for the student's form
            const formRange = newStudent[0].form <= 4 ? 'Form 1-4' : 'Form 5-6';
            const [registrationFees] = await db.query('SELECT amount FROM registrations WHERE form_range = ?', [formRange]);

            if (registrationFees.length > 0) {
                registrationAmount = parseFloat(registrationFees[0].amount);
            } else {
                console.log(`No registration amount found for ${formRange}`);
            }
        }

        // Get the invoice details
        const invoice = await getInvoice(class_type, form, year, term);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        let invoiceTotal = parseFloat(invoice.total_amount);

        // Check if the student has medical aid and adjust the invoice total if needed
        const hasMedicalAid = await checkStudentMedicalAid(reg_number);
        if (hasMedicalAid) {
            const medicalAidAmount = parseFloat(await getMedicalAidAmount());
            invoiceTotal += medicalAidAmount;
        }

        // Add the registration fee for new students
        if (registrationAmount > 0) {
            invoiceTotal += registrationAmount;
        }

        // Create the Paynow payment object
        const paynowReference = generatePaynowReference();
        const payment = paynowUSD.createPayment(paynowReference, paynowemail);
        payment.add('Invoice Payment', amount_paid);

        // Send the payment request
        const paynowResponse = await paynowUSD.send(payment);
        if (paynowResponse.success) {
            // Check for duplicate payment
            const [existingPayment] = await db.query(`
                SELECT * FROM temp_payments WHERE reg_number = ? AND class_type = ? AND form = ? AND year = ? AND term = ? AND received_amount = ? AND paynow_reference = ?
            `, [reg_number, class_type, form, year, term, amount_paid, paynowReference]);

            if (existingPayment.length) {
                return res.status(409).json({ message: 'Duplicate payment detected' });
            }

            // Insert into the temporary payments table
            const [tempPaymentResult] = await db.query(`
                INSERT INTO temp_payments (reg_number, class_type, form, year, term, received_amount, reported_amount, currency, payment_method, paynow_reference, status, poll_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', 'PaynowUSD', ?, 'Created', ?, NOW())
            `, [reg_number, class_type, form, year, term, amount_paid, amount_paid, paynowReference, paynowResponse.pollUrl]);

            const tempPaymentId = tempPaymentResult.insertId;

            // Poll the payment status
            await pollPaymentStatus(paynowResponse.pollUrl, tempPaymentId);

            // If the payment is successful, remove the student from new_students table
            if (newStudent.length > 0) {
                await db.query('DELETE FROM new_students WHERE reg_number = ?', [reg_number]);
            }

            // Return the payment URL for redirection
            return res.status(200).json({ redirectLink: paynowResponse.redirectUrl, pollUrl: paynowResponse.pollUrl });
        } else {
            return res.status(500).json({ error: paynowResponse.error });
        }
    } catch (error) {
        console.error('Error processing Paynow USD payment:', error);
        res.status(500).json({ message: 'Failed to process payment' });
    }
};



// Function to poll the payment status
const pollPaymentStatus = async (pollUrl, paymentId) => {
    try {
        const response = await fetch(pollUrl);
        const responseBody = await response.text();
        const params = new URLSearchParams(responseBody);
        const status = params.get('status');

        if (status === 'Paid') {
            // Fetch the record from temp_payments to ensure all fields are present
            const [tempPayment] = await db.query(`SELECT * FROM temp_payments WHERE id = ?`, [paymentId]);

            if (!tempPayment.length) {
                throw new Error('No temp payment record found.');
            }

            const payment = tempPayment[0];

            // Ensure no duplicate payments in the payments table
            const [existingPayment] = await db.query(`
                SELECT * FROM payments WHERE reg_number = ? AND class_type = ? AND form = ? AND year = ? AND term = ? AND paynow_reference = ?
            `, [payment.reg_number, payment.class_type, payment.form, payment.year, payment.term, payment.paynow_reference]);

            if (!existingPayment.length) {
                // Move the payment from temp_payments to payments
                await db.query(`
                    INSERT INTO payments (reg_number, class_type, form, year, term, received_amount, reported_amount, currency, payment_method, paynow_reference, status, created_at)
                    SELECT reg_number, class_type, form, year, term, received_amount, reported_amount, currency, payment_method, paynow_reference, 'Paid', NOW()
                    FROM temp_payments WHERE id = ?
                `, [paymentId]);

                // Update the student balance using the correct parameters
                await updateStudentBalance(
                    payment.reg_number,
                    payment.class_type,
                    payment.form,
                    payment.year,
                    payment.term,
                    payment.reported_amount,
                    'Paid'
                );
            }

            // Remove the payment from temp_payments
            await db.query(`DELETE FROM temp_payments WHERE id = ?`, [paymentId]);
        } else {
            await db.query(`UPDATE temp_payments SET status = ? WHERE id = ?`, [status, paymentId]);
        }
    } catch (error) {
        console.error('Error polling payment status:', error);
    }
};

// Function to update student balance
const updateStudentBalance = async (reg_number, class_type, form, year, term, reportedAmount, status) => {
    try {
        // Check if the student exists in the students table
        const [student] = await db.query('SELECT * FROM students WHERE reg_number = ?', [reg_number]);
        if (!student.length) {
            throw new Error('Student not found');
        }

        // Ensure reportedAmount is treated as a number
        reportedAmount = parseFloat(reportedAmount);

        // Fetch the invoice details
        const invoice = await getInvoice(class_type, form, year, term);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Check if the student has medical aid and adjust the invoice total if needed
        let invoiceTotal = parseFloat(invoice.total_amount); // Start with the base invoice total
        const hasMedicalAid = await checkStudentMedicalAid(reg_number);
        if (hasMedicalAid) {
            const medicalAidAmount = parseFloat(await getMedicalAidAmount()); // Ensure it's a number
            invoiceTotal += medicalAidAmount;
        }

        // Fetch prior balance
        const [priorBalance] = await db.query(`
            SELECT * FROM balances WHERE reg_number = ?
        `, [reg_number]);

        let remainingAmount = reportedAmount;
        let totalCredit = 0;

        // If prior balance exists, apply any CR balances and update balance
        if (priorBalance.length && priorBalance[0].balance_type === 'CR') {
            totalCredit = parseFloat(priorBalance[0].balance);

            // Remove the prior CR balance from the database
            await db.query(`
                DELETE FROM balances WHERE reg_number = ?
            `, [reg_number]);

            remainingAmount += totalCredit;
        }

        // Calculate the remaining balance for the current term
        let currentBalance = invoiceTotal - remainingAmount;
        let balanceType = 'DR';

        if (currentBalance < 0) {
            // Overpayment results in a CR balance
            currentBalance = Math.abs(currentBalance);
            balanceType = 'CR';
        } else if (currentBalance > 0) {
            // Underpayment results in a DR balance
            balanceType = 'DR';
        } else {
            // Payment exactly matches the invoice
            currentBalance = 0;
            balanceType = 'DR';
        }

        // Update or insert the balance for the current term
        await db.query(`
            INSERT INTO balances (reg_number, class_type, form, year, term, balance, balance_type, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'USD')
            ON DUPLICATE KEY UPDATE balance = ?, balance_type = ?, updated_at = CURRENT_TIMESTAMP
        `, [reg_number, class_type, form, year, term, currentBalance, balanceType, currentBalance, balanceType]);

        // Handle if the payment was for the wrong term/year order
        if (status === 'Paid') {
            const [nextExpectedTerm] = await db.query(`
                SELECT MAX(term) as max_term, MAX(year) as max_year FROM payments WHERE reg_number = ?
            `, [reg_number]);

            if (nextExpectedTerm.max_term && nextExpectedTerm.max_year) {
                if (
                    year < nextExpectedTerm.max_year ||
                    (year === nextExpectedTerm.max_year && term <= nextExpectedTerm.max_term)
                ) {
                    await db.query(`
                        UPDATE balances 
                        SET balance = balance + ?, balance_type = 'CR'
                        WHERE reg_number = ?
                    `, [reportedAmount, reg_number]);
                }
            }
        }

        return { balance: currentBalance, balanceType };
    } catch (error) {
        console.error('Error updating balance:', error);
        throw error;
    }
};


// Function to poll all pending payments periodically
const pollPendingPayments = async () => {
    try {
        const [pendingPayments] = await db.query(`
            SELECT id, poll_url FROM temp_payments WHERE status IN ('Created', 'Sent')
        `);

        for (const payment of pendingPayments) {
            await pollPaymentStatus(payment.poll_url, payment.id);
        }
    } catch (error) {
        console.error('Error fetching pending payments:', error);
    }
};

// Schedule the job to run every 1 minute
cron.schedule('*/1 * * * *', () => {
    pollPendingPayments();
});

module.exports = {
    createPaynowUSDPayment,
};
