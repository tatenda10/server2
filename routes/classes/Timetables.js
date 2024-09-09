const express = require('express');
const { addTimetable, getTimetable } = require('../../controllers/classes/Timetables');
const router = express.Router();

// Route to add a timetable
router.post('/', addTimetable);

// Route to get a timetable for a class
router.get('/:classID', getTimetable);

module.exports = router;
