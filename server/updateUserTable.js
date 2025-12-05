const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDB() {
    console.log('Connecting to DB...', process.env.DB_HOST);
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log('Connected successfully.');

        // Add is_active column
        try {
            await connection.query("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
            console.log("Added is_active column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("is_active column already exists.");
            } else {
                console.error("Error adding is_active:", e);
            }
        }

        // Add remarks column
        try {
            await connection.query("ALTER TABLE users ADD COLUMN remarks TEXT");
            console.log("Added remarks column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("remarks column already exists.");
            } else {
                console.error("Error adding remarks:", e);
            }
        }

        await connection.end();
    } catch (error) {
        console.error('DB Error:', error);
    }
}

updateDB();
