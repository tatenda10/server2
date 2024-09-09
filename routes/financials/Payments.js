const express = require('express');
const router = express.Router();

const { createPaynowZIGPayment } = require('../../controllers/financials/ZIGpaymentcontroller');
const { createPaynowUSDPayment } = require('../../controllers/financials/USDpaymentcontroller');



const { searchStudentRecords,
    getStudentRecord } = require('../../controllers/financials/StudentRecords');



// Route for Paynow ZIG Payment
router.post('/paynow-zig', createPaynowZIGPayment);

// Route for Paynow USD Payment
router.post('/paynow-usd', createPaynowUSDPayment);




router.get('/student/:reg_number', getStudentRecord);

// Search transactions for a specific student
router.get('/student/:reg_number/search-transactions', searchStudentRecords);

module.exports = router;
