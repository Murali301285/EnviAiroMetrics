const bcrypt = require('bcryptjs');
const { adminPool } = require('../config/db');

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const [users] = await adminPool.query(`
            SELECT u.id, u.username, u.role, u.is_active, u.remarks, u.created_at, 
            GROUP_CONCAT(a.name) as app_names,
            GROUP_CONCAT(a.id) as app_ids
            FROM users u
            LEFT JOIN user_access ua ON u.id = ua.user_id
            LEFT JOIN apps a ON ua.app_id = a.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        // Format the result
        const formattedUsers = users.map(user => ({
            ...user,
            assignedApps: user.app_ids ? user.app_ids.split(',').map(Number) : [],
            appNames: user.app_names ? user.app_names.split(',') : []
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// Get apps (all for admin, assigned for user)
exports.getApps = async (req, res) => {
    try {
        const { role, id: userId } = req.user;

        let query = 'SELECT id, name, description, db_config FROM apps';
        let params = [];

        if (role !== 'admin') {
            query = `
                SELECT a.id, a.name, a.description, a.db_config 
                FROM apps a
                JOIN user_access ua ON a.id = ua.app_id
                WHERE ua.user_id = ?
            `;
            params = [userId];
        }

        const [apps] = await adminPool.query(query, params);
        res.json(apps);
    } catch (error) {
        console.error('Error fetching apps:', error);
        res.status(500).json({ message: 'Error fetching apps' });
    }
};

// Create a new user
exports.createUser = async (req, res) => {
    const { username, password, role, assignedApps, remarks } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    let connection;
    try {
        connection = await adminPool.getConnection();
        await connection.beginTransaction();

        // Check if user exists
        const [existing] = await connection.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            await connection.release();
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role || 'user';

        const [result] = await connection.query(
            'INSERT INTO users (username, password, role, is_active, remarks) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, userRole, true, remarks || '']
        );
        const userId = result.insertId;

        if (assignedApps && assignedApps.length > 0) {
            const values = assignedApps.map(appId => [userId, appId]);
            await connection.query('INSERT INTO user_access (user_id, app_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    } finally {
        if (connection) connection.release();
    }
};

// Update a user
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, password, role, assignedApps, is_active, remarks } = req.body;

    let connection;
    try {
        connection = await adminPool.getConnection();
        await connection.beginTransaction();

        // Update user details
        let query = 'UPDATE users SET username = ?, role = ?, is_active = ?, remarks = ?';
        let params = [username, role, is_active, remarks || ''];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await connection.query(query, params);

        // Update assigned apps (delete all and re-insert)
        await connection.query('DELETE FROM user_access WHERE user_id = ?', [id]);

        if (assignedApps && assignedApps.length > 0) {
            const values = assignedApps.map(appId => [id, appId]);
            await connection.query('INSERT INTO user_access (user_id, app_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    } finally {
        if (connection) connection.release();
    }
};

// Delete a user
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        await adminPool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

// Create a new app
exports.createApp = async (req, res) => {
    const { name, description, dbConfig } = req.body;

    if (!name || !dbConfig) {
        return res.status(400).json({ message: 'Name and DB Config are required' });
    }

    try {
        const dbConfigStr = JSON.stringify(dbConfig);
        await adminPool.query('INSERT INTO apps (name, description, db_config) VALUES (?, ?, ?)', [name, description, dbConfigStr]);
        res.status(201).json({ message: 'App created successfully' });
    } catch (error) {
        console.error('Error creating app:', error);
        res.status(500).json({ message: 'Error creating app' });
    }
};

// Update an app
exports.updateApp = async (req, res) => {
    const { id } = req.params;
    const { name, description, dbConfig } = req.body;

    try {
        const dbConfigStr = JSON.stringify(dbConfig);
        await adminPool.query('UPDATE apps SET name = ?, description = ?, db_config = ? WHERE id = ?', [name, description, dbConfigStr, id]);
        res.json({ message: 'App updated successfully' });
    } catch (error) {
        console.error('Error updating app:', error);
        res.status(500).json({ message: 'Error updating app' });
    }
};

// Delete an app
exports.deleteApp = async (req, res) => {
    const { id } = req.params;

    try {
        await adminPool.query('DELETE FROM apps WHERE id = ?', [id]);
        res.json({ message: 'App deleted successfully' });
    } catch (error) {
        console.error('Error deleting app:', error);
        res.status(500).json({ message: 'Error deleting app' });
    }
};
