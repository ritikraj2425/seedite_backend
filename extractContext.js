const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const Course = require('./models/Course');
const Blog = require('./models/Blog');

async function extract() {
    await connectDB();
    const courses = await Course.find({});
    const blogs = await Blog.find({});

    console.log("=== COURSES ===");
    courses.forEach(c => {
        console.log(`Title: ${c.title}`);
        console.log(`Description: ${c.description}`);
        console.log(`Price: ${c.price}`);
        console.log(`OriginalPrice: ${c.originalPrice || 'N/A'}`);
        console.log(`LaunchLater: ${c.launchLater || false}`);
        console.log(`---`);
    });

    console.log("\n=== BLOGS (FULL CONTENT) ===");
    blogs.forEach(b => {
        console.log(`\n### BLOG: ${b.title}`);
        console.log(`Tags: ${(b.tags || []).join(', ')}`);
        console.log(`Author: ${b.author}`);
        console.log(`Content:\n${b.content}`);
        console.log(`\n--- END BLOG ---`);
    });

    process.exit(0);
}

extract();
