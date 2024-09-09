const express = require('express');
const router = express.Router();
const { getPayslipsForEmployee } = require('../../controllers/employees/Payslips');

// Define routes
router.get('/:employeeNumber', getPayslipsForEmployee);


module.exports = router;
