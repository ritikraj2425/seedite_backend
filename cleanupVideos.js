const mongoose = require('mongoose');
require('dotenv').config();

const Lecture = require('./models/Lecture');

const cleanupYouTube = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ritik-platform');
        console.log('MongoDB connected');

        // Delete lectures with YouTube URLs
        const result = await Lecture.deleteMany({
            videoUrl: { $regex: /youtube\.com|youtu\.be/ }
        });

        console.log(`✅ Deleted ${result.deletedCount} lectures with YouTube URLs.`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

cleanupYouTube();
