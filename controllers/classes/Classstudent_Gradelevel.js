const db = require('../../db/db');

const addStudentToClass = async (regNumber, classId) => {
    console.log(regNumber)
    const query = `INSERT INTO studentclasses (RegNumber, ClassID) VALUES (?, ?)`;
    const values = [regNumber, classId];
    
    try {
        const [result] = await db.query(query, values);
        return result;
    } catch (err) {
        console.error('Error adding student to class:', err);
        throw err;
    }
};

const getStudentsInClass = async (classId) => {
    const studentQuery = `
        SELECT s.RegNumber, s.Name, s.Surname, s.Gender 
        FROM students s
        JOIN studentclasses sc ON s.RegNumber = sc.RegNumber
        WHERE sc.ClassID = ?
    `;
    const countQuery = `
        SELECT COUNT(*) as total
        FROM studentclasses
        WHERE ClassID = ?
    `;
    
    try {
        const [students] = await db.query(studentQuery, [classId]);
        const [countResult] = await db.query(countQuery, [classId]);
        const total = countResult[0].total;

        return { students, total };
    } catch (err) {
        console.error('Error retrieving students in class:', err);
        throw err;
    }
};


const removeStudentFromClass = async (regNumber, classId) => {
    const query = `DELETE FROM studentclasses WHERE RegNumber = ? AND ClassID = ?`;
    const values = [regNumber, classId];
    
    try {
        const [result] = await db.query(query, values);
        return result.affectedRows;
    } catch (err) {
        console.error('Error removing student from class:', err);
        throw err;
    }
};

module.exports = {removeStudentFromClass, addStudentToClass, getStudentsInClass };
