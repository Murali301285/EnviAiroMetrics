require('dotenv').config();
const { adminPool } = require('./config/db');
const mysql = require('mysql2/promise');

(async () => {
    try {
        // Get AQI app config
        const [apps] = await adminPool.query('SELECT db_config FROM apps WHERE id = 2');
        if (apps.length === 0) {
            console.log('App with ID 2 not found');
            process.exit(1);
        }

        let config = apps[0].db_config;
        if (typeof config === 'string') {
            config = JSON.parse(config);
        }
        console.log('AQI DB Config:', {
            host: config.host,
            user: config.user,
            database: config.database,
            hasPassword: !!config.password
        });

        // Connect to AQI database
        const pool = mysql.createPool(config);

        // Show tables
        const [tables] = await pool.query('SHOW TABLES');
        console.log('\nTables in aqi DB:', tables.map(t => Object.values(t)[0]));

        // Check if tbldatareceiver exists
        const hasDataReceiver = tables.some(t => Object.values(t)[0] === 'tbldatareceiver');

        if (hasDataReceiver) {
            // Describe tbldatareceiver
            const [cols] = await pool.query('DESCRIBE tbldatareceiver');
            console.log('\ntbldatareceiver columns:');
            cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));

            // Count rows
            const [count] = await pool.query('SELECT COUNT(*) as cnt FROM tbldatareceiver');
            console.log('\nTotal rows in tbldatareceiver:', count[0].cnt);

            // Get sample row
            const [sample] = await pool.query('SELECT * FROM tbldatareceiver LIMIT 1');
            if (sample.length > 0) {
                console.log('\nSample row:');
                console.log(sample[0]);
            }
        } else {
            console.log('\nTable tbldatareceiver NOT FOUND!');
        }

        await pool.end();
        await adminPool.end();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        console.error('SQL Message:', e.sqlMessage || 'N/A');
        process.exit(1);
    }
})();
