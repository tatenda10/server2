const express = require('express');
const router = express.Router();
const { removeStudentFromClass ,addStudentToClass, getStudentsInClass } = require('../../controllers/classes/Classstudent_Gradelevel');

// Route to add a student to a class
router.post('/', async (req, res) => {
    const { regNumber, classId } = req.body;
    console.log(req.body)
    try {
        await addStudentToClass(regNumber, classId);
        res.status(200).json({ message: 'Student added to class successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error adding student to class' });
    }
});

// Route to get all students in a class
router.get('/:classId', async (req, res) => {
    const classId = req.params.classId;
    
    try {
        const { students, total } = await getStudentsInClass(classId);
        res.status(200).json({ students, total });
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving students in class' });
    }
});


router.delete('/', async (req, res) => {
    const { regNumber, classId } = req.body;
    console.log(req.body)
    try {
        const result = await removeStudentFromClass(regNumber, classId);
        res.status(200).json({ message: 'Student removed successfully', affectedRows: result });
    } catch (error) {
        res.status(500).json({ error: 'Error removing student from class' });
    }
});

module.exports = router;
