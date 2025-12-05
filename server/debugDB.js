const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkDB() {
    console.log('Connecting to DB...', process.env.DB_HOST);
    try {
        const connection = await mysql.createConnection({
            host: '97.74.92.23',
            user: 'root',
            password: 'My$2407#J',
            database: 'env_admin'
        });
        console.log('Connected successfully.');

        const [rows] = await connection.query('SELECT * FROM users');
        console.log('Users found:', rows.length);
        if (rows.length > 0) {
            console.log('First user:', rows[0].username);
            console.log('Role:', rows[0].role);
            console.log('Password hash:', rows[0].password);

            // Test password
            const isMatch = await bcrypt.compare('admin', rows[0].password);
            console.log('Password "admin" matches:', isMatch);
        } else {
            console.log('No users found. Seeding admin...');
            const hashedPassword = await bcrypt.hash('admin', 10);
            await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'admin']);
            console.log('Admin user seeded.');
        }

        await connection.end();
    } catch (error) {
        console.error('DB Error:', error);
    }
}

checkDB();
