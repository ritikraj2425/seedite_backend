const express = require('express');
const router = express.Router();
const { getMockTestById, submitMockTest } = require('../controllers/mockTestController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:id', protect, getMockTestById);
router.post('/:id/submit', protect, submitMockTest);

module.exports = router;
