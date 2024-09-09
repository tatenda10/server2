const db = require('../../db/db'); // Ensure correct path to db

const getTeacherClasses = async (req, res) => {
    const { employeeNumber } = req.params;

    try {
        // Query the teacher by employee number
        const [teacherRows] = await db.execute('SELECT Surname, Name, EmployeeNumber FROM employees WHERE EmployeeNumber = ?', [employeeNumber]);
        if (teacherRows.length === 0) {
            return res.status(404).json({ message: 'Teacher not found.' });
        }

        const teacher = teacherRows[0];
        const teacherID = teacher.EmployeeNumber;

        // Query classes from both gradelevelclasses and subjectlevelclasses
        const [gradeLevelClasses] = await db.execute(
            'SELECT ClassID, ClassName,Form , "Form Level" AS ClassType FROM gradelevelclasses WHERE TEACHER = ?', [teacherID]
        );

        const [subjectLevelClasses] = await db.execute(
            'SELECT ClassID, ClassName,Form, "Subject Level" AS ClassType FROM subjectclasses WHERE Teacher = ?', [teacherID]
        );

        // Combine the results
        const classes = [...gradeLevelClasses, ...subjectLevelClasses];

        // Prepare the response data
        const responseData = {
            teacherName: teacher.Name,
            employeeNumber: teacher.EmployeeNumber,
            classes
        };

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { getTeacherClasses };
