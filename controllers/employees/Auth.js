const db = require('../../db/db'); // Ensure correct path to db


const loginEmployee2 = async (req, res) => {
    const { employeeNumber, password } = req.body;

    if (!employeeNumber || !password) {
        return res.status(400).json({ message: 'Please provide both employee number and password.' });
    }

    try {
        // Query the employee by employee number
        const [rows] = await db.execute('SELECT * FROM employees WHERE EmployeeNumber = ?', [employeeNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found.' });
        }

        const employee = rows[0];

        // Compare the provided password with the stored password (plain text comparison)
        if (password !== employee.Password) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        // Return the employee number if login is successful
        res.status(200).json({ employeeNumber: employee.EmployeeNumber });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const loginEmployee = async (req, res) => {
    const { employeeNumber, password } = req.body;

    if (!employeeNumber || !password) {
        return res.status(400).json({ message: 'Please provide both employee number and password.' });
    }

    try {
        // Query the employee by employee number
        const [rows] = await db.execute('SELECT * FROM employees WHERE EmployeeNumber = ?', [employeeNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found.' });
        }

        const employee = rows[0];

        // Check if the employee's role is Teacher
        if (employee.Role !== 'Teacher') {
            return res.status(403).json({ message: 'Access denied. Only teachers are allowed to log in.' });
        }

        // Compare the provided password with the stored password (plain text comparison)
        if (password !== employee.Password) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        // Return the employee number if login is successful
        res.status(200).json({ employeeNumber: employee.EmployeeNumber });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const changeEmployeePassword = async (req, res) => {
    const { employeeNumber, oldPassword, newPassword } = req.body;

    if (!employeeNumber || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Please provide employee number, old password, and new password.' });
    }

    try {
        // Query the employee by employee number
        const [rows] = await db.execute('SELECT * FROM employees WHERE EmployeeNumber = ?', [employeeNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found.' });
        }

        const employee = rows[0];

        // Compare the provided old password with the stored password (plain text comparison)
        if (oldPassword !== employee.Password) {
            return res.status(401).json({ message: 'Invalid old password.' });
        }

        // Update the employee's password
        await db.execute('UPDATE employees SET Password = ? WHERE EmployeeNumber = ?', [newPassword, employeeNumber]);

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = {loginEmployee ,loginEmployee2, changeEmployeePassword };
