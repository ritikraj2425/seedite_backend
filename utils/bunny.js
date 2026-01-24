// Bunny.net Stream API Utility
const fs = require('fs');
const path = require('path');

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

/**
 * Helper function to perform fetch with exponential backoff retry.
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries (default 3)
 * @returns {Promise<Response>}
 */
const fetchWithRetry = async (url, options, retries = 3) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            // Don't retry client errors unless 408 (Timeout) or 429 (Too Many Requests)
            if (!response.ok) {
                if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
                    return response; // Return response to let caller handle 4xx
                }
                // For 5xx or specific 4xx, throw to trigger retry
                // But wait, if we return response, the caller checks .ok. 
                // We should actually just return the response if it succeeded OR if it's a non-retriable error.
                // If it's retriable, we should throw or loop.

                // Let's refine:
                // If OK -> return
                // If 4xx (non-retry) -> return
                // If 5xx or 408/429 -> loop

                const status = response.status;
                if (status >= 500 || status === 408 || status === 429) {
                    const text = await response.text();
                    // We consumed the body, so we can't return logic easily if we want to preserve body. 
                    // But usually we want to retry on 5xx.
                    // A safer way is: just check response.ok. 
                    // If fetch itself threw (network error), we are in catch block.
                    // If fetch returned a response, we rely on status code.

                    // Actually, many "fetch failed" are network errors which land in catch block.
                    // 500s are returned.
                    // Let's rely on simple logic: Retry mainly on NETWORK errors and 5xx/429.
                    throw new Error(`Request failed with status ${status}`);
                }
            }

            return response;
        } catch (error) {
            lastError = error;
            console.warn(`[Bunny] Request to ${url} attempt ${i + 1} failed: ${error.message}`);

            // Don't retry if it was the last attempt
            if (i === retries - 1) break;

            const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
};

/**
 * Create a video placeholder in Bunny Stream
 * @param {string} title - Video title
 * @returns {Promise<{videoId: string, libraryId: string}>}
 */
const createVideo = async (title) => {
    try {
        const response = await fetchWithRetry(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`, {
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
    } catch (error) {
        throw error;
    }
};

/**
 * Upload video content to an existing video placeholder
 * @param {string} videoId - The video GUID from createVideo
 * @param {Buffer|ReadStream} videoData - Video file data
 * @returns {Promise<{success: boolean}>}
 */
const uploadVideoContent = async (videoId, filePath) => {
    let lastError;
    const retries = 3;
    const fileStats = fs.statSync(filePath);

    // Custom retry loop for upload because we need to refresh the stream
    for (let i = 0; i < retries; i++) {
        try {
            const fileStream = fs.createReadStream(filePath);

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
                    duplex: 'half'
                }
            );

            if (!response.ok) {
                // If it's a client error (4xx), don't retry (except maybe 408/429)
                if (response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 408) {
                    const errorText = await response.text();
                    throw new Error(`Failed to upload video content: ${response.status} - ${errorText}`);
                }
                // For 5xx, or network errors, we fall through to catch or retry
                const errorText = await response.text();
                throw new Error(`Failed to upload video content: ${response.status} - ${errorText}`);
            }

            return { success: true };
        } catch (error) {
            console.warn(`[Bunny] Upload video content attempt ${i + 1} failed: ${error.message}`);
            lastError = error;
            if (i < retries - 1) {
                const delay = 1000 * Math.pow(2, i);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
};

/**
 * Get video information from Bunny Stream
 * @param {string} videoId - The video GUID
 * @returns {Promise<Object>}
 */
const getVideoInfo = async (videoId) => {
    const response = await fetchWithRetry(
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
    const response = await fetchWithRetry(
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
    const response = await fetchWithRetry(
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
