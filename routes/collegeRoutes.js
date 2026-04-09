const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getCollegePortal, getMyColleges } = require('../controllers/collegePortalController');

// Student: list all my college memberships
router.get('/my-colleges', protect, getMyColleges);

// Student: access a specific college portal by slug
router.get('/:slug', protect, getCollegePortal);

module.exports = router;
