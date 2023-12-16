const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { exec } = require('child_process');
const path = require('path');

router.post('/example', async (req, res) => {
    try {
        const param1 = "testing"

        const scriptPath = path.join(__dirname, '../prediction_model/selenium_scrape/example.py');
        exec(`python "${scriptPath}" ${param1}`, (error, stdout, stderr) => {
            if (error) {
                console.error('Error executing script:', error);
                res.status(500).send('Error executing script.');
                return;
            }

            console.log('Script output:', stdout);
            res.status(200).send(stdout);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;