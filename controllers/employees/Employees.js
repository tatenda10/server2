// controllers/employees/employeeController.js
const db = require('../../db/db'); // Ensure this imports the correct version






const getEmployeeById = async (EmployeeNumber) => {
    try {
        const query = `SELECT * FROM employees WHERE EmployeeNumber = ?`;
        const [rows] = await db.query(query, [EmployeeNumber]);
        return rows[0];
    } catch (err) {
        console.error('Error fetching employee:', err);
        throw err;
    }
};

const searchEmployees = async (searchQuery) => {
    try {
        const query = `
            SELECT * FROM employees 
            WHERE EmployeeNumber LIKE ? OR Name LIKE ? OR Surname LIKE ?
        `;
        const likeQuery = `%${searchQuery}%`;
        const [rows] = await db.query(query, [likeQuery, likeQuery, likeQuery]);
        return rows;
    } catch (err) {
        console.error('Error searching employees:', err);
        throw err;
    }
};



const getTeachers = async (req, res) => {
    try {
      const [teachers] = await db.query("SELECT EmployeeNumber, name ,surname FROM employees WHERE role = 'Teacher'");
      res.json(teachers);
    } catch (error) {
      res.status(500).send('Error fetching teachers');
    }
};

module.exports = { getTeachers , getEmployeeById, searchEmployees };
