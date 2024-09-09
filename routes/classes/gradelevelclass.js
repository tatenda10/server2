const express = require('express');
const router = express.Router();
const { 
    
    getSubjectsOfClass,
    getSingleGradeLevelClass ,
    getAllGradeLevelClasses
} = require('../../controllers/classes/Gradelevelclasses');





// Route to get a single grade level class by ID
router.get('/:classId', async (req, res) => {
    const { classId } = req.params;
    try {
        const classData = await getSingleGradeLevelClass(classId);
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json(classData);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving class' });
    }
});

// Route to get all grade level classes
router.get('/', async (req, res) => {
    try {
        const classes = await getAllGradeLevelClasses();
        res.json({ classes });
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving grade level classes' });
    }
});


router.get('/subjects/:classId', async (req, res) => {
    const { classId } = req.params;
    try {
        const subjects = await getSubjectsOfClass(classId);
        res.json(subjects);
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Error retrieving subjects for class' });
    }
});




module.exports = router;
