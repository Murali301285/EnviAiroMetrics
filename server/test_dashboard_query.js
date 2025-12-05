require('dotenv').config();
const { adminPool } = require('./config/db');
const mysql = require('mysql2/promise');

(async () => {
    try {
        const [apps] = await adminPool.query('SELECT db_config FROM apps WHERE id = 2');
        let config = apps[0].db_config;
        if (typeof config === 'string') {
            config = JSON.parse(config);
        }

        const pool = mysql.createPool(config);

        // This is the EXACT query from dashboardController.js
        const deviceId = 'ESP32_H2S_DEVICE1';
        const fromDate = '2025-12-04T00:00';
        const toDate = '2025-12-04T23:59';

        const tableName = 'tbldatareceiver';

        let rawQuery = `
            SELECT id, deviceid, location, revText, receivedon 
            FROM ${tableName} 
            WHERE 1=1
        `;

        const rawParams = [];

        if (deviceId) {
            rawQuery += ` AND deviceid = ?`;
            rawParams.push(deviceId);
        }

        if (fromDate && toDate) {
            rawQuery += ` AND receivedon BETWEEN ? AND ?`;
            rawParams.push(fromDate, toDate);
        }

        rawQuery += ` ORDER BY receivedon DESC LIMIT 1000`;

        console.log('Executing query:', rawQuery);
        console.log('Parameters:', rawParams);

        const [rows] = await pool.query(rawQuery, rawParams);
        console.log(`\nFetched ${rows.length} rows`);

        if (rows.length > 0) {
            console.log('\nFirst row:', rows[0]);
            console.log('\nrevText format:', rows[0].revText);
            console.log('\nParsing test:');
            const parts = rows[0].revText.split(',');
            parts.forEach(part => {
                const [key, value] = part.split(':');
                if (key && value) {
                    console.log(`  ${key.trim()} = ${value.trim()}`);
                }
            });
        }

        await pool.end();
        await adminPool.end();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        console.error('SQL Message:', e.sqlMessage || 'N/A');
        console.error('Stack:', e.stack);
        process.exit(1);
    }
})();
