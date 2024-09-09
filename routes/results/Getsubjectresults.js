const express = require('express');
const router = express.Router();
const { getAllSubjectResultsForStudent,getAllSubjectResultsForStudentStudent } = require('../../controllers/results/Results');


router.post('/', async (req, res) => {
    const {studentRegNumber, termID, year, classID ,form } = req.body;

    if (!termID || !year || !classID) {
        return res.status(400).send('TermID, Year, and ClassID are required');
    }

    try {
        const result = await getAllSubjectResultsForStudent(studentRegNumber, termID, year, classID,form);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching results' });
    }
});

router.post('/student', async (req, res) => {
    const {studentRegNumber, termID, year, classID ,form } = req.body;

    if (!termID || !year || !classID) {
        return res.status(400).send('TermID, Year, and ClassID are required');
    }

    try {
        const result = await getAllSubjectResultsForStudentStudent(studentRegNumber, termID, year, classID,form);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching results' });
    }
});


module.exports = router;
