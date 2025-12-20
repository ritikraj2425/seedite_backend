
// @desc    Create mock test
// @route   POST /api/admin/mock-tests
// @access  Admin
const createMockTest = async (req, res) => {
    try {
        const { title, duration, totalQuestions, passingScore, courseId, questions } = req.body;

        const mockTest = await MockTest.create({
            title,
            duration,
            totalQuestions,
            passingScore,
            course: courseId,
            questions: questions || [] // Array of question objects
        });

        // Add mock test to course
        await Course.findByIdAndUpdate(courseId, {
            $push: { mockTests: mockTest._id }
        });

        res.status(201).json(mockTest);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update mock test
// @route   PUT /api/admin/mock-tests/:id
// @access  Admin
const updateMockTest = async (req, res) => {
    try {
        const mockTest = await MockTest.findById(req.params.id);

        if (!mockTest) {
            return res.status(404).json({ message: 'Mock Test not found' });
        }

        const { title, duration, totalQuestions, passingScore, questions } = req.body;

        mockTest.title = title || mockTest.title;
        mockTest.duration = duration || mockTest.duration;
        mockTest.totalQuestions = totalQuestions || mockTest.totalQuestions;
        mockTest.passingScore = passingScore || mockTest.passingScore;
        if (questions) mockTest.questions = questions;

        const updatedMockTest = await mockTest.save();
        res.json(updatedMockTest);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete mock test
// @route   DELETE /api/admin/mock-tests/:id
// @access  Admin
const deleteMockTest = async (req, res) => {
    try {
        const mockTest = await MockTest.findById(req.params.id);

        if (!mockTest) {
            return res.status(404).json({ message: 'Mock Test not found' });
        }

        // Remove from course
        await Course.findByIdAndUpdate(mockTest.course, {
            $pull: { mockTests: mockTest._id }
        });

        await MockTest.deleteOne({ _id: req.params.id });
        res.json({ message: 'Mock Test deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
