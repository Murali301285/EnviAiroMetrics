const { adminPool, createAppPool } = require('./config/db');
require('dotenv').config();

const setupDatabase = async () => {
    try {
        // Get app config for the first app (assuming we are working with the first one for now)
        // In a real scenario, we might need to do this for all apps
        const [apps] = await adminPool.query('SELECT id, db_config FROM apps');

        for (const app of apps) {
            console.log(`Processing app ID: ${app.id}`);
            let config = app.db_config;
            if (typeof config === 'string') config = JSON.parse(config);

            const pool = createAppPool(config);

            // 1. Backfill existing data
            console.log('Backfilling lastdata_receivedon...');
            await pool.query(`
                UPDATE tbllocations l
                JOIN (
                    SELECT deviceid, MAX(receivedon) as max_received
                    FROM tbldatareceiverhistory
                    GROUP BY deviceid
                ) h ON l.deviceid = h.deviceid
                SET l.lastdata_receivedon = h.max_received
            `);
            console.log('Backfill complete.');

            // 2. Create Trigger
            console.log('Creating trigger...');
            // Drop if exists to avoid errors
            await pool.query('DROP TRIGGER IF EXISTS update_last_received');

            await pool.query(`
                CREATE TRIGGER update_last_received
                AFTER INSERT ON tbldatareceiverhistory
                FOR EACH ROW
                BEGIN
                    UPDATE tbllocations 
                    SET lastdata_receivedon = NEW.receivedon
                    WHERE deviceid = NEW.deviceid;
                END
            `);
            console.log('Trigger created successfully.');

            await pool.end();
        }

        console.log('All operations completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

setupDatabase();
