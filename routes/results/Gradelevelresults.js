const express = require('express');
const router = express.Router();
const {  addGradeLevelResultAndCalculatePositions } = require('../../controllers/results/Results');
const { updateTeacherComment } = require('../../controllers/results/Results');

router.post('/', async (req, res) => {
    const gradeLevelResultData = req.body;

    try {
        const result = await addGradeLevelResultAndCalculatePositions(gradeLevelResultData);
        res.status(201).json({ message: 'Grade level result added and positions calculated successfully', result });
    } catch (err) {
        res.status(500).json({ error: 'Error adding grade level result and calculating positions' });
    }
});


router.post('/updateTeacherComment/:GradeLevelResultID', updateTeacherComment);


module.exports = router;