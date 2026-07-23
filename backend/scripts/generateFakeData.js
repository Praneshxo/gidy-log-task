const fs = require('fs');
const { faker } = require('@faker-js/faker');
const path = require('path');

const NUM_LOGS = 10000;
const logs = [];

const actions = ['LOGIN', 'LOGOUT', 'DATA_READ', 'DATA_WRITE', 'DELETE', 'UPDATE_PERMISSIONS', 'EXPORT_DATA'];
const resources = ['User_Database', 'Financial_Records', 'Auth_Service', 'S3_Bucket_Logs', 'API_Gateway', 'Admin_Panel'];
const roles = ['admin', 'user', 'moderator', 'system', 'guest'];

console.log(`Generating ${NUM_LOGS} fake logs...`);

for (let i = 0; i < NUM_LOGS; i++) {
    const isError = Math.random() > 0.8; // 20% chance of failure/error
    
    logs.push({
        action: faker.helpers.arrayElement(actions),
        actor: faker.internet.email(),
        role: faker.helpers.arrayElement(roles),
        resource: faker.helpers.arrayElement(resources),
        resourceType: 'System',
        ipAddress: faker.internet.ip(),
        region: faker.location.countryCode(),
        severity: isError ? faker.helpers.arrayElement(['HIGH', 'CRITICAL']) : faker.helpers.arrayElement(['INFO', 'LOW', 'MEDIUM']),
        status: isError ? 'FAILURE' : faker.helpers.arrayElement(['SUCCESS', 'PENDING']),
        timestamp: faker.date.past({ years: 1 })
    });
}

const outputPath = path.join(__dirname, '../mock_logs.json');
fs.writeFileSync(outputPath, JSON.stringify(logs, null, 2));

console.log(`Successfully generated data and saved to ${outputPath}`);
