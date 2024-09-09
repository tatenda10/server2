const db = require('../../db/db');

// Utility function to fetch invoice details
async function getInvoice(class_type, form, year, term) {
    const [invoice] = await db.query(`
        SELECT * FROM invoices 
        WHERE class_type = ? AND form = ? AND year = ? AND term = ?
    `, [class_type, form, year, term]);

    return invoice.length ? invoice[0] : null;
}

// Utility function to check if a student has medical aid
async function checkStudentMedicalAid(reg_number) {
    const [student] = await db.query(`
        SELECT HasMedicalAid FROM students WHERE RegNumber = ?
    `, [reg_number]);

    return student.length ? student[0].HasMedicalAid : false;
}

// Utility function to fetch the latest medical aid amount
async function getMedicalAidAmount() {
    const [result] = await db.query(`
        SELECT aid_amount FROM medical_aid ORDER BY created_at DESC LIMIT 1
    `);

    return result.length ? result[0].aid_amount : 0;
}

// Utility function to fetch the total payments made against an invoice
async function getTotalPayments(reg_number, class_type, form, year, term) {
    const [result] = await db.query(`
        SELECT SUM(received_amount) AS total_paid FROM payments 
        WHERE reg_number = ? AND class_type = ? AND form = ? AND year = ? AND term = ?
    `, [reg_number, class_type, form, year, term]);

    return result.length ? result[0].total_paid : 0;
}

// Utility function to update student balance
async function updateStudentBalance(reg_number, class_type, form, year, term, reportedAmount, totalAmount) {
    try {
        console.log(`Starting balance update for student ${reg_number}`);

        // Ensure reportedAmount and totalAmount are treated as numbers
        reportedAmount = parseFloat(reportedAmount);
        totalAmount = parseFloat(totalAmount);

        // Fetch prior balances
        const [priorBalances] = await db.query(`
            SELECT * FROM balances WHERE reg_number = ? ORDER BY year ASC, term ASC
        `, [reg_number]);

        let remainingAmount = reportedAmount;
        let totalCredit = 0;

        // Log the initial reported amount
        console.log(`Initial reported amount: ${reportedAmount}`);

        // Apply CR balances from previous terms
        for (const priorBalance of priorBalances) {
            if (priorBalance.balance_type === 'CR') {
                totalCredit += parseFloat(priorBalance.balance);
                console.log(`Applying prior CR balance: ${priorBalance.balance}`);
                
                // Remove the prior CR balance from the database
                await db.query(`
                    DELETE FROM balances WHERE id = ?
                `, [priorBalance.id]);
            }
        }

        // Log total credit before applying it to the remaining amount
        console.log(`Total credit from previous terms: ${totalCredit}`);

        // Add any CR balance from previous terms to the current payment amount
        remainingAmount += totalCredit;

        // Log the combined amount before calculating the balance
        console.log(`Remaining amount after applying credits: ${remainingAmount}`);

        // Calculate the remaining balance for the current term
        let currentBalance = totalAmount - remainingAmount;
        console.log(`Calculated balance after applying payment: ${currentBalance}`);

        let balanceType = 'DR';

        if (currentBalance < 0) {
            // Overpayment results in a CR balance
            currentBalance = Math.abs(currentBalance);
            balanceType = 'CR';
            console.log(`Overpayment detected, new CR balance: ${currentBalance}`);
        } else if (currentBalance > 0) {
            // Underpayment results in a DR balance
            balanceType = 'DR';
            console.log(`Underpayment detected, new DR balance: ${currentBalance}`);
        } else {
            // Payment exactly matches the invoice
            currentBalance = 0;
            balanceType = 'DR';
            console.log(`Payment matches the invoice, balance is zero.`);
        }

        // Update or insert the balance for the current term
        await db.query(`
            INSERT INTO balances (reg_number, class_type, form, year, term, balance, balance_type, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'USD')
            ON DUPLICATE KEY UPDATE balance = ?, balance_type = ?, updated_at = CURRENT_TIMESTAMP
        `, [reg_number, class_type, form, year, term, currentBalance, balanceType, currentBalance, balanceType]);

        console.log(`Final balance for student ${reg_number}: ${currentBalance} ${balanceType}`);

        return { balance: currentBalance, balanceType };
    } catch (error) {
        console.error('Error updating balance:', error);
        throw error;
    }
}

module.exports = {
    getInvoice,
    checkStudentMedicalAid,
    getMedicalAidAmount,
    getTotalPayments,
    updateStudentBalance
};
