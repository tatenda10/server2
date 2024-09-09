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
const paynowIntegrationIdZIG = process.env.PAYNOW_INTEGRATION_ID_ZIG;
const paynowIntegrationKeyZIG = process.env.PAYNOW_INTEGRATION_KEY_ZIG;
const paynowemail = process.env.PAYNOW_EMAIL;

const paynowZIG = new Paynow(paynowIntegrationIdZIG, paynowIntegrationKeyZIG);
paynowZIG.resultUrl = 'http://example.com/gateways/paynow/update';
paynowZIG.returnUrl = 'http://localhost:3000/Cart';

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

// Function to create a Paynow ZIG payment using `temp_payments2`
const createPaynowZIGPayment = async (req, res) => {
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

        // Ensure payment is for the correct term order
        const [lastPayment] = await db.query(`
            SELECT year, term FROM payments WHERE reg_number = ? ORDER BY year DESC, term DESC LIMIT 1
        `, [reg_number]);

        if (lastPayment.length) {
            const lastYear = lastPayment[0].year;
            const lastTerm = lastPayment[0].term;

            if (year < lastYear || (year === lastYear && term <= lastTerm)) {
                return res.status(400).json({ message: 'Invalid payment term order. Please pay in correct sequence.' });
            }
        }

        // Get the invoice details
        const invoice = await getInvoice(class_type, form, year, term);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        let invoiceTotal = parseFloat(invoice.total_amount);

        // Check if the student has medical aid and adjust the invoice total if needed
        const hasMedicalAid = await checkStudentMedicalAid(reg_number);
        if (hasMedicalAid) {
            const medicalAidAmount = await getMedicalAidAmount();
            invoiceTotal += medicalAidAmount;
        }

        // Add the registration fee for new students
        if (registrationAmount > 0) {
            invoiceTotal += registrationAmount;
        }

        // Get the latest ZIG to USD exchange rate
        const [rate] = await db.query(`SELECT usd_to_zig_rate FROM rates ORDER BY created_at DESC LIMIT 1`);
        const reportedAmount = amount_paid / rate[0].usd_to_zig_rate;

        // Check if the payment exceeds the allowed RTGS percentage
        if (reportedAmount > invoiceTotal * (invoice.rtgs_percentage / 100)) {
            return res.status(400).json({ message: 'Exceeded allowed RTGS payment amount' });
        }

        // Create the Paynow payment object
        const paynowReference = generatePaynowReference();
        const payment = paynowZIG.createPayment(paynowReference, paynowemail);
        payment.add('Invoice Payment', amount_paid);

        // Send the payment request
        const paynowResponse = await paynowZIG.send(payment);
        if (paynowResponse.success) {
            // Insert into the `temp_payments2` table
            const [tempPaymentResult] = await db.query(`
                INSERT INTO temp_payments2 (reg_number, class_type, form, year, term, received_amount, reported_amount, currency, payment_method, paynow_reference, status, poll_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ZIG', 'PaynowZIG', ?, 'Created', ?, NOW())
            `, [reg_number, class_type, form, year, term, amount_paid, reportedAmount, paynowReference, paynowResponse.pollUrl]);

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
        console.error('Error processing Paynow ZIG payment:', error);
        res.status(500).json({ message: 'Failed to process payment' });
    }
};



// Function to poll the payment status using `temp_payments2`
const pollPaymentStatus = async (pollUrl, paymentId) => {
    try {
        const response = await fetch(pollUrl);
        const responseBody = await response.text();
        const params = new URLSearchParams(responseBody);
        const status = params.get('status');

        if (status === 'Paid') {
            // Fetch the record from `temp_payments2` to ensure all fields are present
            const [tempPayment] = await db.query(`
                SELECT * FROM temp_payments2 WHERE id = ?
            `, [paymentId]);

            if (!tempPayment.length) {
                throw new Error('No temp payment record found.');
            }

            const payment = tempPayment[0];

            // Move the payment from `temp_payments2` to `payments` and update status
            await db.query(`
                INSERT INTO payments (reg_number, class_type, form, year, term, received_amount, reported_amount, currency, payment_method, paynow_reference, status, created_at)
                SELECT reg_number, class_type, form, year, term, received_amount, reported_amount, currency, payment_method, paynow_reference, 'Paid', NOW()
                FROM temp_payments2 WHERE id = ?
            `, [paymentId]);

            // Update the student balance using the correct parameters
            await updateStudentBalance(
                payment.reg_number,
                payment.class_type,
                payment.form,
                payment.year,
                payment.term,
                payment.reported_amount
            );

            // Remove the payment from `temp_payments2`
            await db.query(`DELETE FROM temp_payments2 WHERE id = ?`, [paymentId]);
        } else {
            await db.query(`UPDATE temp_payments2 SET status = ? WHERE id = ?`, [status, paymentId]);
        }
    } catch (error) {
        console.error('Error polling payment status:', error);
    }
};

// Function to update student balance
const updateStudentBalance = async (reg_number, class_type, form, year, term, reportedAmount) => {
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
        if (priorBalance.length) {
            const previousBalance = priorBalance[0];
            if (previousBalance.balance_type === 'CR') {
                totalCredit = parseFloat(previousBalance.balance);

                // Remove the prior CR balance from the database
                await db.query(`
                    DELETE FROM balances WHERE reg_number = ?
                `, [reg_number]);

                remainingAmount += totalCredit;
            }

            if (previousBalance.balance_type === 'DR' && previousBalance.balance === 0) {
                // If this term is fully paid, add the payment to CR balance
                let currentBalance = reportedAmount;
                let balanceType = 'CR';

                await db.query(`
                    INSERT INTO balances (reg_number, class_type, form, year, term, balance, balance_type, currency)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'ZIG')
                    ON DUPLICATE KEY UPDATE balance = ?, balance_type = ?, updated_at = CURRENT_TIMESTAMP
                `, [reg_number, class_type, form, year, term, currentBalance, balanceType, currentBalance, balanceType]);

                return { balance: currentBalance, balanceType };
            }
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
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ZIG')
            ON DUPLICATE KEY UPDATE balance = ?, balance_type = ?, updated_at = CURRENT_TIMESTAMP
        `, [reg_number, class_type, form, year, term, currentBalance, balanceType, currentBalance, balanceType]);

        return { balance: currentBalance, balanceType };
    } catch (error) {
        console.error('Error updating balance:', error);
        throw error;
    }
};


// Function to poll all pending payments periodically using `temp_payments2`
const pollPendingPayments = async () => {
    try {
        const [pendingPayments] = await db.query(`
            SELECT id, poll_url FROM temp_payments2 WHERE status IN ('Created', 'Sent')
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
    createPaynowZIGPayment,
};
