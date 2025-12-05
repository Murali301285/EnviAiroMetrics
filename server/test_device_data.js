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

        // Get distinct device IDs
        const [devices] = await pool.query('SELECT DISTINCT deviceid FROM tbldatareceiver LIMIT 20');
        console.log('Device IDs in tbldatareceiver:', devices.map(d => d.deviceid));

        // Check for ESP32_H2S_DEVICE1
        const [esp32Data] = await pool.query('SELECT * FROM tbldatareceiver WHERE deviceid = ? ORDER BY receivedon DESC LIMIT 5', ['ESP32_H2S_DEVICE1']);
        console.log(`\nRows for ESP32_H2S_DEVICE1: ${esp32Data.length}`);
        if (esp32Data.length > 0) {
            console.log('Latest row:', esp32Data[0]);
        }

        // Check for any device with recent data
        const [recent] = await pool.query('SELECT * FROM tbldatareceiver WHERE receivedon >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY receivedon DESC LIMIT 5');
        console.log(`\nRecent rows (last 7 days): ${recent.length}`);
        if (recent.length > 0) {
            console.log('Sample recent row:', recent[0]);
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
