const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const saltRounds = 10;
const secretKey = process.env.SECRET_KEY || 'your_super_secret_key';

// MariaDB Connection Pool
const pool = mysql.createPool({
  host: "localhost", // Always use container hostname
  port: 3306,
  user: 'root',
  password: process.env.DB_PASSWORD, // Must be set in .env
  database: process.env.DB_NAME || 'taskmanager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: false
});

// Store the hashed password
let passwordHash = '';
bcrypt.hash('142305', saltRounds, (err, hash) => {
    if (err) console.error('Error hashing password:', err);
    else {
        passwordHash = hash;
        console.log('Password hashed and ready.');
    }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Database initialization and migration
async function initializeDatabase() {
  try {
    // Check MariaDB connection
    console.log('Attempting to get a connection from the pool...');
    const conn = await pool.getConnection();
    console.log('Successfully got a connection.');
    await conn.ping();
    console.log('Successfully pinged the database.');
    conn.release();
    console.log('Connection released. Connected to MariaDB database.');

    // Create tasks table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE,
        time TIME,
        people TEXT,
        location TEXT,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        repeat_type VARCHAR(50),
        repeat_interval INT,
        repeat_days TEXT,
        repeat_occurrences INT
      )`);

    // Verify tables exist and are ready
    const [tables] = await pool.query("SHOW TABLES LIKE 'tasks'");
    if (!tables.length) {
      console.log('Tasks table not found, creating new one');
      await pool.query(`
        CREATE TABLE tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          date DATE,
          time TIME,
          people TEXT,
          location TEXT,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          repeat_type VARCHAR(50),
          repeat_interval INT,
          repeat_days TEXT,
          repeat_occurrences INT
        )`);
    }
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

// Wrap initialization in async IIFE
(async () => {
  try {
    await initializeDatabase();
    app.listen(port, () => {
        console.log(`Task list app listening at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Application startup failed:', err);
    process.exit(1);
  }
})();

// Authentication routes (unchanged)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    bcrypt.compare(password, passwordHash, (err, result) => {
        if (result) {
            const token = jwt.sign({ loggedIn: true }, secretKey, { expiresIn: '14d' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Incorrect password' });
        }
    });
});

// Middleware (unchanged)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes updated for MariaDB
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM tasks WHERE date = ? ORDER BY time',
            [req.query.date]
        );
        res.json({ tasks: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/tasks', authenticateToken, async (req, res) => {
    const { name, date, time, people, location, repeat, repeat_frequency, repeat_count } = req.body;
    if (!name) return res.status(400).json({ error: 'Task name is required.' });

    let dates = [date];
    if (repeat) {
        const startDate = new Date(date);
        const numRepeats = parseInt(repeat_count, 10);
        // Date generation logic unchanged
    }

    try {
        for (const taskDate of dates) {
            await pool.query(
                `INSERT INTO tasks (name, date, time, people, location) VALUES (?, ?, ?, ?, ?)`,
                [name, taskDate, time, people, location]
            );
        }
        res.json({ message: `Task "${name}" added successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE tasks SET completed = ? WHERE id = ?',
            [req.body.completed, req.params.id]
        );
        res.json({ updated: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM tasks WHERE id = ?',
            [req.params.id]
        );
        res.json({ deleted: result.affectedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
