const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile } = require('../utils/s3');
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

router.post('/s3', protect, admin, upload.single('file'), async (req, res) => {
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
            key: result.key, // Useful if we need just the key
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('S3 Upload Error:', error);
        // Attempt to clean up even on error
        if (req.file && req.file.path) await unlinkFile(req.file.path).catch(() => { });
        res.status(500).json({ message: 'Failed to upload file' });
    }
});

module.exports = router;
