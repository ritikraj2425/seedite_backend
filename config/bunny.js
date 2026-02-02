// Bunny.net Stream Configuration with Token Authentication
const crypto = require('crypto');

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || '584013';
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY || '';

/**
 * Generate a signed token for Bunny.net Stream embed URLs
 * Required when token authentication is enabled on the library
 * 
 * Token format per Bunny docs: SHA256_HEX(token_key + video_id + expiration)
 * URL format: ?token={hex_hash}&expires={unix_timestamp}
 * 
 * @param {string} videoId - The Bunny Stream video GUID
 * @param {number} expirationTime - Unix timestamp when token expires (default: 24 hours from now)
 * @returns {{token: string, expires: number}} - Token and expiration
 */
const generateBunnyToken = (videoId, expirationTime = null) => {
    if (!BUNNY_TOKEN_KEY) {
        console.warn('[Bunny] No BUNNY_TOKEN_KEY set - token authentication will fail');
        return { token: '', expires: 0 };
    }

    // Default expiration: 24 hours from now
    const expires = expirationTime || Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    // Hash formula: SHA256_HEX(token_key + video_id + expiration)
    const hashableBase = `${BUNNY_TOKEN_KEY}${videoId}${expires}`;

    // Generate SHA256 hash as HEX (not Base64!)
    const token = crypto
        .createHash('sha256')
        .update(hashableBase)
        .digest('hex');

    return { token, expires };
};

/**
 * Constructs the signed Bunny Stream embed URL from a video ID
 * @param {string} videoId - The Bunny Stream video GUID
 * @returns {string|null} - Signed Bunny Stream iframe embed URL
 */
const getBunnyStreamUrl = (videoId) => {
    if (!videoId) return null;

    // If it's already a full URL, return as-is (backward compatibility)
    if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
        return videoId;
    }

    // Generate signed embed URL
    const { token, expires } = generateBunnyToken(videoId);

    // Player parameters for better mobile experience
    // Updated to new player params per Bunny support
    const playerParams = 'autoplay=true&loop=false&muted=false&preload=true&responsive=true';

    if (token) {
        // Signed embed URL with token, expires, and player params
        // Updated domain from iframe.mediadelivery.net to player.mediadelivery.net
        return `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?token=${token}&expires=${expires}&${playerParams}`;
    }

    // Fallback without token (will fail if auth is enabled)
    return `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?${playerParams}`;
};

/**
 * Get signed HLS playlist URL for custom video players
 * @param {string} videoId - The Bunny Stream video GUID
 * @returns {string|null} - Signed HLS playlist URL
 */
const getBunnyHlsUrl = (videoId) => {
    if (!videoId) return null;

    if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
        return videoId;
    }

    // Replace with your actual Bunny CDN hostname from Bunny Stream dashboard
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || 'vz-c7f7a8ef-a3c.b-cdn.net';
    const { token, expires } = generateBunnyToken(videoId);

    if (token) {
        return `https://${cdnHostname}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;
    }

    return `https://${cdnHostname}/${videoId}/playlist.m3u8`;
};

/**
 * Get signed direct MP4 URL (lower quality, for fallback)
 * @param {string} videoId - The Bunny Stream video GUID
 * @param {string} resolution - Resolution like '720p', '1080p'
 * @returns {string|null}
 */
const getBunnyDirectUrl = (videoId, resolution = '720p') => {
    if (!videoId) return null;

    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || 'vz-c7f7a8ef-a3c.b-cdn.net';
    const { token, expires } = generateBunnyToken(videoId);

    if (token) {
        return `https://${cdnHostname}/${videoId}/play_${resolution}.mp4?token=${token}&expires=${expires}`;
    }

    return `https://${cdnHostname}/${videoId}/play_${resolution}.mp4`;
};

// Keep backward compatibility - alias for existing code
const getCloudFrontUrl = getBunnyStreamUrl;

module.exports = {
    BUNNY_LIBRARY_ID,
    getBunnyStreamUrl,
    getBunnyHlsUrl,
    getBunnyDirectUrl,
    getCloudFrontUrl,  // Backward compatibility alias
    generateBunnyToken
};
