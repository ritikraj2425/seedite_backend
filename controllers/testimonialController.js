const Testimonial = require('../models/Testimonial');

// @desc    Get all testimonials (Admin - includes hidden)
// @route   GET /api/testimonials/admin
const getAdminTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find({}).sort({ createdAt: -1 });
        res.json(testimonials);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all testimonials (public)
// @route   GET /api/testimonials
const getAllTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find({ isVisible: true }).sort({ createdAt: -1 });
        res.json(testimonials);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create testimonial (Admin)
// @route   POST /api/testimonials
const createTestimonial = async (req, res) => {
    try {
        const { name, role, content, rating, image } = req.body;
        const testimonial = await Testimonial.create({
            name,
            role,
            content,
            rating,
            image
        });
        res.status(201).json(testimonial);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update testimonial (Admin)
// @route   PUT /api/testimonials/:id
const updateTestimonial = async (req, res) => {
    try {
        const testimonial = await Testimonial.findById(req.params.id);
        if (!testimonial) return res.status(404).json({ message: 'Testimonial not found' });

        const { name, role, content, rating, image, isVisible } = req.body;

        testimonial.name = name || testimonial.name;
        testimonial.role = role || testimonial.role;
        testimonial.content = content || testimonial.content;
        testimonial.rating = rating !== undefined ? rating : testimonial.rating;
        testimonial.image = image || testimonial.image;
        if (isVisible !== undefined) testimonial.isVisible = isVisible;

        const updatedTestimonial = await testimonial.save();
        res.json(updatedTestimonial);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete testimonial (Admin)
// @route   DELETE /api/testimonials/:id
const deleteTestimonial = async (req, res) => {
    try {
        const testimonial = await Testimonial.findById(req.params.id);
        if (!testimonial) return res.status(404).json({ message: 'Testimonial not found' });

        await Testimonial.deleteOne({ _id: req.params.id });
        res.json({ message: 'Testimonial deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getAllTestimonials,
    getAdminTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial
};
