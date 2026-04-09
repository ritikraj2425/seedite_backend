const College = require('../models/College');
const CollegeMember = require('../models/CollegeMember');
const { getBunnyStreamUrl } = require('../config/bunny');

// @desc    Get college portal data for the logged-in student
// @route   GET /api/college/:slug
// @access  Private (student must be an active member)
const getCollegePortal = async (req, res) => {
    try {
        const { slug } = req.params;
        const userEmail = req.user.email;
        const userId = req.user._id;

        // Find the college
        const college = await College.findOne({ slug, isActive: true })
            .populate({
                path: 'assignedCourses',
                select: 'title description thumbnail price originalPrice category instructor courseDetails'
            });

        if (!college) {
            return res.status(404).json({ message: 'College not found' });
        }

        // Check if this student is an active member
        const membership = await CollegeMember.findOne({
            college: college._id,
            email: userEmail,
            status: 'active'
        });

        if (!membership) {
            return res.status(403).json({
                message: 'You are not authorized to access this college portal',
                code: 'NOT_A_MEMBER'
            });
        }

        // Auto-link userId if not already linked (handles the case where they signed up
        // after the admin added their email)
        if (!membership.user) {
            membership.user = userId;
            await membership.save();
        }

        res.json({
            collegeName: college.name,
            slug: college.slug,
            courses: college.assignedCourses,
            memberSince: membership.createdAt
        });
    } catch (error) {
        console.error('[CollegePortal] getCollegePortal error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Check if the logged-in user belongs to any college
// @route   GET /api/college/my-colleges
// @access  Private
const getMyColleges = async (req, res) => {
    try {
        const userEmail = req.user.email;

        const memberships = await CollegeMember.find({
            email: userEmail,
            status: 'active'
        }).populate({
            path: 'college',
            match: { isActive: true },
            select: 'name slug'
        });

        // Filter out null colleges (inactive ones matched by populate)
        const colleges = memberships
            .filter(m => m.college !== null)
            .map(m => ({
                name: m.college.name,
                slug: m.college.slug,
                memberSince: m.createdAt
            }));

        res.json(colleges);
    } catch (error) {
        console.error('[CollegePortal] getMyColleges error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getCollegePortal, getMyColleges };
