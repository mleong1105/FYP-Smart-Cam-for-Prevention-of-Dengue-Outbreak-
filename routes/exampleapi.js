const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { exec } = require('child_process');
const path = require('path');

router.post('/example', async (req, res) => {
    try {
        const location = req.body.location
        const username = req.body.username

        if (!location || !username) {
            res.status(400).json({ status: 'error', message: 'Missing parameters.' });
            return;
        }

        const scriptPath = path.join(__dirname, '../prediction_model/selenium_scrape/example.py');
        exec(`python "${scriptPath}" ${location} ${username}`, (error, stdout, stderr) => {
            if (error) {
                console.error('Error executing script:', error);
                res.status(500).send('Error executing script.');
                return;
            }

            try {
                const result = JSON.parse(stdout);
                res.status(200).json(result);
            } catch (jsonError) {
                console.error('Error parsing JSON:', jsonError);
                res.status(500).json({ status: 'error', message: 'Error parsing JSON response.' });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;