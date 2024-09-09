const express = require('express');
const router = express.Router();


const { getStudentDetailsWithGuardians } = require('../../controllers/students/Getstudent.js');



router.get('/:regNumber', async (req, res) => {
  const { regNumber } = req.params;
  try {
    const studentDetails = await getStudentDetailsWithGuardians(regNumber);
    res.json(studentDetails);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});

module.exports = router;

  