const mongoose = require('mongoose');
require('dotenv').config();

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ritik-platform');
        console.log('Connected to DB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        const names = collections.map(c => c.name);
        console.log('Collections:', names);

        for (const name of names) {
            if (name.toLowerCase().includes('feed') || name.toLowerCase().includes('feeb')) {
                const count = await mongoose.connection.db.collection(name).countDocuments();
                console.log(`Collection: ${name}, Count: ${count}`);
                if (count > 0) {
                    const sample = await mongoose.connection.db.collection(name).findOne();
                    console.log(`Sample from ${name}:`, JSON.stringify(sample, null, 2));
                }
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDB();
