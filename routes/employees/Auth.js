const express = require('express');
const { loginEmployee , loginEmployee2,changeEmployeePassword } = require('../../controllers/employees/Auth');
const router = express.Router();

router.post('/employee-auth', loginEmployee);
router.post('/employee2-auth', loginEmployee2);
router.post('/employee-change-password', changeEmployeePassword);

module.exports = router;
