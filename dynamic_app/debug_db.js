const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'taskdb',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'taskmanager',
    connectTimeout: 10000
  };

  console.log('Testing connection with config:', { ...config, password: '****' });

  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connection successful!');
    const [rows] = await conn.query('SHOW DATABASES');
    console.log('Databases:', rows);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

testConnection();
