const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Lecture = require('./models/Lecture');

const fixDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/ritik-platform');
        console.log('MongoDB connected');

        // Get all valid lectures
        const allLectures = await Lecture.find();
        console.log('Total Lectures in DB:', allLectures.length);

        // For each course, rebuild the lectures array with ONLY valid IDs
        const courses = await Course.find();

        for (const course of courses) {
            // Find all lectures that belong to this course
            const courseLectures = allLectures.filter(l => l.course.toString() === course._id.toString());

            console.log(`Course "${course.title}": Found ${courseLectures.length} valid lectures`);

            // Replace the lectures array with the correct IDs
            course.lectures = courseLectures.map(l => l._id);
            await course.save();

            console.log(`  Updated lectures array to: ${course.lectures}`);
        }

        console.log('\n✅ Database fixed! Lectures are now correctly linked.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixDB();
