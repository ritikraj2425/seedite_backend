const express = require('express');
const router = express.Router();
const {
    getAllBlogs,
    getAdminBlogs,
    getBlogBySlug,
    createBlog,
    updateBlog,
    deleteBlog
} = require('../controllers/blogController');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin routes (Must be before /:slug)
router.get('/admin', protect, admin, getAdminBlogs);

// Public routes
router.get('/', getAllBlogs);
router.get('/:slug', getBlogBySlug);
router.post('/', protect, admin, createBlog);
router.put('/:id', protect, admin, updateBlog);
router.delete('/:id', protect, admin, deleteBlog);

module.exports = router;
