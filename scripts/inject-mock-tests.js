const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const MockTest = require('../models/MockTest');
const Course = require('../models/Course');

dotenv.config();

const injectData = async () => {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('❌ Please provide a JSON file path as an argument.');
        console.log('Usage: node scripts/inject-mock-tests.js <path-to-json-file>');
        process.exit(1);
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found: ${absolutePath}`);
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const rawData = fs.readFileSync(absolutePath, 'utf8');
        const data = JSON.parse(rawData);

        if (!Array.isArray(data)) {
            console.error('❌ Input JSON must be an array of mock tests.');
            process.exit(1);
        }

        console.log(`Starting injection of ${data.length} mock tests...`);

        for (const testData of data) {
            const courseIdentifier = testData.course || testData.courseId;
            const { course, courseId, ...testFields } = testData;

            if (!courseIdentifier) {
                console.warn(`⚠️ Skipping test "${testData.title}": No course ID provided.`);
                continue;
            }

            // Verify course exists
            const courseDoc = await Course.findById(courseIdentifier);
            if (!courseDoc) {
                console.warn(`⚠️ Skipping test "${testData.title}": Course with ID ${courseIdentifier} not found.`);
                continue;
            }

            // Check if test already exists for this course
            let mockTest = await MockTest.findOne({ title: testFields.title, course: courseIdentifier });

            if (mockTest) {
                console.log(`ℹ️ Test "${testFields.title}" already exists (ID: ${mockTest._id}). Updating content instead.`);
                Object.assign(mockTest, testFields);
                await mockTest.save();
            } else {
                // Create the MockTest
                mockTest = new MockTest({
                    ...testFields,
                    course: courseIdentifier
                });
                await mockTest.save();
                console.log(`✅ Injected: "${mockTest.title}" (ID: ${mockTest._id})`);
            }

            // Link to course (using $addToSet to be safe if run multiple times)
            await Course.findByIdAndUpdate(courseIdentifier, {
                $addToSet: { mockTests: mockTest._id }
            });
            console.log(`🔗 Linked to course: "${courseDoc.title}"`);
        }

        console.log('\n✨ Injection process completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during injection:', error);
        process.exit(1);
    }
};

injectData();
