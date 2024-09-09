const db = require('../../db/db');


const loginParent = async (req, res) => {
    const { regNumber, password } = req.body;

    try {
        const query = `SELECT RegNumber, Password FROM Parents WHERE RegNumber = ?`;
        const [rows] = await db.query(query, [regNumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid RegNumber or Password' });
        }

        const parent = rows[0];

        // Directly compare the provided password with the stored password
        if (parent.Password === password) {
            return res.status(200).json({ RegNumber: parent.RegNumber });
        } else {
            return res.status(401).json({ error: 'Invalid RegNumber or Password' });
        }
    } catch (error) {
        console.error('Error logging in parent:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const changeParentPassword = async (req, res) => {
    const { regNumber, oldPassword, newPassword } = req.body;

    try {
        const query = `SELECT Password FROM parents WHERE RegNumber = ?`;
        const [rows] = await db.query(query, [regNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Parent not found' });
        }

        const parent = rows[0];

        // Directly compare the old password with the stored password
        if (parent.Password !== oldPassword) {
            return res.status(401).json({ error: 'Old password is incorrect' });
        }

        // Update the password to the new password
        const updateQuery = `UPDATE Parents SET Password = ? WHERE RegNumber = ?`;
        await db.query(updateQuery, [newPassword, regNumber]);

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing parent password:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    loginParent,
    changeParentPassword
};
