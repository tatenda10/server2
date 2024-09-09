
const db = require('../../db/db');

// Get student record by registration number with optional search parameters
const searchStudentRecords = async (req, res) => {
    const { reg_number } = req.params;
    const { term, year, payment_method, currency } = req.query;

    try {
        // Prepare query and parameters for transactions
        let transactionQuery = `SELECT * FROM payments WHERE reg_number = ?`;
        const queryParams = [reg_number];

        if (term) {
            transactionQuery += ` AND term = ?`;
            queryParams.push(term);
        }

        if (year) {
            transactionQuery += ` AND year = ?`;
            queryParams.push(year);
        }

        if (payment_method) {
            transactionQuery += ` AND payment_method = ?`;
            queryParams.push(payment_method);
        }

        if (currency) {
            transactionQuery += ` AND currency = ?`;
            queryParams.push(currency);
        }

        // Fetch student transactions based on search criteria
        const [transactions] = await db.query(transactionQuery, queryParams);

        res.status(200).json({
            transactions
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
};


const getStudentRecord = async (req, res) => {
    const { reg_number } = req.params;

    try {
        // Fetch student details including name, surname, and medical aid status
        const [student] = await db.query(`
            SELECT RegNumber, Name, Surname, HasMedicalAid FROM students WHERE RegNumber = ?
        `, [reg_number]);

        if (student.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Fetch student balances
        const [balances] = await db.query(`
            SELECT * FROM balances WHERE reg_number = ?
        `, [reg_number]);

        // Fetch student transactions
        const [transactions] = await db.query(`
            SELECT * FROM payments WHERE reg_number = ?
        `, [reg_number]);

        res.status(200).json({
            student: student[0],
            balances,
            transactions
        });
    } catch (error) {
        console.error('Error fetching student record:', error);
        res.status(500).json({ message: 'Failed to fetch student record' });
    }
};

module.exports = {
    searchStudentRecords,
    getStudentRecord
};
