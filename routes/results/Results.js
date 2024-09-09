const express = require('express');
const router = express.Router();
const { addPaperMarksAndCalculateTotal, getAllResultsForSubjectClass,deleteSubjectResult , updateSubjectResult } = require('../../controllers/results/Results');

// Route to add paper marks and calculate total for a subject result

router.post('/', addPaperMarksAndCalculateTotal);
router.post('/subjectresults', async (req, res) => {
    const { ClassID, TermID, Year, form } = req.body;
  

    try {
        const results = await getAllResultsForSubjectClass(ClassID, TermID, Year, form);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error retrieving results and calculating positions:', err);
        res.status(500).json({ error: 'Error retrieving results and calculating positions' });
    }
});

// Route to update a subject result
router.post('/updatesubjectresult', async (req, res) => {
    try {
        await updateSubjectResult(req, res);
    } catch (err) {
        console.error('Error updating subject result:', err);
        res.status(500).json({ error: 'Error updating subject result' });
    }
});


router.delete('/:ResultID', async (req, res) => {
    try {
        await deleteSubjectResult(req, res);
    } catch (err) {
        console.error('Error deleting subject result:', err);
        res.status(500).json({ error: 'Error deleting subject result' });
    }
});


module.exports = router;
