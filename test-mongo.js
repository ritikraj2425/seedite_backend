require('dotenv').config();
const mongoose = require('mongoose');

console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('URI starts with:', process.env.MONGODB_URI?.substring(0, 20) + '...');

mongoose.set('strictQuery', true);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ Connected successfully!');
  console.log('Database:', mongoose.connection.db.databaseName);
  process.exit(0);
})
.catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
