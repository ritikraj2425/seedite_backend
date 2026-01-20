const express = require('express');
const router = express.Router();
const {
    getAllTestimonials,
    getAdminTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial
} = require('../controllers/testimonialController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllTestimonials);

// Admin routes
router.get('/admin', protect, admin, getAdminTestimonials);
router.post('/', protect, admin, createTestimonial);
router.put('/:id', protect, admin, updateTestimonial);
router.delete('/:id', protect, admin, deleteTestimonial);

module.exports = router;
