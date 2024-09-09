const db = require('../../db/db');

const getSubjectsOfClass = async (classId) => {
    const query = `
        SELECT * 
        FROM subjectclasses 
        WHERE gradelevelclass = ?
    `;
    
    try {
        const [subjects] = await db.query(query, [classId]);
        return subjects;
    } catch (err) {
        console.error('Error retrieving subjects for class:', err);
        throw err;
    }
};


const getSingleGradeLevelClass = async (classId) => {
    const query = `SELECT * FROM gradelevelclasses WHERE ClassID = ?`;

    try {
        const [classData] = await db.query(query, [classId]);
        return classData[0]; // Assuming classId is unique and will return a single class
    } catch (err) {
        console.error('Error retrieving class:', err);
        throw err;
    }
};


const getAllGradeLevelClasses = async () => {
    const query = `SELECT * FROM gradelevelclasses`;

    try {
        const [results] = await db.query(query);
        return results;
    } catch (err) {
        console.error('Error retrieving grade level classes:', err);
        throw err;
    }
};

module.exports = {
    getSubjectsOfClass,
    getSingleGradeLevelClass,
    getAllGradeLevelClasses
};
