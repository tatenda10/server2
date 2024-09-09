// src/controllers/students/students.js
const db = require('../../db/db'); // Ensure correct path to db

const getStudentDetailsWithGuardians = async (regNumber) => {
  const studentQuery = `
    SELECT 
      RegNumber,
      Name,
      Surname,
      DateOfBirth,
      NationalIDNumber,
      Address,
      Gender,
      HasMedicalAid
    FROM students
    WHERE RegNumber = ?
  `;
  const guardiansQuery = `
    SELECT 
      Name,
      Surname,
      DateOfBirth,
      NationalIDNumber,
      Address,
      PhoneNumber,
      Gender
    FROM guardians
    WHERE StudentRegNumber = ?
  `;

  const [studentResult] = await db.query(studentQuery, [regNumber]);
  const [guardiansResult] = await db.query(guardiansQuery, [regNumber]);

  if (studentResult.length === 0) {
    throw new Error('Student not found');
  }

  return {
    student: studentResult[0],
    guardians: guardiansResult
  };
};

module.exports = {
  
  getStudentDetailsWithGuardians
};
