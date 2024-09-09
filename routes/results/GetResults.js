const express = require('express');
const router = express.Router();
const {  getResultsAndCalculatePositions } = require('../../controllers/results/Results');



router.post('/', async (req, res) => { 
    const { ClassID, TermID, Year ,form } = req.body;
    try {
        const results = await getResultsAndCalculatePositions(ClassID, TermID, Year,form);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving results and calculating positions' });
    }
});

module.exports = router;