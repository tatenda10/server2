const db = require('../../db/db');

// Function to mark attendance
const markAttendance = async (RegNumber, classId, date, term, year, status) => {
    if (!RegNumber) {
        console.log('reg number required');
        throw new Error('RegNumber is required');
    }

    // Delete the existing record if it exists
    const deleteQuery = `
        DELETE FROM attendance
        WHERE RegNumber = ? AND ClassID = ? AND Date = ?
    `;
    const deleteValues = [RegNumber, classId, date];

    const insertQuery = `
        INSERT INTO attendance (RegNumber, ClassID, Date, Term, Year, Status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const insertValues = [RegNumber, classId, date, term, year, status];

    try {
        // Delete the existing attendance record
        await db.query(deleteQuery, deleteValues);

        // Insert the new attendance record
        const [result] = await db.query(insertQuery, insertValues);
        return result.affectedRows;
    } catch (err) {
        console.error('Error marking attendance:', err);
        throw err;
    }
};




// Function to update attendance
const updateAttendance = async (RegNumber, classId, date, status) => {
    const query = `
        UPDATE attendance
        SET Status = ?
        WHERE RegNumber = ? AND ClassID = ? AND Date = ?
    `;
    const values = [status, RegNumber, classId, date];

    try {
        const [result] = await db.query(query, values);
        return result.affectedRows;
    } catch (err) {
        console.error('Error updating attendance:', err);
        throw err;
    }
};

// Function to get attendance for a single student and term
const getAttendanceForStudent = async (regNumber, term, year) => {
    const query = `
        SELECT Date, Status, ClassID
        FROM attendance
        WHERE RegNumber = ? AND Term = ? AND Year = ?
    `;
    const values = [regNumber, term, year];

    try {
        const [attendance] = await db.query(query, values);
        return attendance;
    } catch (err) {
        console.error('Error fetching attendance:', err);
        throw err;
    }
};

module.exports = { markAttendance, updateAttendance, getAttendanceForStudent };
