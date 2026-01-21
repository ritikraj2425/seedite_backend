// Bunny.net Stream API Utility
const fs = require('fs');
const path = require('path');

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

/**
 * Create a video placeholder in Bunny Stream
 * @param {string} title - Video title
 * @returns {Promise<{videoId: string, libraryId: string}>}
 */
const createVideo = async (title) => {
    const response = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`, {
        method: 'POST',
        headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ title })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create video: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
        videoId: data.guid,
        libraryId: data.videoLibraryId
    };
};

/**
 * Upload video content to an existing video placeholder
 * @param {string} videoId - The video GUID from createVideo
 * @param {Buffer|ReadStream} videoData - Video file data
 * @returns {Promise<{success: boolean}>}
 */
const uploadVideoContent = async (videoId, filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);

    const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
        {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'application/octet-stream',
                'Content-Length': fileStats.size.toString()
            },
            body: fileStream,
            duplex: 'half' // Required for streaming body in Node.js fetch
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload video content: ${response.status} - ${errorText}`);
    }

    return { success: true };
};

/**
 * Get video information from Bunny Stream
 * @param {string} videoId - The video GUID
 * @returns {Promise<Object>}
 */
const getVideoInfo = async (videoId) => {
    const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
        {
            method: 'GET',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Accept': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get video info: ${response.status}`);
    }

    return response.json();
};

/**
 * Delete a video from Bunny Stream
 * @param {string} videoId - The video GUID
 * @returns {Promise<{success: boolean}>}
 */
const deleteVideo = async (videoId) => {
    const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
        {
            method: 'DELETE',
            headers: {
                'AccessKey': BUNNY_API_KEY
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to delete video: ${response.status}`);
    }

    return { success: true };
};

/**
 * Combined function to create and upload a video to Bunny Stream
 * @param {Object} file - Multer file object with path, originalname
 * @returns {Promise<{videoId: string, url: string}>}
 */
const uploadToBunny = async (file) => {
    // Extract title from filename (without extension)
    const title = path.basename(file.originalname, path.extname(file.originalname));

    console.log(`[Bunny] Creating video placeholder: ${title}`);

    // Step 1: Create video placeholder
    const { videoId } = await createVideo(title);
    console.log(`[Bunny] Video placeholder created: ${videoId}`);

    // Step 2: Upload video content
    console.log(`[Bunny] Uploading video content...`);
    await uploadVideoContent(videoId, file.path);
    console.log(`[Bunny] Video upload complete`);

    // Return the video ID and embed URL
    const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;

    return {
        videoId,
        url: embedUrl,
        libraryId: BUNNY_LIBRARY_ID
    };
};

/**
 * List all videos in the library
 * @param {number} page - Page number (default 1)
 * @param {number} itemsPerPage - Items per page (default 100)
 * @returns {Promise<Object>}
 */
const listVideos = async (page = 1, itemsPerPage = 100) => {
    const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos?page=${page}&itemsPerPage=${itemsPerPage}`,
        {
            method: 'GET',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Accept': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to list videos: ${response.status}`);
    }

    return response.json();
};

module.exports = {
    createVideo,
    uploadVideoContent,
    getVideoInfo,
    deleteVideo,
    uploadToBunny,
    listVideos
};
