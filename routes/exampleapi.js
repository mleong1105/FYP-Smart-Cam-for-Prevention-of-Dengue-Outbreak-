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

        const scriptPath = path.join(__dirname, '../prediction_model/final.py');
        exec(`python "${scriptPath}" ${location} ${username}`, (error, stdout, stderr) => {
            if (error) {
                console.error('Error executing script:', error);
                res.status(500).send('Error executing script:' + error);
                return;
            }

            try {
                const result = JSON.parse(stdout);
                result.img_url = [
                    'https://res.cloudinary.com/dlogct9ex/image/upload/v1702806574/image_report/detected_image2_yhmqxl.jpg', 
                    'https://res.cloudinary.com/dlogct9ex/image/upload/v1702807037/image_report/detected_image6_vol1cy.jpg', 
                    'https://res.cloudinary.com/dlogct9ex/image/upload/v1702807037/image_report/detected_image5_sol9fy.jpg', 
                    'https://res.cloudinary.com/dlogct9ex/image/upload/v1702807037/image_report/detected_image4_tyvaay.jpg',
                    'https://res.cloudinary.com/dlogct9ex/image/upload/v1702807035/image_report/detected_image3_zqk93d.jpg'
                ]

                res.status(200).json(result);
            } catch (jsonError) {
                console.error('Error parsing JSON:', jsonError);
                res.status(500).json({ status: 'error', message: 'Error parsing JSON response,' + jsonError, json: stdout });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;