const express = require('express');
const router = express.Router();
const { getSingleSubjectLevelClass } = require('../../controllers/classes/Subjectlevelclasses');



router.get('/:classId', async (req, res) => {
    const { classId } = req.params;
    try {
        const classData = await getSingleSubjectLevelClass(classId);
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json(classData);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving class' });
    }
});

module.exports = router;
