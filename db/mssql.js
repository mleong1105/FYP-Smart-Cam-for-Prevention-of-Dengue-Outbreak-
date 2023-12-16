const sql = require('mssql');

// Create a pool to manage database connections
const pool = new sql.ConnectionPool({
  server: 'LAPTOP-7O0KC1KL',
  database: 'DengueAPP',
  user: 'MosquitoShield',
  password: 'abcd1234',
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    encrypt: true,
  },
});

// Event listener for successful connection
pool.on('poolCreated', () => {
  console.log('Connected to SQL Server database');
});

// Function to handle connection errors
pool.on('error', err => {
    console.error('SQL Server connection error:', err);
});

process.on('SIGINT', () => {
    // Close the connection pool
    pool.close((err) => {
      if (err) {
        console.error('Error closing connection pool:', err);
        process.exit(1); // Exit with an error status code
      } else {
        console.log('Connection pool closed');
        process.exit(0); // Exit with a success status code
      }
    });
});

module.exports = pool;