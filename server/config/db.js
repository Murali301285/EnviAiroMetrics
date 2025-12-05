const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Main Admin Database Pool
console.log('DB Config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordLength: process.env.DB_PASS ? process.env.DB_PASS.length : 0
});

const adminPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'env_admin',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper to create a pool for a specific app connection string
const createAppPool = (config) => {
    // config should be an object with host, user, password, database
    // or a connection URI if we parse it. 
    // For now assuming we store parts or a URI.
    // Let's assume we store JSON config for simplicity or standard parts.
    return mysql.createPool({
        ...config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
};

module.exports = { adminPool, createAppPool };
