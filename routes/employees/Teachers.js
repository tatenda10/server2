// routes/teacherRoutes.js

const express = require('express');
const router = express.Router();
const { getTeacherClasses } = require('../../controllers/employees/Teachers');

router.get('/:employeeNumber', getTeacherClasses);

module.exports = router;
