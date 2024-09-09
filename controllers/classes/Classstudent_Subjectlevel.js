const db = require('../../db/db');

// Function to check if a student exists
const checkStudentExists = async (RegNumber) => {
    const query = `
        SELECT COUNT(*) as count
        FROM students
        WHERE RegNumber = ?
    `;
    const values = [RegNumber];
    
    try {
        const [result] = await db.query(query, values);
        return result[0].count > 0;
    } catch (err) {
        console.error('Error checking student existence:', err);
        throw err;
    }
};

// Function to add a student to a subject class
const addStudentToSubjectClass = async (RegNumber, classId) => {
    // Check if the student exists
    const studentExists = await checkStudentExists(RegNumber);
    if (!studentExists) {
        throw new Error('Student does not exist');
    }

    const query = `
        INSERT INTO studentclasses_subjects (RegNumber, ClassID)
        VALUES (?, ?)
    `;
    const values = [RegNumber, classId];
    
    try {
        const [result] = await db.query(query, values);
        return result.affectedRows;
    } catch (err) {
        console.error('Error adding student to subject class:', err);
        throw err;
    }
};

// Function to remove a student from a subject class
const removeStudentFromSubjectClass = async (RegNumber, classId) => {
    const query = `
        DELETE FROM studentclasses_subjects 
        WHERE RegNumber = ? AND ClassID = ?
    `;
    const values = [RegNumber, classId];
    
    try {
        const [result] = await db.query(query, values);
        return result.affectedRows;
    } catch (err) {
        console.error('Error removing student from subject class:', err);
        throw err;
    }
};

const getStudentsInSubjectClass = async (classId) => {
    const studentQuery = `
        SELECT s.RegNumber, s.Name, s.Surname, s.Gender 
        FROM students s
        JOIN studentclasses_subjects sc ON s.RegNumber = sc.RegNumber
        WHERE sc.ClassID = ?
    `;
    const countQuery = `
        SELECT COUNT(*) as total
        FROM studentclasses_subjects
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

module.exports = { getStudentsInSubjectClass, addStudentToSubjectClass, removeStudentFromSubjectClass };
