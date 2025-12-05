const { adminPool, createAppPool } = require('../config/db');

// Helper to get app config
const getAppConfig = async (appId) => {
    const [apps] = await adminPool.query('SELECT db_config FROM apps WHERE id = ?', [appId]);
    if (apps.length === 0) throw new Error('App not found');

    let config = apps[0].db_config;
    if (typeof config === 'string') {
        config = JSON.parse(config);
    }
    return config;
};

exports.getLocations = async (req, res) => {
    try {
        console.log('[getLocations] Called with query:', req.query);
        const { appId, configured, active } = req.query;
        if (!appId) return res.status(400).json({ message: 'App ID is required' });

        const appConfig = await getAppConfig(appId);
        console.log(`[getLocations] App Config DB: ${appConfig.database}`);
        const pool = createAppPool(appConfig);

        // --- Sync Logic: Update tbllocations from tbldatareceiver ---
        try {
            console.log('[getLocations] Syncing devices from tbldatareceiver...');
            // Get latest data for each device
            const [latestData] = await pool.query(`
                SELECT deviceid, MAX(receivedon) as last_received 
                FROM tbldatareceiver 
                GROUP BY deviceid
            `);

            if (latestData.length > 0) {
                // Prepare bulk operations or loop (loop is safer for now)
                for (const row of latestData) {
                    if (!row.deviceid) continue;

                    // Upsert: Insert if new, Update last_received if exists
                    // Note: We don't update 'location' or 'isDeleted' on duplicate, only timestamp
                    await pool.query(`
                        INSERT INTO tbllocations (deviceid, location, isDeleted, lastdata_receivedon)
                        VALUES (?, ?, 0, ?)
                        ON DUPLICATE KEY UPDATE lastdata_receivedon = ?
                    `, [row.deviceid, row.deviceid, row.last_received, row.last_received]);
                }
                console.log(`[getLocations] Synced ${latestData.length} devices.`);
            } else {
                console.log('[getLocations] No data found in tbldatareceiver to sync.');
            }
        } catch (syncError) {
            console.error('[getLocations] Sync Error (Non-fatal):', syncError.message);
            // Continue fetching locations even if sync fails (e.g., table missing)
        }
        // -------------------------------------------------------------

        // Standard Query (tbllocations)
        let query = `
            SELECT 
                l.id, l.deviceid, l.location, l.fulladdress, l.remarks, l.isDeleted, 
                l.isConfigured, l.ConfiguredOn, l.Sensor,
                l.lastdata_receivedon as last_received
            FROM tbllocations l
            WHERE 1=1
        `;

        const params = [];

        if (active === 'Active') {
            query += ' AND l.isDeleted = 0';
        }

        if (configured === 'Yes') {
            query += ' AND l.isConfigured = 1';
        } else if (configured === 'No') {
            query += ' AND (l.isConfigured = 0 OR l.isConfigured IS NULL)';
        }

        query += ' ORDER BY l.id DESC';

        console.log('[getLocations] Executing query:', query);

        const [locations] = await pool.query(query, params);
        await pool.end();

        console.log(`[getLocations] Fetched ${locations.length} locations`);

        // Map DB columns to frontend expected format
        const mappedLocations = locations.map(loc => ({
            ...loc,
            full_address: loc.fulladdress || '',
            is_configured: loc.isConfigured === 1 || loc.isConfigured === true,
            configured_on: loc.ConfiguredOn,
            sensor_type: loc.Sensor
        }));

        res.json(mappedLocations);
    } catch (error) {
        console.error('[getLocations] Error fetching locations:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
        res.status(500).json({ message: 'Error fetching locations: ' + error.message });
    }
};

exports.createLocation = async (req, res) => {
    try {
        const { appId, deviceId, location, fullAddress, remarks, isConfigured, sensorType } = req.body;
        if (!appId || !deviceId || !location) {
            return res.status(400).json({ message: 'App ID, Device ID, and Location are required' });
        }

        const appConfig = await getAppConfig(appId);
        const pool = createAppPool(appConfig);

        // Check uniqueness
        const [existing] = await pool.query('SELECT id FROM tbllocations WHERE deviceid = ? AND isDeleted = 0', [deviceId]);
        if (existing.length > 0) {
            await pool.end();
            return res.status(400).json({ message: 'Device ID already exists' });
        }

        const configuredOn = isConfigured ? new Date() : null;

        await pool.query(
            'INSERT INTO tbllocations (deviceid, location, fulladdress, remarks, isConfigured, ConfiguredOn, Sensor, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            [deviceId, location, fullAddress || '', remarks || '', isConfigured ? 1 : 0, configuredOn, sensorType || '']
        );
        await pool.end();

        res.status(201).json({ message: 'Location created successfully' });
    } catch (error) {
        console.error('Error creating location:', error);
        res.status(500).json({ message: 'Error creating location' });
    }
};

exports.updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { appId, location, fullAddress, remarks, isConfigured, sensorType } = req.body;

        if (!appId || !location) {
            return res.status(400).json({ message: 'App ID and Location are required' });
        }

        const appConfig = await getAppConfig(appId);
        const pool = createAppPool(appConfig);

        // Check if config status changed to set date
        let configuredOn = null;
        if (isConfigured) {
            const [current] = await pool.query('SELECT isConfigured, ConfiguredOn FROM tbllocations WHERE id = ?', [id]);
            if (current.length > 0) {
                if (!current[0].isConfigured) {
                    configuredOn = new Date(); // Set to now if newly configured
                } else {
                    configuredOn = current[0].ConfiguredOn; // Keep existing date
                }
            }
        }

        await pool.query(
            'UPDATE tbllocations SET location = ?, fulladdress = ?, remarks = ?, isConfigured = ?, ConfiguredOn = ?, Sensor = ? WHERE id = ?',
            [location, fullAddress || '', remarks || '', isConfigured ? 1 : 0, configuredOn, sensorType || '', id]
        );
        await pool.end();

        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ message: 'Error updating location' });
    }
};

exports.deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { appId } = req.query;

        if (!appId) return res.status(400).json({ message: 'App ID is required' });

        const appConfig = await getAppConfig(appId);
        const pool = createAppPool(appConfig);

        // Soft delete
        await pool.query('UPDATE tbllocations SET isDeleted = 1 WHERE id = ?', [id]);
        await pool.end();

        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        console.error('Error deleting location:', error);
        res.status(500).json({ message: 'Error deleting location' });
    }
};
