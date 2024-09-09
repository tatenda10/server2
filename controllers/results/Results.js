const db = require('../../db/db'); // Adjust this to your actual db module path


const calculateGrade = (averageMark, form) => {
    console.log(averageMark)
    if (form >= 1 && form <= 4) { // O Level
        if (averageMark >= 70) return 'A';
        if (averageMark >= 60) return 'B';
        if (averageMark >= 50) return 'C';
        if (averageMark >= 45) return 'D';
        if (averageMark >= 40) return 'E';
        return 'U';
    } else if (form >= 5 && form <= 6) { // A Level
        if (averageMark >= 70) return 'A';
        if (averageMark >= 60) return 'B';
        if (averageMark >= 50) return 'C';
        if (averageMark >= 45) return 'D';
        if (averageMark >= 40) return 'E';
        if (averageMark >= 35) return 'O';
        return 'F';
    }
};
// Function to add paper marks and calculate the total for a subject result
const addPaperMarksAndCalculateTotal = async (req, res) => {
    const subjectResultData = req.body.subjectResultData;
    const paperMarks = req.body.paperMarks;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { StudentRegNumber, SubjectName, TermID, Year, ClassID, SubjectClassID, Comment, form } = subjectResultData;

        // Check if ClassID exists in gradelevelclasses table
        const checkClassIDQuery = `SELECT ClassID FROM gradelevelclasses WHERE ClassID = ?`;
        const [classIDExists] = await connection.query(checkClassIDQuery, [ClassID]);

        if (classIDExists.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `ClassID ${ClassID} does not exist in gradelevelclasses table.` });
        }

        // Check if the student already has a result for this combination of fields
        const checkExistingResultQuery = `
            SELECT ResultID FROM subjectresults 
            WHERE StudentRegNumber = ? AND TermID = ? AND Year = ? AND ClassID = ? AND SubjectClassID = ?
        `;
        const [existingResult] = await connection.query(checkExistingResultQuery, [StudentRegNumber, TermID, Year, ClassID, SubjectClassID]);

        if (existingResult.length > 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Student already has a result. Consider editing instead.' });
        }

        // If no existing result, insert the new subject result
        const subjectResultQuery = `
            INSERT INTO subjectresults (StudentRegNumber, SubjectName, TermID, Year, ClassID, SubjectClassID, Comment) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const subjectResultValues = [StudentRegNumber, SubjectName, TermID, Year, ClassID, SubjectClassID, Comment];
        const [subjectResult] = await connection.query(subjectResultQuery, subjectResultValues);
        const ResultID = subjectResult.insertId;

        // Insert paper marks and calculate the total
        let totalMark = 0;
        for (const paper of paperMarks) {
            const { PaperName, Mark } = paper;
            totalMark += Number(Mark);

            const paperMarkQuery = `
                INSERT INTO papermarks (ResultID, PaperName, Mark) 
                VALUES (?, ?, ?)
            `;
            const paperMarkValues = [ResultID, PaperName, Number(Mark)];
            await connection.query(paperMarkQuery, paperMarkValues);
        }

        // Update the subject result with the total mark
        const updateTotalMarkQuery = `
            UPDATE subjectresults 
            SET TotalMark = ? 
            WHERE ResultID = ?
        `;
        await connection.query(updateTotalMarkQuery, [totalMark, ResultID]);

        // Check if grade level result already exists
        const checkGradeLevelResultQuery = `
            SELECT TotalMark FROM gradelevelresults 
            WHERE ClassID = ? AND TermID = ? AND Year = ? AND RegNumber = ? AND form = ?
        `;
        const [existingGradeLevelResult] = await connection.query(checkGradeLevelResultQuery, [ClassID, TermID, Year, StudentRegNumber, form]);

        if (existingGradeLevelResult.length > 0) {
            const newTotalMark = Number(existingGradeLevelResult[0].TotalMark) + totalMark;
            const updateGradeLevelResultQuery = `
                UPDATE gradelevelresults 
                SET TotalMark = ? 
                WHERE ClassID = ? AND TermID = ? AND Year = ? AND RegNumber = ? AND form = ?
            `;
            await connection.query(updateGradeLevelResultQuery, [newTotalMark, ClassID, TermID, Year, StudentRegNumber, form]);
        } else {
            const insertGradeLevelResultQuery = `
                INSERT INTO gradelevelresults (ClassID, TermID, Year, TotalMark, RegNumber, form)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await connection.query(insertGradeLevelResultQuery, [ClassID, TermID, Year, totalMark, StudentRegNumber, form]);
        }

        await connection.commit();
        return res.status(201).json({ success: true, ResultID, totalMark });
    } catch (err) {
        await connection.rollback();
        console.error('Error adding subject result and calculating total: ', err.message);
        return res.status(500).json({ success: false, message: 'Error processing request. Please try again later.' });
    } finally {
        connection.release();
    }
};










const getAllResultsForSubjectClass = async (subjectClassID, termID, year, form) => {
    try {
        const query = `
        SELECT DISTINCT sr.ResultID, sr.StudentRegNumber, s.Name, s.Surname, sr.SubjectName, sr.TotalMark, sr.Comment, glr.ClassPosition, glr.FormPosition
        FROM subjectresults sr
        JOIN students s ON sr.StudentRegNumber = s.RegNumber
        JOIN gradelevelresults glr ON sr.StudentRegNumber = glr.RegNumber AND sr.ClassID = glr.ClassID AND sr.TermID = glr.TermID AND sr.Year = glr.Year
        WHERE sr.SubjectClassID = ? AND sr.TermID = ? AND sr.Year = ?
        ORDER BY glr.ClassPosition
    `;

        const [results] = await db.query(query, [subjectClassID, termID, year]);

        // Fetch paper marks for each result and calculate the grades
        for (const result of results) {
            const paperMarksQuery = `
                SELECT PaperName, Mark
                FROM papermarks
                WHERE ResultID = ?
            `;
            const [paperMarks] = await db.query(paperMarksQuery, [result.ResultID]);

            // Calculate average mark and grade
            const totalMarks = paperMarks.reduce((sum, paper) => sum + paper.Mark, 0);
            const averageMark = paperMarks.length > 0 ? totalMarks / paperMarks.length : 0;
            result.AverageMark = averageMark;
            result.Grade = calculateGrade(averageMark, form);
            result.PaperMarks = paperMarks;
        }
        console.log(form)
        return results;
    } catch (err) {
        console.error('Error retrieving results for subject class: ', err);
        throw err;
    }
};







// Function to retrieve results and calculate positions
const getResultsAndCalculatePositions = async (ClassID, TermID, Year, form) => {
    try {
        // Retrieve all grade level results for the given class, term, year, and form along with student names
        const gradeLevelResultsQuery = `
            SELECT glr.*, s.Name, s.Surname
            FROM gradelevelresults glr
            JOIN students s ON glr.RegNumber = s.RegNumber
            WHERE glr.ClassID = ? AND glr.TermID = ? AND glr.Year = ? AND glr.form = ?
            ORDER BY glr.TotalMark DESC
        `;
        const [gradeLevelResults] = await db.query(gradeLevelResultsQuery, [ClassID, TermID, Year, form]);

        // Calculate class positions, handling ties
        gradeLevelResults.forEach((result, index, arr) => {
            if (index > 0 && arr[index - 1].TotalMark === result.TotalMark) {
                result.ClassPosition = arr[index - 1].ClassPosition;
            } else {
                result.ClassPosition = index + 1;
            }
        });

        // Retrieve all grade level results for the form, term, and year along with student names
        const formResultsQuery = `
            SELECT glr.*, s.Name, s.Surname
            FROM gradelevelresults glr
            JOIN students s ON glr.RegNumber = s.RegNumber
            WHERE glr.TermID = ? AND glr.Year = ? AND glr.form = ?
            ORDER BY glr.TotalMark DESC
        `;
        const [formResults] = await db.query(formResultsQuery, [TermID, Year, form]);

        // Calculate form positions, handling ties
        formResults.forEach((result, index, arr) => {
            if (index > 0 && arr[index - 1].TotalMark === result.TotalMark) {
                result.FormPosition = arr[index - 1].FormPosition;
            } else {
                result.FormPosition = index + 1;
            }

            // Update the form position in the original gradeLevelResults array
            const gradeResult = gradeLevelResults.find(r => r.RegNumber === result.RegNumber);
            if (gradeResult) {
                gradeResult.FormPosition = result.FormPosition;
            }
        });

        return gradeLevelResults;
    } catch (err) {
        console.error('Error retrieving results and calculating positions: ', err);
        throw err;
    }
};




const getAllSubjectResultsForStudent = async (studentRegNumber, termID, year, classID, form) => {
    try {
        const subjectResultsQuery = `
            SELECT sr.*, pm.PaperName, pm.Mark
            FROM subjectresults sr
            LEFT JOIN papermarks pm ON sr.ResultID = pm.ResultID
            WHERE sr.StudentRegNumber = ? AND sr.TermID = ? AND sr.Year = ?
        `;
        const [subjectResults] = await db.query(subjectResultsQuery, [studentRegNumber, termID, year]);

        // Organize the results to group paper marks under each subject result
        const organizedSubjectResults = subjectResults.reduce((acc, row) => {
            const { ResultID, StudentRegNumber, SubjectName, TermID, Year, ClassID, SubjectClassID, Comment, TotalMark, PaperName, Mark } = row;
            if (!acc[ResultID]) {
                acc[ResultID] = {
                    ResultID,
                    StudentRegNumber,
                    SubjectName,
                    TermID,
                    Year,
                    ClassID,
                    SubjectClassID,
                    Comment,
                    TotalMark,
                    PaperMarks: [],
                    AverageMark: 0,
                    Grade: '', // Grade will be calculated later
                };
            }
            if (PaperName && Mark !== null) {
                acc[ResultID].PaperMarks.push({ PaperName, Mark });
            }
            return acc;
        }, {});

        // Calculate the average mark and grade for each subject
        Object.values(organizedSubjectResults).forEach(subjectResult => {
            const totalMarks = subjectResult.PaperMarks.reduce((sum, paper) => sum + paper.Mark, 0);
            const averageMark = subjectResult.PaperMarks.length > 0 ? totalMarks / subjectResult.PaperMarks.length : 0;
            subjectResult.AverageMark = averageMark;
            subjectResult.Grade = calculateGrade(averageMark, form);
        });

        // Calculate positions
        const gradeLevelResultsQuery = `
            SELECT * FROM gradelevelresults 
            WHERE ClassID = ? AND TermID = ? AND Year = ?
            ORDER BY TotalMark DESC
        `;
        const [gradeLevelResults] = await db.query(gradeLevelResultsQuery, [classID, termID, year]);

        // Calculate class positions
        let classPosition = 0;
        gradeLevelResults.forEach((result, index) => {
            if (result.RegNumber === studentRegNumber) {
                classPosition = index + 1;
            }
        });

        // Calculate form positions
        const formResultsQuery = `
            SELECT * FROM gradelevelresults 
            WHERE TermID = ? AND Year = ?
            ORDER BY TotalMark DESC
        `;
        const [formResults] = await db.query(formResultsQuery, [termID, year]);

        let formPosition = 0;
        formResults.forEach((result, index) => {
            if (result.RegNumber === studentRegNumber) {
                formPosition = index + 1;
            }
        });

        // Assuming there's only one record per student per term and year in gradelevelresults
        return {
            subjectResults: Object.values(organizedSubjectResults),
            classPosition,
            formPosition
        };
    } catch (err) {
        console.error('Error retrieving subject results for student: ', err);
        throw err;
    }
};

const getAllSubjectResultsForStudentStudent = async (studentRegNumber, termID, year, classID, form) => {
    try {
        const subjectResultsQuery = `
            SELECT sr.*, pm.PaperName, pm.Mark
            FROM subjectresults sr
            LEFT JOIN papermarks pm ON sr.ResultID = pm.ResultID
            WHERE sr.StudentRegNumber = ? AND sr.TermID = ? AND sr.Year = ?
        `;
        const [subjectResults] = await db.query(subjectResultsQuery, [studentRegNumber, termID, year]);

        // Organize the results to group paper marks under each subject result
        const organizedSubjectResults = subjectResults.reduce((acc, row) => {
            const { ResultID, StudentRegNumber, SubjectName, TermID, Year, ClassID, SubjectClassID, Comment, TotalMark, PaperName, Mark } = row;
            if (!acc[ResultID]) {
                acc[ResultID] = {
                    ResultID,
                    StudentRegNumber,
                    SubjectName,
                    TermID,
                    Year,
                    ClassID,
                    SubjectClassID,
                    Comment,
                    TotalMark,
                    PaperMarks: [],
                    AverageMark: 0,
                    Grade: '', // Grade will be calculated later
                };
            }
            if (PaperName && Mark !== null) {
                acc[ResultID].PaperMarks.push({ PaperName, Mark });
            }
            return acc;
        }, {});

        // Calculate the average mark and grade for each subject
        Object.values(organizedSubjectResults).forEach(subjectResult => {
            const totalMarks = subjectResult.PaperMarks.reduce((sum, paper) => sum + paper.Mark, 0);
            const averageMark = subjectResult.PaperMarks.length > 0 ? totalMarks / subjectResult.PaperMarks.length : 0;
            subjectResult.AverageMark = averageMark;
            subjectResult.Grade = calculateGrade(averageMark, form);
        });

        // Calculate positions, ensuring results are published
        const gradeLevelResultsQuery = `
            SELECT * FROM gradelevelresults 
            WHERE ClassID = ? AND TermID = ? AND Year = ? AND Published = 1
            ORDER BY TotalMark DESC
        `;
        const [gradeLevelResults] = await db.query(gradeLevelResultsQuery, [classID, termID, year]);

        // Calculate class positions
        let classPosition = 0;
        gradeLevelResults.forEach((result, index) => {
            if (result.RegNumber === studentRegNumber) {
                classPosition = index + 1;
            }
        });

        // Calculate form positions, ensuring results are published
        const formResultsQuery = `
            SELECT * FROM gradelevelresults 
            WHERE TermID = ? AND Year = ? AND Published = 1
            ORDER BY TotalMark DESC
        `;
        const [formResults] = await db.query(formResultsQuery, [termID, year]);

        let formPosition = 0;
        formResults.forEach((result, index) => {
            if (result.RegNumber === studentRegNumber) {
                formPosition = index + 1;
            }
        });

        // Assuming there's only one record per student per term and year in gradelevelresults
        return {
            subjectResults: Object.values(organizedSubjectResults),
            classPosition,
            formPosition
        };
    } catch (err) {
        console.error('Error retrieving subject results for student: ', err);
        throw err;
    }
};



const updateSubjectResult = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { ResultID, PaperMarks, Comment } = req.body;

        await connection.beginTransaction();

        // Step 1: Fetch the current total mark for the subject result before any updates
        const fetchCurrentTotalMarkQuery = `
            SELECT TotalMark, StudentRegNumber, ClassID, TermID, Year 
            FROM subjectresults 
            WHERE ResultID = ?
        `;
        const [currentResult] = await connection.query(fetchCurrentTotalMarkQuery, [ResultID]);

        if (currentResult.length === 0) {
            throw new Error('Subject result not found.');
        }

        const { TotalMark: currentTotalMark, StudentRegNumber, ClassID, TermID, Year } = currentResult[0];

        // Step 2: Subtract the current total mark from the grade level result
        const subtractFromGradeLevelQuery = `
            UPDATE gradelevelresults 
            SET TotalMark = TotalMark - ? 
            WHERE RegNumber = ? AND ClassID = ? AND TermID = ? AND Year = ?
        `;
        await connection.query(subtractFromGradeLevelQuery, [
            parseInt(currentTotalMark, 10),
            StudentRegNumber,
            parseInt(ClassID, 10),
            parseInt(TermID, 10),
            parseInt(Year, 10)
        ]);

        // Step 3: Delete all existing paper marks for this ResultID
        const deletePaperMarksQuery = `
            DELETE FROM papermarks 
            WHERE ResultID = ?
        `;
        await connection.query(deletePaperMarksQuery, [ResultID]);

        // Step 4: Insert the updated paper marks and calculate the new total mark
        let newTotalMark = 0;
        for (const paper of PaperMarks) {
            const { PaperName, Mark } = paper;
            const markInt = parseInt(Mark, 10);
            newTotalMark += markInt;

            const insertPaperMarkQuery = `
                INSERT INTO papermarks (ResultID, PaperName, Mark) 
                VALUES (?, ?, ?)
            `;
            await connection.query(insertPaperMarkQuery, [ResultID, PaperName, markInt]);
        }

        // Step 5: Update the subject result with the new total mark
        const updateSubjectResultQuery = `
            UPDATE subjectresults 
            SET TotalMark = ?, Comment = ? 
            WHERE ResultID = ?
        `;
        await connection.query(updateSubjectResultQuery, [newTotalMark, Comment, ResultID]);

        // Step 6: Add the new total mark to the grade level result
        const addToGradeLevelQuery = `
            UPDATE gradelevelresults 
            SET TotalMark = TotalMark + ? 
            WHERE RegNumber = ? AND ClassID = ? AND TermID = ? AND Year = ?
        `;
        await connection.query(addToGradeLevelQuery, [
            newTotalMark,
            StudentRegNumber,
            parseInt(ClassID, 10),
            parseInt(TermID, 10),
            parseInt(Year, 10)
        ]);

        await connection.commit();

        res.status(200).json({ message: 'Subject result and grade level result updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.log('Error updating subject and grade level result: ', err);
        res.status(500).json({ message: 'Error updating subject and grade level result', error: err });
    } finally {
        connection.release();
    }
};




const deleteSubjectResult = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { ResultID } = req.params;

        await connection.beginTransaction();

        // Delete the paper marks associated with the result
        const deletePaperMarksQuery = `
            DELETE FROM papermarks 
            WHERE ResultID = ?
        `;
        await connection.query(deletePaperMarksQuery, [ResultID]);

        // Delete the subject result
        const deleteSubjectResultQuery = `
            DELETE FROM subjectresults 
            WHERE ResultID = ?
        `;
        await connection.query(deleteSubjectResultQuery, [ResultID]);

        await connection.commit();

        res.status(200).json({ message: 'Subject result deleted successfully' });
    } catch (err) {
        await connection.rollback();
        console.log('Error deleting subject result: ', err);
        res.status(500).json({ message: 'Error deleting subject result', error: err });
    } finally {
        connection.release();
    }
};

const updateTeacherComment = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { GradeLevelResultID } = req.params; // Assuming the GradeLevelResultID is passed as a URL parameter
        const { TeacherComment } = req.body; // Assuming the TeacherComment is passed in the request body

        await connection.beginTransaction();

        // Update the TeacherComment in the gradelevelresults table
        const updateCommentQuery = `
            UPDATE gradelevelresults
            SET TeacherComment = ?
            WHERE GradeLevelResultID = ?
        `;
        await connection.query(updateCommentQuery, [TeacherComment, GradeLevelResultID]);

        await connection.commit();

        res.status(200).json({ message: 'Teacher comment updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.log('Error updating teacher comment: ', err);
        res.status(500).json({ message: 'Error updating teacher comment', error: err });
    } finally {
        connection.release();
    }
};

const getStudentPerformanceSummary = async (studentRegNumber, termID, year, form) => {
    try {
        // Step 1: Fetch all subjects and paper marks for the student
        const subjectResultsQuery = `
            SELECT sr.SubjectName, pm.PaperName, pm.Mark
            FROM subjectresults sr
            LEFT JOIN papermarks pm ON sr.ResultID = pm.ResultID
            WHERE sr.StudentRegNumber = ? AND sr.TermID = ? AND sr.Year = ?
        `;
        const [subjectResults] = await db.query(subjectResultsQuery, [studentRegNumber, termID, year]);

        // Step 2: Group paper marks by subject and calculate student’s total and average mark per subject
        let totalSubjects = 0;
        let totalMarks = 0;
        const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0, O: 0, F: 0 };
        const subjectsMap = new Map(); // To group paper marks by subject

        subjectResults.forEach(row => {
            const { SubjectName, PaperName, Mark } = row;
            if (!subjectsMap.has(SubjectName)) {
                subjectsMap.set(SubjectName, {
                    papers: [],
                    totalMarks: 0,
                    paperCount: 0
                });
            }
            const subject = subjectsMap.get(SubjectName);
            subject.papers.push({ PaperName, Mark });
            subject.totalMarks += parseFloat(Mark); // Add paper mark to total for the subject
            subject.paperCount += 1; // Count the number of papers for this subject
        });

        // Step 3: Process each subject and fetch class statistics
        const organizedSubjectResults = await Promise.all([...subjectsMap.keys()].map(async (subjectName) => {
            const subjectData = subjectsMap.get(subjectName);
            const studentAverageMark = subjectData.totalMarks / subjectData.paperCount; // Average mark for this subject

            // Fetch class statistics for this subject (class average, highest, lowest)
            const classStatsQuery = `
                SELECT 
                    AVG(totalMarks) AS classAverage, 
                    MAX(totalMarks) AS classHighest, 
                    MIN(totalMarks) AS classLowest
                FROM (
                    SELECT sr.StudentRegNumber, SUM(pm.Mark) / COUNT(pm.Mark) AS totalMarks
                    FROM subjectresults sr
                    LEFT JOIN papermarks pm ON sr.ResultID = pm.ResultID
                    WHERE sr.SubjectClassID = (
                        SELECT sr2.SubjectClassID 
                        FROM subjectresults sr2 
                        WHERE sr2.StudentRegNumber = ? 
                        AND sr2.SubjectName = ?
                        AND sr2.TermID = ? 
                        AND sr2.Year = ?
                        LIMIT 1
                    )
                    AND sr.TermID = ? AND sr.Year = ?
                    GROUP BY sr.StudentRegNumber
                ) AS classMarks
            `;
            const [classStats] = await db.query(classStatsQuery, [studentRegNumber, subjectName, termID, year, termID, year]);

            // Step 4: Calculate the grade for the whole subject
            const grade = calculateGrade(studentAverageMark, form);
            gradeDistribution[grade] += 1; // Update grade distribution

            totalSubjects += 1;
            totalMarks += studentAverageMark; // Add the subject's average to total

            // Return organized subject result with class statistics
            return {
                SubjectName: subjectName,
                StudentAverageMark: studentAverageMark.toFixed(2), // Round to 2 decimal places
                ClassAverage: parseFloat(classStats[0].classAverage).toFixed(2), // Class average rounded to 2 decimal places
                ClassHighest: parseFloat(classStats[0].classHighest).toFixed(2), // Class highest rounded to 2 decimal places
                ClassLowest: parseFloat(classStats[0].classLowest).toFixed(2), // Class lowest rounded to 2 decimal places
                PaperMarks: subjectData.papers, // All papers and their marks for this subject
                Grade: grade,
            };
        }));

        // Step 5: Calculate the average mark for the student across all subjects
        const averageMark = totalSubjects > 0 ? (totalMarks / totalSubjects).toFixed(2) : 0;

        return {
            totalSubjects,
            totalMarks: totalMarks.toFixed(2), // Total marks rounded to 2 decimal places
            averageMark,
            gradeDistribution,
            subjectResults: organizedSubjectResults,
        };
    } catch (err) {
        console.error('Error retrieving student performance summary: ', err);
        throw err;
    }
};






const compareClassAndFormPositions = async (studentRegNumber, termID, year, classID, form) => {
    try {
        // Fetch the student's grade level result including class and form positions
        const gradeLevelResultsQuery = `
            SELECT ClassPosition, FormPosition, TotalMark 
            FROM gradelevelresults 
            WHERE RegNumber = ? AND TermID = ? AND Year = ? AND ClassID = ? AND form = ?
        `;
        const [results] = await db.query(gradeLevelResultsQuery, [studentRegNumber, termID, year, classID, form]);

        if (results.length === 0) {
            return { success: false, message: 'No results found for this student in the specified term/year' };
        }

        const classPosition = results[0].ClassPosition;
        const formPosition = results[0].FormPosition;
        const totalMark = results[0].TotalMark;

        return { 
            classPosition, 
            formPosition, 
            totalMark, 
            message: `Student ${studentRegNumber} is positioned ${classPosition} in the class and ${formPosition} in the form.` 
        };
    } catch (err) {
        console.error('Error comparing class and form positions: ', err);
        throw err;
    }
};

module.exports = {
    addPaperMarksAndCalculateTotal,
    getResultsAndCalculatePositions,
    getAllSubjectResultsForStudent,
    getAllResultsForSubjectClass,
    updateSubjectResult,
    deleteSubjectResult,
    updateTeacherComment,
    getAllSubjectResultsForStudentStudent,
    getStudentPerformanceSummary,
    compareClassAndFormPositions
};
