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
        const { appId, deviceId, fromDate, toDate } = req.query;

        if (!appId) {
            return res.status(400).json({ message: 'App ID is required' });
        }

        const appConfig = await getAppConfig(appId);
        const pool = createAppPool(appConfig);

        // Determine table name based on App (AQI uses tbldatareceiver, others use history)
        const isAqi = appConfig.database.toLowerCase() === 'aqi';
        const tableName = isAqi ? 'tbldatareceiver' : 'tbldatareceiverhistory';

        console.log(`[Dashboard] Using table: ${tableName} for App: ${appId}`);

        // 1. Fetch Raw Data (for table)
        let rawQuery = `
            SELECT id, deviceid, location, revText, receivedon 
            FROM ${tableName} 
            WHERE 1=1
        `;
        // Only check isDeleted if using history table (assuming raw table doesn't have it)
        if (!isAqi) {
            rawQuery += ` AND isDeleted = 0`;
        }

        const rawParams = [];

        if (deviceId) {
            rawQuery += ` AND deviceid = ?`;
            rawParams.push(deviceId);
        }

        console.log(`[Dashboard] Querying for Device: ${deviceId}, Date Range: ${fromDate} to ${toDate}`);

        if (fromDate && toDate) {
            rawQuery += ` AND receivedon BETWEEN ? AND ?`;
            rawParams.push(fromDate, toDate);
        }

        rawQuery += ` ORDER BY receivedon DESC LIMIT 1000`; // Limit for performance

        const [rawRows] = await pool.query(rawQuery, rawParams);
        console.log(`[Dashboard] Fetched ${rawRows.length} raw rows for App ${appId}`);

        // Process Raw Data
        const processedRawData = rawRows.map((row, index) => {
            let pir = 0;
            let nh3 = 0;
            let h2s_aqi = 0;
            let h2s_ppm = 0;

            if (index === 0) console.log('[Dashboard] Sample revText:', row.revText);

            try {
                if (row.revText) {
                    if (row.revText.trim().startsWith('{')) {
                        const parsed = JSON.parse(row.revText);
                        pir = parsed.PIR || 0;
                        nh3 = parsed.NH3 || 0;
                    } else {
                        const parts = row.revText.split(',');
                        parts.forEach(part => {
                            const [key, value] = part.split(':');
                            if (key && value) {
                                const k = key.trim();
                                const v = Number(value.trim());
                                if (k === 'PeopleCount') pir = v;
                                if (k === 'H2S_PPM') h2s_ppm = v;
                                if (k === 'H2S_AQI') h2s_aqi = v;
                            }
                        });
                    }
                }
                if (index === 0) console.log('[Dashboard] Parsed Sample:', { pir, nh3, h2s_ppm, h2s_aqi });
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
                revText: row.revText // Include raw data for debugging
            };
        });

        // 2. Fetch Hourly Aggregated Data
        let aggQuery = `
            SELECT deviceid, location, revText, receivedon 
            FROM ${tableName} 
            WHERE 1=1
        `;
        if (!isAqi) {
            aggQuery += ` AND isDeleted = 0`;
        }
        const aggParams = [];

        if (deviceId) {
            aggQuery += ` AND deviceid = ?`;
            aggParams.push(deviceId);
        }

        if (fromDate && toDate) {
            aggQuery += ` AND receivedon BETWEEN ? AND ?`;
            aggParams.push(fromDate, toDate);
        }

        const [aggRows] = await pool.query(aggQuery, aggParams);

        const hourlyMap = new Map();

        aggRows.forEach(row => {
            let pir = 0;
            let nh3 = 0;
            let h2s_aqi = 0;
            let h2s_ppm = 0;

            try {
                if (row.revText) {
                    if (row.revText.trim().startsWith('{')) {
                        const parsed = JSON.parse(row.revText);
                        pir = Number(parsed.PIR) || 0;
                        nh3 = Number(parsed.NH3) || 0;
                    } else {
                        const parts = row.revText.split(',');
                        parts.forEach(part => {
                            const [key, value] = part.split(':');
                            if (key && value) {
                                const k = key.trim();
                                const v = Number(value.trim());
                                if (k === 'PeopleCount') pir = v;
                                if (k === 'H2S_PPM') h2s_ppm = v;
                                if (k === 'H2S_AQI') h2s_aqi = v;
                            }
                        });
                    }
                }
            } catch (e) { return; }

            const date = new Date(row.receivedon);
            const timestamp = date.getTime();
            const dateStr = date.toISOString().split('T')[0];
            const hour = date.getHours();
            const key = `${row.deviceid}-${dateStr}-${hour}`;

            if (!hourlyMap.has(key)) {
                hourlyMap.set(key, {
                    deviceId: row.deviceid,
                    date: dateStr,
                    hour: hour,
                    location: row.location,
                    totalNh3: 0,
                    maxNh3: -Infinity,
                    minNh3: Infinity,
                    totalH2sAqi: 0,
                    totalH2sPpm: 0,
                    count: 0,
                    firstTime: Infinity,
                    lastTime: -Infinity,
                    firstPir: 0,
                    lastPir: 0
                });
            }

            const entry = hourlyMap.get(key);
            entry.totalNh3 += nh3;
            entry.maxNh3 = Math.max(entry.maxNh3, nh3);
            entry.minNh3 = Math.min(entry.minNh3, nh3);

            entry.totalH2sAqi += h2s_aqi;
            entry.totalH2sPpm += h2s_ppm;

            if (timestamp < entry.firstTime) {
                entry.firstTime = timestamp;
                entry.firstPir = pir;
            }
            if (timestamp > entry.lastTime) {
                entry.lastTime = timestamp;
                entry.lastPir = pir;
            }

            entry.count++;
        });

        const hourlyData = Array.from(hourlyMap.values()).map((d, index) => {
            let calculatedPir = d.lastPir - d.firstPir;
            if (calculatedPir < 0) calculatedPir = d.lastPir;

            if (index < 3) {
                console.log(`Hour: ${d.hour}, First: ${d.firstPir}, Last: ${d.lastPir}, Diff: ${calculatedPir}`);
            }

            return {
                slno: index + 1,
                deviceId: d.deviceId,
                date: d.date,
                hour: d.hour,
                location: d.location,
                avgNh3: d.count ? (d.totalNh3 / d.count).toFixed(2) : 0,
                minNh3: d.minNh3 === Infinity ? 0 : d.minNh3,
                maxNh3: d.maxNh3 === -Infinity ? 0 : d.maxNh3,
                avgH2sAqi: d.count ? (d.totalH2sAqi / d.count).toFixed(2) : 0,
                avgH2sPpm: d.count ? (d.totalH2sPpm / d.count).toFixed(2) : 0,
                totalPir: calculatedPir,
                hourLabel: `${String(d.hour).padStart(2, '0')}:00 - ${String(d.hour + 1).padStart(2, '0')}:00`
            };
        });

        hourlyData.sort((a, b) => {
            const dateA = new Date(`${a.date}T${String(a.hour).padStart(2, '0')}:00`);
            const dateB = new Date(`${b.date}T${String(b.hour).padStart(2, '0')}:00`);
            return dateA - dateB;
        });

        await pool.end();

        res.json({
            rawData: processedRawData,
            hourlyData
        });

    } catch (error) {
        console.error('[Dashboard] Error fetching data:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage,
            sql: error.sql
        });
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
};
