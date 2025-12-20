// CloudFront Configuration
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'dr6ydg7wb58lc.cloudfront.net';

/**
 * Constructs the full CloudFront URL from a video file key
 * @param {string} videoKey - The file key (e.g., "A_single_steady_202510011654.mp4")
 * @returns {string} - Full CloudFront URL
 */
const getCloudFrontUrl = (videoKey) => {
    if (!videoKey) return null;
    // If it's already a full URL, return as-is
    if (videoKey.startsWith('http://') || videoKey.startsWith('https://')) {
        return videoKey;
    }
    return `https://${CLOUDFRONT_DOMAIN}/${videoKey}`;
};

module.exports = { CLOUDFRONT_DOMAIN, getCloudFrontUrl };
