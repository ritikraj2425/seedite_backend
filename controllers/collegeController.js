const College = require('../models/College');
const CollegeMember = require('../models/CollegeMember');
const CourseProgress = require('../models/CourseProgress');
const User = require('../models/User');
const Course = require('../models/Course');

// Helper: Generate slug from name
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')  // remove special chars
        .replace(/\s+/g, '-')           // spaces to hyphens
        .replace(/-+/g, '-');           // collapse multiple hyphens
};

// Helper: Parse raw email text into a clean array
const parseEmails = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return [];
    return rawText
        .split(/[,\n\r;]+/)              // split by comma, newline, or semicolon
        .map(e => e.trim().toLowerCase())
        .filter(e => e && e.includes('@')); // basic validation
};

// @desc    Create a new college
// @route   POST /api/admin/colleges
// @access  Admin
const createCollege = async (req, res) => {
    try {
        const { name, courseIds, emails } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'College name is required' });
        }

        // Generate slug
        let slug = generateSlug(name);

        // Verify slug uniqueness
        const existingCollege = await College.findOne({ slug });
        if (existingCollege) {
            slug = `${slug}-${Date.now()}`; // append timestamp if duplicate
        }

        // Create the college
        const college = await College.create({
            name: name.trim(),
            slug,
            assignedCourses: courseIds || []
        });

        // Parse and bulk-insert emails into CollegeMember
        const emailList = parseEmails(emails || '');
        if (emailList.length > 0) {
            // Find existing Seedite users for auto-linking
            const existingUsers = await User.find({
                email: { $in: emailList }
            }).select('_id email');

            const userMap = {};
            existingUsers.forEach(u => {
                userMap[u.email] = u._id;
            });

            const memberDocs = emailList.map(email => ({
                college: college._id,
                email,
                user: userMap[email] || null,
                status: userMap[email] ? 'active' : 'pending'
            }));

            // Use ordered: false so duplicates don't stop the batch
            await CollegeMember.insertMany(memberDocs, { ordered: false }).catch(err => {
                // Ignore duplicate key errors (code 11000) — means email was already added
                if (err.code !== 11000 && !err.writeErrors) {
                    console.error('[College] Bulk insert partial error:', err.message);
                }
            });
        }

        res.status(201).json({
            college,
            membersAdded: emailList.length,
            message: `College "${name}" created with route /college/${slug}`
        });
    } catch (error) {
        console.error('[College] Create error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all colleges
// @route   GET /api/admin/colleges
// @access  Admin
const getAllColleges = async (req, res) => {
    try {
        const colleges = await College.find({})
            .populate('assignedCourses', 'title thumbnail')
            .sort({ createdAt: -1 });

        // Attach member counts for each college
        const enriched = await Promise.all(colleges.map(async (college) => {
            const totalMembers = await CollegeMember.countDocuments({ college: college._id });
            const activeMembers = await CollegeMember.countDocuments({ college: college._id, status: 'active' });
            return {
                ...college.toObject(),
                totalMembers,
                activeMembers
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error('[College] GetAll error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single college with members
// @route   GET /api/admin/colleges/:id
// @access  Admin
const getCollegeById = async (req, res) => {
    try {
        const college = await College.findById(req.params.id)
            .populate('assignedCourses', 'title thumbnail price');

        if (!college) {
            return res.status(404).json({ message: 'College not found' });
        }

        const members = await CollegeMember.find({ college: college._id })
            .populate('user', 'name email')
            .sort({ status: 1, createdAt: -1 });

        res.json({ college, members });
    } catch (error) {
        console.error('[College] GetById error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update college (name, courses, add/remove emails)
// @route   PATCH /api/admin/colleges/:id
// @access  Admin
const updateCollege = async (req, res) => {
    try {
        const { name, courseIds, addEmails, removeEmails, isActive } = req.body;
        const college = await College.findById(req.params.id);

        if (!college) {
            return res.status(404).json({ message: 'College not found' });
        }

        // Update basic fields
        if (name !== undefined) {
            college.name = name.trim();
            college.slug = generateSlug(name);
        }
        if (courseIds !== undefined) {
            college.assignedCourses = courseIds;
        }
        if (isActive !== undefined) {
            college.isActive = isActive;
        }

        await college.save();

        // Add new emails
        if (addEmails) {
            const emailList = parseEmails(addEmails);
            if (emailList.length > 0) {
                const existingUsers = await User.find({
                    email: { $in: emailList }
                }).select('_id email');

                const userMap = {};
                existingUsers.forEach(u => { userMap[u.email] = u._id; });

                const bulkOps = emailList.map(email => {
                    const userId = userMap[email] || null;
                    return {
                        updateOne: {
                            filter: { college: college._id, email },
                            update: { 
                                $set: { 
                                    user: userId, 
                                    status: userId ? 'active' : 'pending' 
                                } 
                            },
                            upsert: true
                        }
                    };
                });

                await CollegeMember.bulkWrite(bulkOps, { ordered: false }).catch(err => {
                    console.error('[College] Email add partial error:', err.message);
                });
            }
        }

        // Remove emails (set status to revoked instead of deleting — audit trail)
        if (removeEmails) {
            const emailList = parseEmails(removeEmails);
            if (emailList.length > 0) {
                await CollegeMember.updateMany(
                    { college: college._id, email: { $in: emailList } },
                    { $set: { status: 'revoked' } }
                );
            }
        }

        res.json({ message: 'College updated', college });
    } catch (error) {
        console.error('[College] Update error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a college
// @route   DELETE /api/admin/colleges/:id
// @access  Admin
const deleteCollege = async (req, res) => {
    try {
        const college = await College.findById(req.params.id);
        if (!college) {
            return res.status(404).json({ message: 'College not found' });
        }

        // Remove all members of this college
        await CollegeMember.deleteMany({ college: college._id });

        await College.findByIdAndDelete(req.params.id);

        res.json({ message: 'College and all associated members deleted' });
    } catch (error) {
        console.error('[College] Delete error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get analytics for a specific college
// @route   GET /api/admin/colleges/:id/analytics
// @access  Admin
const getCollegeAnalytics = async (req, res) => {
    try {
        const college = await College.findById(req.params.id)
            .populate('assignedCourses', 'title lectures sections');

        if (!college) {
            return res.status(404).json({ message: 'College not found' });
        }

        // Get all active members with linked user accounts
        const activeMembers = await CollegeMember.find({
            college: college._id,
            status: 'active',
            user: { $ne: null }
        }).populate('user', 'name email');

        const userIds = activeMembers.map(m => m.user._id);

        // Fetch CourseProgress for all active members across assigned courses
        const progressRecords = await CourseProgress.find({
            user: { $in: userIds },
            course: { $in: college.assignedCourses.map(c => c._id) }
        });

        // Build a lookup: { `${userId}-${courseId}`: progressPercentage }
        const progressMap = {};
        progressRecords.forEach(p => {
            progressMap[`${p.user}-${p.course}`] = p.progressPercentage;
        });

        // Build the analytics response
        const studentAnalytics = activeMembers.map(member => {
            const courseProgress = college.assignedCourses.map(course => ({
                courseId: course._id,
                courseTitle: course.title,
                progress: progressMap[`${member.user._id}-${course._id}`] || 0
            }));

            const avgProgress = courseProgress.length > 0
                ? Math.round(courseProgress.reduce((sum, cp) => sum + cp.progress, 0) / courseProgress.length)
                : 0;

            return {
                userId: member.user._id,
                name: member.user.name,
                email: member.user.email,
                courses: courseProgress,
                averageProgress: avgProgress
            };
        });

        // Overall college stats
        const totalStudents = activeMembers.length;
        const overallAvg = totalStudents > 0
            ? Math.round(studentAnalytics.reduce((sum, s) => sum + s.averageProgress, 0) / totalStudents)
            : 0;

        res.json({
            collegeName: college.name,
            totalStudents,
            overallAverageProgress: overallAvg,
            students: studentAnalytics
        });
    } catch (error) {
        console.error('[College] Analytics error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createCollege,
    getAllColleges,
    getCollegeById,
    updateCollege,
    deleteCollege,
    getCollegeAnalytics
};
