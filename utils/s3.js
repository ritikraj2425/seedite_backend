const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const fs = require('fs');

const generateFileName = (originalName, folder = 'uploads') => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    return `${folder}/${timestamp}-${random}${extension}`;
};

const uploadFile = async (file) => {
    // Determine folder based on mimetype
    let folder = 'others';
    if (file.mimetype.startsWith('image/')) folder = 'images';
    else if (file.mimetype.startsWith('video/')) folder = 'videos';

    const fileName = generateFileName(file.originalname, folder);

    // Create read stream from local temp file
    const fileStream = fs.createReadStream(file.path);

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: fileStream,
        ContentType: file.mimetype,
        // ACL: 'public-read' 
    });

    await s3Client.send(command);

    // Return the URL and Key
    const url = process.env.CLOUDFRONT_DOMAIN
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${fileName}`
        : `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileName}`;

    return { url, key: fileName };
};

module.exports = {
    s3Client,
    uploadFile
};
