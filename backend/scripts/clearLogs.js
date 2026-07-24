const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Log = require('../models/Log');
const connectDB = require('../config/db');

dotenv.config();

const clearData = async () => {
    try {
        await connectDB();
        
        console.log('Clearing all logs from the database...');
        const result = await Log.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} logs.`);
        
        process.exit();
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

clearData();
