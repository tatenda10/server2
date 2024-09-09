const express = require('express');
const router = express.Router();
const {
  
  getAllAnnouncements ,StudentAnnouncements
} = require('../../controllers/employees/Announcements');


router.get('/', getAllAnnouncements);
router.get('/students', StudentAnnouncements);

module.exports = router;
