const mysql2 = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const connection = mysql2.createPool({
  host: process.env.DB_HOST, // No default value, must be provided in .env
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port:process.env.PORT,
  database: process.env.DB_DATABASE,
  waitForConnections: true, 
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection to catch any immediate errors
connection.getConnection()
  .then(conn => {
    console.log('Successfully connected to the database.');
    conn.release(); // Release the connection back to the pool
  })
  .catch(err => {
    console.error('Error connecting to the database:', err.message);
});

module.exports = connection;
