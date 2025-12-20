const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Lecture = require('./models/Lecture');

const repairDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/ritik-platform');
        console.log('MongoDB connected');

        // 1. Delete Valid-but-Empty Lectures (missing title/videoUrl)
        // Note: Using $or to catch either missing
        const deleteEmpty = await Lecture.deleteMany({
            $or: [
                { title: { $exists: false } },
                { videoUrl: { $exists: false } },
                { title: null },
                { videoUrl: null }
            ]
        });
        console.log(`Deleted ${deleteEmpty.deletedCount} empty/corrupted lectures.`);

        // 2. Delete YouTube Lectures
        const deleteYouTube = await Lecture.deleteMany({
            videoUrl: { $regex: /youtube\.com|youtu\.be/ }
        });
        console.log(`Deleted ${deleteYouTube.deletedCount} YouTube lectures.`);

        // 3. Sync Course Arrays
        // We will pull all IDs from courses that DO NOT exist in the Lecture collection
        const allReferenceableLectures = await Lecture.find({}, '_id');
        const validLectureIds = allReferenceableLectures.map(l => l._id.toString());
        const validLectureIdSet = new Set(validLectureIds);

        const courses = await Course.find();

        for (const course of courses) {
            const originalLength = course.lectures.length;

            // Filter: keep only IDs that exist in our valid set
            course.lectures = course.lectures.filter(id => validLectureIdSet.has(id.toString()));

            if (course.lectures.length !== originalLength) {
                await course.save();
                console.log(`Cleaned Course "${course.title}": Removed ${originalLength - course.lectures.length} invalid/legacy references.`);
            }
        }

        console.log('Database repair complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

repairDB();
