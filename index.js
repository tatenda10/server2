const express = require('express');
const bodyParser = require('body-parser'); 
const cors = require('cors'); 
require('dotenv').config(); 

const app = express();

app.use(bodyParser.json());
app.use(cors()); 

const Auth_student =  require('./routes/students/Auth')
const Auth_employee =  require('./routes/employees/Auth')
const Teachers =  require('./routes/employees/Teachers')



const gradelevelclasses = require('./routes/classes/gradelevelclass');
const gradelevelclasses_students = require('./routes/classes/Classstudent_Gradelevel');
const Subjectlevelclasses = require('./routes/classes/Subjectlevelclass');
const subjectlevelclasses_students = require('./routes/classes/Classstudent_Subjectlevel');
const Payslips = require('./routes/employees/Payslips')

const results = require('./routes/results/Results'); 
const Gradelevelresults = require('./routes/results/Results'); 
const GetResults = require('./routes/results/Getresults'); 
const Getsubjectresults = require('./routes/results/Getsubjectresults'); 
const Studentdetails = require('./routes/students/Getstudent')
const Announcements = require ('./routes/employees/Announcements')
const Timetable = require('./routes/classes/Timetables')

const Attendance = require('./routes/students/Attendance')

const Employees = require('./routes/employees/Employees')
const payments = require('./routes/financials/Payments')
const Parents = require('./routes/Auth/Parent')
const updateteacher = require('./routes/results/Gradelevelresults')
const Analtyics = require('./routes/results/Analytics')


app.use('/creategradelevelclass', gradelevelclasses);
app.use('/getgradelevelclass', gradelevelclasses);
app.use('/editgradelevelclass', gradelevelclasses);
app.use('/addstudent', gradelevelclasses_students);
app.use('/Getstudentsgradelevel', gradelevelclasses_students);

app.use('/subjectlevelclass', Subjectlevelclasses);
app.use('/subjectlevel', subjectlevelclasses_students);


app.use('/',Auth_student)
app.use('/',Auth_employee)
app.use('/teachers',Teachers)


app.use('/payslips',Payslips)
app.use('/employee-announcements',Announcements)
app.use('/attendance',Attendance)

app.use('/addsubjectresult', results);
app.use('/addgradelevelresult', Gradelevelresults);
app.use('/getallresults', GetResults);
app.use('/getsubjectresults', Getsubjectresults);

app.use('/student',Studentdetails)

app.use('/timetable',Timetable)

app.use('/employees', Employees)

app.use('/payments',payments)
app.use('/parent',Parents)

app.use('/', updateteacher);
app.use('/', Analtyics);

const PORT =  7000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

 