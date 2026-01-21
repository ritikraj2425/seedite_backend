const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile } = require('../utils/s3');
const { uploadToBunny } = require('../utils/bunny');
const { protect, admin } = require('../middleware/authMiddleware');

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

// Multer setup for disk storage (to handle large videos without OOM)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp'); // Use /tmp for ephemeral storage
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000 * 1024 * 1024 } // 1000MB limit
});

// Helper function to handle the S3 upload logic (for images)
const handleS3Upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload to S3
        const result = await uploadFile(req.file);

        // Clean up local file after upload
        await unlinkFile(req.file.path);

        res.json({
            url: result.url,
            key: result.key,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('S3 Upload Error:', error);
        // Attempt to clean up even on error
        if (req.file && req.file.path) await unlinkFile(req.file.path).catch(() => { });
        res.status(500).json({ message: 'Failed to upload file', error: error.message });
    }
};

// Helper function to handle Bunny Stream upload (for videos)
const handleBunnyUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('[Upload] Starting Bunny Stream upload for:', req.file.originalname);

        // Upload to Bunny Stream
        const result = await uploadToBunny(req.file);

        // Clean up local file after upload
        await unlinkFile(req.file.path);

        console.log('[Upload] Bunny Stream upload complete:', result.videoId);

        res.json({
            videoId: result.videoId,
            url: result.url,
            key: result.videoId, // For backward compatibility with admin panel
            message: 'Video uploaded successfully to Bunny Stream'
        });
    } catch (error) {
        console.error('Bunny Upload Error:', error);
        // Attempt to clean up even on error
        if (req.file && req.file.path) await unlinkFile(req.file.path).catch(() => { });
        res.status(500).json({ message: 'Failed to upload video', error: error.message });
    }
};

// S3 upload route for images - expects field name 'file'
router.post('/s3', protect, admin, upload.single('file'), handleS3Upload);

// S3 upload route for images - expects field name 'image'
router.post('/s3/image', protect, admin, upload.single('image'), handleS3Upload);

// Bunny Stream upload route for videos - expects field name 'file'
router.post('/bunny', protect, admin, upload.single('file'), handleBunnyUpload);

// Bunny Stream upload route for videos - expects field name 'video'
router.post('/bunny/video', protect, admin, upload.single('video'), handleBunnyUpload);

// Multer error handling middleware
router.use((error, req, res, next) => {
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            message: `Unexpected field name: '${error.field}'. Use 'file' for uploads.`
        });
    }
    if (error.name === 'MulterError') {
        return res.status(400).json({ message: error.message });
    }
    next(error);
});

module.exports = router;

