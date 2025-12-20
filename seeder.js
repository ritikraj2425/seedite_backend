const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Course = require('./models/Course');
const MockTest = require('./models/MockTest');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ritik-platform', {
});

const importData = async () => {
    try {
        await User.deleteMany();
        await Course.deleteMany();
        await MockTest.deleteMany();

        // Users
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('123456', salt);

        const adminUser = await User.create({
            name: 'Seedite Admin',
            email: 'admin@example.com',
            password: password,
            role: 'admin'
        });

        const studentUser = await User.create({
            name: 'John Student',
            email: 'student@example.com',
            password: password,
            role: 'student'
        });

        console.log('Users created');

        // Courses
        const course1 = new Course({
            title: 'Complete Next.js Bootcamp',
            description: 'Learn Next.js from scratch to advanced. This course covers everything you need to know about App Router, Server Actions, and more.',
            price: 4999,
            thumbnail: 'https://images.unsplash.com/photo-1649180556628-9ba704115795?q=80&w=600&auto=format&fit=crop', // Placeholder
            lectures: [
                { title: 'Introduction to Next.js', videoUrl: 'https://www.youtube.com/watch?v=gwWDa5ZkFq8', duration: '10:00', isFree: true },
                { title: 'Routing in Next.js', videoUrl: 'https://www.youtube.com/watch?v=gwWDa5ZkFq8', duration: '15:00', isFree: false },
                { title: 'Server Components', videoUrl: 'https://www.youtube.com/watch?v=gwWDa5ZkFq8', duration: '20:00', isFree: false }
            ]
        });
        await course1.save();

        const course2 = new Course({
            title: 'Advanced Mathematics for JEE',
            description: 'Master Calculus, Algebra, and Trigonometry with ease. Includes extensive mock tests.',
            price: 2999,
            thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop',
            lectures: [
                { title: 'Functions and Graphs', videoUrl: 'https://www.youtube.com/watch?v=gwWDa5ZkFq8', duration: '45:00', isFree: true }
            ]
        });
        await course2.save();

        // Mock Tests
        const mockTest1 = await MockTest.create({
            title: 'Next.js Basics Quiz',
            course: course1._id,
            questions: [
                {
                    questionText: 'Which command is used to create a new Next.js app?',
                    options: ['npx create-react-app', 'npx create-next-app', 'npm init next', 'create-next-app'],
                    correctOptionIndex: 1,
                    explanation: 'npx create-next-app is the standard command.'
                },
                {
                    questionText: 'What is the default routing mechanism in Next.js 13+?',
                    options: ['Pages Router', 'App Router', 'React Router', 'Express Router'],
                    correctOptionIndex: 1,
                    explanation: 'App Router is the new default.'
                }
            ],
            durationMinutes: 30,
            videoSolutionUrl: 'https://www.youtube.com/watch?v=gwWDa5ZkFq8'
        });

        // Link MockTest to Course
        course1.mockTests.push(mockTest1._id);
        await course1.save();

        console.log('Courses and Mock Tests created');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
