const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    content: {
        type: String,
        required: true
    },
    image: {
        type: String, // URL
        default: ''
    },
    author: {
        type: String,
        default: 'Team Seedite'
    },
    tags: [{
        type: String
    }],
    isPublished: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Middleware to create slug from title
blogSchema.pre('save', async function () {
    if (this.isModified('title')) {
        this.slug = this.title.toLowerCase().split(' ').join('-').replace(/[^\w-]+/g, '');
    }
});

module.exports = mongoose.model('Blog', blogSchema);
