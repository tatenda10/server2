const express = require('express');
const { loginStudent,changeStudentPassword  } = require('../../controllers/students/Auth');
const router = express.Router();

router.post('/student-auth', loginStudent);
router.post('/student-change-password', changeStudentPassword);

module.exports = router;
