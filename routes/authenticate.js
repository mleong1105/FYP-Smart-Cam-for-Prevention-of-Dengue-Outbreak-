const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.post('/accountlogin', async (req, res) => {
    const Username = req.body.Username;
    const Password = req.body.Password;

    pool.connect().then(connection => {
        return connection.request()
            .input('Username', sql.NVarChar(50), Username)
            .input('Password', sql.NVarChar(100), Password)
            .execute('SP_AuthenticateUser')
            .then(result => {
                connection.release();

                const authenticated = result.recordset[0].Authenticated;

                if (authenticated === 1) {
                    // Authentication successful
                    req.session.isAuthenticated = true;
                    res.json({ status: 'success' });
                } else {
                    // Authentication failed
                    res.json({ status: 'failure', message: 'Invalid username or password' });
                }
            }).catch(error => {
                console.error('Error executing stored procedure:', error);
                connection.release();
                res.status(500).json({ status: 'error', message: 'Database internal error' });
            });
    })
    .catch(error => {
      console.error('Error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    });
});

module.exports = router;
