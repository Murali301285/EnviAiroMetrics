const mysql = require('mysql2/promise');
const { adminPool } = require('./config/db');
require('dotenv').config();

const updateLocationsTable = async () => {
    try {
        console.log('Starting locations table update...');

        // 1. Get all apps to find their database configs
        const [apps] = await adminPool.query('SELECT name, db_config FROM apps');

        for (const app of apps) {
            console.log(`Processing app: ${app.name}`);
            let config = app.db_config;

            if (typeof config === 'string') {
                config = JSON.parse(config);
            }

            // Create connection to tenant DB
            const connection = await mysql.createConnection({
                host: config.host,
                user: config.user,
                password: config.password,
                database: config.database
            });

            try {
                // Check if columns exist, if not add them
                // Add columns one by one, ignoring errors if they exist
                const columns = [
                    "ADD COLUMN full_address TEXT",
                    "ADD COLUMN remarks TEXT",
                    "ADD COLUMN is_configured BOOLEAN DEFAULT 0",
                    "ADD COLUMN configured_on DATETIME",
                    "ADD COLUMN sensor_type VARCHAR(255)"
                ];

                for (const col of columns) {
                    try {
                        await connection.query(`ALTER TABLE tbllocations ${col}`);
                        console.log(`  Executed: ${col}`);
                    } catch (e) {
                        // Ignore "Duplicate column name" error (Code 1060)
                        if (e.errno !== 1060) {
                            console.error(`  Failed: ${col} - ${e.message}`);
                        }
                    }
                }

                console.log(`Updated tbllocations for ${app.name}`);

            } catch (err) {
                console.error(`Error updating ${app.name}:`, err.message);
            } finally {
                await connection.end();
            }
        }

        console.log('All updates completed.');
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
};

updateLocationsTable();
