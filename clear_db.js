const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/awais_app_db'; // Adjust if using different URI

async function clearDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        const collections = await mongoose.connection.db.collections();

        for (let collection of collections) {
            await collection.deleteMany({});
            console.log(`Cleared collection: ${collection.collectionName}`);
        }

        console.log('\nDatabase cleared successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error clearing database:', err);
        process.exit(1);
    }
}

clearDB();
