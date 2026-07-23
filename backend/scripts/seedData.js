const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Log = require('../models/Log');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDB = async () => {
    try {
        console.log('Connecting to DB: ', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected.');

        // Read mock logs
        const logsPath = path.join(__dirname, '../mock_logs.json');
        const logsData = JSON.parse(fs.readFileSync(logsPath, 'utf-8'));

        console.log(`Inserting ${logsData.length} logs...`);
        // Insert data
        await Log.insertMany(logsData, { ordered: false });
        console.log('Data successfully inserted! The database and collection are now created.');

        process.exit();
    } catch (error) {
        if (error.name === 'BulkWriteError' || error.code === 11000) {
            console.log('Data inserted (with some validation errors expected due to ordered: false).');
            process.exit(0);
        }
        console.error('Error with data seeding:', error);
        process.exit(1);
    }
};

seedDB();
