const express = require('express');
const router = express.Router();
const { markAttendance, updateAttendance, getAttendanceForStudent } = require('../../controllers/students/Attendance');


router.post('/', async (req, res) => {
    const { RegNumber, classId, date, term, year, status } = req.body;
    try {
        const result = await markAttendance(RegNumber, classId, date, term, year, status);
        res.status(200).json({ message: 'Attendance marked successfully', affectedRows: result });
    } catch (error) {
        res.status(500).json({ error: 'Error marking attendance' });
    }
});




router.put('/', async (req, res) => {
    const { RegNumber, classId, date, status } = req.body;
    try {
        const result = await updateAttendance(RegNumber, classId, date, status);
        res.status(200).json({ message: 'Attendance updated successfully', affectedRows: result });
    } catch (error) {
        res.status(500).json({ error: 'Error updating attendance' });
    }
});


router.get('/:regNumber/:term/:year', async (req, res) => {
    const { regNumber, term, year } = req.params;
    try {
        const attendance = await getAttendanceForStudent(regNumber, term, year);
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching attendance' });
    }
});

module.exports = router;
