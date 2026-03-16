const express = require('express');
const router = express.Router();
const { getMockTestById, submitMockTest, getAllIQTests, getMockTestLeaderboard } = require('../controllers/mockTestController');
const { protect } = require('../middleware/authMiddleware');

router.get('/iq-tests', getAllIQTests);
router.get('/:id', protect, getMockTestById);
router.post('/:id/submit', protect, submitMockTest);
router.get('/:id/leaderboard', protect, getMockTestLeaderboard);

module.exports = router;
