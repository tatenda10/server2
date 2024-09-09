const express = require('express');
const router = express.Router();
const { getStudentsInSubjectClass, addStudentToSubjectClass, removeStudentFromSubjectClass } = require('../../controllers/classes/Classstudent_Subjectlevel');

// Route to add a student to a subject class
router.post('/', async (req, res) => {
   

    const { regNumber, classId } = req.body;
    
    try {
        const affectedRows = await addStudentToSubjectClass(regNumber, classId);
        res.status(201).json({ message: 'Student added to subject class successfully', affectedRows });
    } catch (err) {
        res.status(500).json({ error: 'Error adding student to subject class' });
    }
});


router.get('/:classId', async (req, res) => {
    const classId = req.params.classId;
    
    try {
        const { students, total } = await getStudentsInSubjectClass(classId);
        res.status(200).json({ students, total });
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Error retrieving students in class' });
    }
});
// Route to remove a student from a subject class
router.delete('/', async (req, res) => {
    const { RegNumber, classId } = req.body;
    console.log(req.body)
    try {
        const affectedRows = await removeStudentFromSubjectClass(RegNumber, classId);
        if (affectedRows === 0) {
            res.status(404).json({ error: 'Student or subject class not found' });
        } else {
            res.status(200).json({ message: 'Student removed from subject class successfully' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error removing student from subject class' });
    }
});

module.exports = router;
