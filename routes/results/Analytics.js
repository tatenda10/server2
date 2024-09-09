const express = require('express');
const router = express.Router();
const {
    getStudentPerformanceSummary,
    compareClassAndFormPositions,
} = require('../../controllers/results/Results');  // Ensure the paths are correct

// Route for Student Performance Summary
router.get('/student/performance-summary/:studentRegNumber/:termID/:year/:form', async (req, res) => {
    const { studentRegNumber, termID, year, form } = req.params;

    try {
        const performanceSummary = await getStudentPerformanceSummary(studentRegNumber, parseInt(termID), parseInt(year), parseInt(form));
        return res.status(200).json({
            success: true,
            data: performanceSummary,
        });
    } catch (err) {
        console.error('Error fetching performance summary:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching student performance summary',
        });
    }
});

// Route for Comparing Class and Form Positions
router.get('/student/compare-positions/:studentRegNumber/:termID/:year/:classID/:form', async (req, res) => {
    const { studentRegNumber, termID, year, classID, form } = req.params;

    try {
        const positionComparison = await compareClassAndFormPositions(studentRegNumber, parseInt(termID), parseInt(year), parseInt(classID), parseInt(form));
        return res.status(200).json({
            success: true,
            data: positionComparison,
        });
    } catch (err) {
        console.error('Error comparing positions:', err);
        return res.status(500).json({
            success: false,
            message: 'Error comparing class and form positions',
        });
    }
});

module.exports = router;
