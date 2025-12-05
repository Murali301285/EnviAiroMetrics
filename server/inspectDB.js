const mysql = require('mysql2/promise');
const { adminPool } = require('./config/db');
require('dotenv').config();

const inspectTable = async () => {
    try {
        // Get the first app to check its DB
        const [apps] = await adminPool.query('SELECT name, db_config FROM apps LIMIT 1');
        if (apps.length === 0) {
            console.log('No apps found.');
            return;
        }

        const app = apps[0];
        console.log(`Inspecting DB for app: ${app.name}`);

        let config = app.db_config;
        if (typeof config === 'string') config = JSON.parse(config);

        const connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database
        });

        const [columns] = await connection.query(`SHOW COLUMNS FROM tbllocations`);
        console.log('Columns in tbllocations:');
        columns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

inspectTable();
