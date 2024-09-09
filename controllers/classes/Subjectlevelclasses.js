const db = require('../../db/db');




const getSingleSubjectLevelClass = async (classId) => {
    const query = `SELECT * FROM subjectclasses WHERE ClassID = ?`;

    try {
        const [classData] = await db.query(query, [classId]);
        return classData[0]; 
    } catch (err) {
        console.error('Error retrieving class:', err);
        throw err;
    }
};



module.exports = { getSingleSubjectLevelClass };
