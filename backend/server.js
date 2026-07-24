const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
// Set limits for bulk uploads as mentioned in the plan
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Enable CORS
app.use(cors());

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Log Analytics API is running' });
});

// Mount API routes
app.use('/api/logs', require('./routes/logs'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orgs', require('./routes/orgRoutes'));

const PORT = process.env.PORT || 5000;

const seedAdmin = require('./scripts/seedAdmin');
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await seedAdmin();
});
