const Blog = require('../models/Blog');

// @desc    Get all blogs (Admin - includes drafts)
// @route   GET /api/blogs/admin
const getAdminBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find({}).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all blogs (public)
// @route   GET /api/blogs
const getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find({ isPublished: true }).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get blog by slug
// @route   GET /api/blogs/:slug
const getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug });
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create blog (Admin)
// @route   POST /api/blogs
const createBlog = async (req, res) => {
    try {
        const { title, content, image, tags } = req.body;
        const blog = await Blog.create({
            title,
            content,
            image,
            tags,
            author: req.user.name || 'Admin', // Provided by protect middleware
            isPublished: true
        });
        res.status(201).json(blog);
    } catch (error) {
        console.error('Error creating blog:', error);

        // Handle duplicate key error (E.g. duplicate slug/title)
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Blog title already exists. Please choose a unique title.' });
        }

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }

        res.status(500).json({ message: 'Server Error during blog creation', error: error.message });
    }
};

// @desc    Update blog (Admin)
// @route   PUT /api/blogs/:id
const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });

        const { title, content, image, tags, isPublished } = req.body;

        blog.title = title || blog.title;
        blog.content = content || blog.content;
        blog.image = image || blog.image;
        blog.tags = tags || blog.tags;
        if (isPublished !== undefined) blog.isPublished = isPublished;

        const updatedBlog = await blog.save();
        res.json(updatedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete blog (Admin)
// @route   DELETE /api/blogs/:id
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });

        await Blog.deleteOne({ _id: req.params.id });
        res.json({ message: 'Blog deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getAllBlogs,
    getAdminBlogs,
    getBlogBySlug,
    createBlog,
    updateBlog,
    deleteBlog
};
