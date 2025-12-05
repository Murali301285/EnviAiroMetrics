const { adminPool, createAppPool } = require('../config/db');

const getAppConfig = async (appId) => {
    const [apps] = await adminPool.query('SELECT db_config FROM apps WHERE id = ?', [appId]);
    if (apps.length === 0) throw new Error('App not found');

    let config = apps[0].db_config;
    if (typeof config === 'string') {
        config = JSON.parse(config);
    }
    return config;
};

exports.getDashboardData = async (req, res) => {
    try {
        const { appId, deviceId, fromDate, toDate, limit } = req.query;

        if (!appId) {
            return res.status(400).json({ message: 'App ID is required' });
        }

        const appConfig = await getAppConfig(appId);
        const pool = createAppPool(appConfig);

        // Determine table name based on App (AQI uses tbldatareceiver, others use history)
        const isAqi = appConfig.database.toLowerCase() === 'aqi';
        const tableName = isAqi ? 'tbldatareceiver' : 'tbldatareceiverhistory';

        // Parse limit - default 1000, max 50000, or "all"
        let queryLimit = 1000;
        if (limit) {
            if (limit.toLowerCase() === 'all') {
                queryLimit = null; // No limit
            } else {
                const parsedLimit = parseInt(limit);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    queryLimit = Math.min(parsedLimit, 50000); // Cap at 50k for safety
                }
            }
        }

        let query = `
      SELECT id, deviceid, location, revText, receivedon 
      FROM ${tableName} 
      WHERE 1=1
    `;

        // Only check isDeleted if using history table
        if (!isAqi) {
            query += ` AND isDeleted = 0`;
        }

        const params = [];

        if (deviceId) {
            query += ` AND deviceid = ?`;
            params.push(deviceId);
        }

        if (fromDate && toDate) {
            query += ` AND receivedon BETWEEN ? AND ?`;
            params.push(fromDate, toDate);
        }

        query += ` ORDER BY receivedon DESC`;
        if (queryLimit !== null) {
            query += ` LIMIT ${queryLimit}`;
        }

        const [rows] = await pool.query(query, params);

        // Process Data
        const processedData = rows.map(row => {
            let pir = 0;
            let nh3 = 0;
            let h2s_aqi = 0;
            let h2s_ppm = 0;
            let category = '';

            try {
                if (row.revText) {
                    if (row.revText.trim().startsWith('{')) {
                        // JSON format
                        const parsed = JSON.parse(row.revText);
                        pir = parsed.PIR || 0;
                        nh3 = parsed.NH3 || 0;
                    } else {
                        // String format: "PeopleCount:38,H2S_PPM:0.62,H2S_AQI:79,Category:Satisfactory,"
                        const parts = row.revText.split(',');
                        parts.forEach(part => {
                            const [key, value] = part.split(':');
                            if (key && value) {
                                const k = key.trim();
                                const v = value.trim();
                                if (k === 'PeopleCount') pir = Number(v);
                                if (k === 'H2S_PPM') h2s_ppm = Number(v);
                                if (k === 'H2S_AQI') h2s_aqi = Number(v);
                                if (k === 'NH3') nh3 = Number(v);
                                if (k === 'Category') category = v;
                            }
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing revText:', row.revText);
            }

            return {
                id: row.id,
                deviceId: row.deviceid,
                location: row.location,
                receivedOn: row.receivedon,
                pir,
                nh3,
                h2s_aqi,
                h2s_ppm,
                category,
                revText: row.revText
            };
        });

        // Calculate Hourly Aggregation
        // Group by Date-Hour
        const hourlyMap = new Map();

        processedData.forEach(d => {
            const date = new Date(d.receivedOn);
            const dateStr = date.toISOString().split('T')[0];
            const hour = date.getHours();
            const key = `${d.deviceId}-${dateStr}-${hour}`;

            if (!hourlyMap.has(key)) {
                hourlyMap.set(key, {
                    deviceId: d.deviceId,
                    date: dateStr,
                    hour: hour,
                    location: d.location,
                    totalNh3: 0,
                    maxNh3: -Infinity,
                    minNh3: Infinity,
                    count: 0,
                    totalPir: 0
                });
            }

            const entry = hourlyMap.get(key);
            entry.totalNh3 += d.nh3;
            entry.maxNh3 = Math.max(entry.maxNh3, d.nh3);
            entry.minNh3 = Math.min(entry.minNh3, d.nh3);
            entry.totalPir += d.pir;
            entry.count++;
        });

        const hourlyData = Array.from(hourlyMap.values()).map((d, index) => ({
            slno: index + 1,
            ...d,
            avgNh3: d.count ? (d.totalNh3 / d.count).toFixed(4) : 0,
            hourLabel: `${d.hour}:00 - ${d.hour + 1}:00`
        }));

        await pool.end(); // Close connection

        res.json({
            rawData: processedData,
            hourlyData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching data' });
    }
};

exports.getDevices = async (req, res) => {
    try {
        const { appId } = req.query;
        if (!appId) {
            return res.status(400).json({ message: 'App ID is required' });
        }

        const appConfig = await getAppConfig(appId);
        const pool = createAppPool(appConfig);

        const [rows] = await pool.query('SELECT deviceid, location FROM tbllocations WHERE isDeleted = 0');
        await pool.end();
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching devices' });
    }
};
