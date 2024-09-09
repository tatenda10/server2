// src/routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const { getTeachers , getEmployeeById, searchEmployees } = require('../../controllers/employees/Employees');






router.get('/:EmployeeNumber', async (req, res) => {
  try {
    const employee = await getEmployeeById(req.params.EmployeeNumber);
    if (!employee) {
      return res.status(404).send({ message: 'Employee not found' });
    }
    res.status(200).send(employee);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching employee', error });
  }
});

router.get('/searchemployees', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const employees = await searchEmployees(searchQuery);
    res.status(200).send(employees);
  } catch (error) {
    res.status(500).send({ message: 'Error searching employees', error });
  }
});




module.exports = router;
