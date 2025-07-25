const mysql = require('mysql2/promise');
const fs = require('fs');

// Read secret if using Podman secrets
const getPassword = () => {
  if (process.env.DB_PASSWORD_FILE) {
    return fs.readFileSync(process.env.DB_PASSWORD_FILE, 'utf8').trim();
  }
  return process.env.DB_PASSWORD;
};

module.exports = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: getPassword(),
  database: process.env.DB_NAME || 'taskmanager',
  connectTimeout: 10000,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : null
};