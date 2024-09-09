const db = require('../../db/db'); // Adjust this to your actual db module path

// Function to get payslips for a specific employee with additional employee details
const getPayslipsForEmployee = async (req, res) => {
    const { employeeNumber } = req.params;
    try {
        const [payslips] = await db.query(`
            SELECT p.*, e.Name, e.Surname, e.Department, e.Role 
            FROM payslips p
            JOIN employees e ON p.EmployeeNumber = e.EmployeeNumber
            WHERE p.EmployeeNumber = ?
        `, [employeeNumber]);

        res.json(payslips);
    } catch (err) {
        console.error('Error fetching payslips:', err);
        res.status(500).json({ error: 'Failed to fetch payslips' });
    }
};



module.exports = {
    getPayslipsForEmployee
};

