const db = require('../../db/db'); // Ensure correct path to db


const loginStudent = async (req, res) => {
    const { regNumber, password } = req.body;

    if (!regNumber || !password) {
        return res.status(400).json({ message: 'Please provide both registration number and password.' });
    }

    try {
        // Connect to the database

        // Query the student by registration number
        const [rows] = await db.execute('SELECT * FROM students WHERE RegNumber = ?', [regNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const student = rows[0];

        // Compare the provided password with the stored password (plain text comparison)
        if (password !== student.PasswordHash) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        // Return the registration number if login is successful
        res.status(200).json({ regNumber: student.RegNumber });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


const changeStudentPassword = async (req, res) => {
    const { regNumber, oldPassword, newPassword } = req.body;

    if (!regNumber || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Please provide registration number, old password, and new password.' });
    }

    try {
        // Query the student by registration number
        const [rows] = await db.execute('SELECT * FROM students WHERE RegNumber = ?', [regNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const student = rows[0];

        // Compare the provided old password with the stored password (plain text comparison)
        if (oldPassword !== student.PasswordHash) {
            return res.status(401).json({ message: 'Invalid old password.' });
        }

        // Update the student's password
        await db.execute('UPDATE students SET PasswordHash = ? WHERE RegNumber = ?', [newPassword, regNumber]);

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


module.exports = { loginStudent ,changeStudentPassword };