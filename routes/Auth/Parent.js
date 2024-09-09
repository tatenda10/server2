const express = require('express');
const router = express.Router();
const { loginParent ,changeParentPassword} = require('../../controllers/Auth/Parent'); // Adjust path accordingly

router.post('/login', loginParent);
router.put('/change-password', changeParentPassword);

module.exports = router;
