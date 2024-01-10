const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { spawn } = require('child_process');
const path = require('path');
const cloudinary = require('cloudinary').v2;

router.post('/addImageReport', async (req, res) => {
    try {
        const location = req.body.location;
        const coordinates = req.body.coordinates;
        const username = req.body.username;
        const role = req.body.username;

        if (!location || !username || !role || !coordinates) {
            res.status(400).json({ status: 'error', message: 'Missing parameters.' });
            return;
        }

        const file = req.files.file;

        const scriptPath = path.join(__dirname, '../prediction_model/detectstatic.py');
        // Pipe the file stream directly to the Python script
        const pythonProcess = spawn('python', [scriptPath]);

        // Pipe the file stream to the Python script's stdin
        file.pipe(pythonProcess.stdin);

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python script output: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python script error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python script exited with code ${code}`);

            // Read the processed image from the Python script's stdout
            const processedImageBuffer = Buffer.from(file, 'binary');

            // Upload the processed image with bounding box to Cloudinary
            cloudinary.uploader.upload_stream({ resource_type: 'image' },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        res.status(500).json({ status: 'error', message: 'Error uploading image to Cloudinary' });
                        return;
                    }

                    // Extract the image URL from the Cloudinary response
                    const imageUrl = result.secure_url;

                    res.status(200).json({
                        status: 'success',
                        message: 'Image processed and uploaded to Cloudinary successfully.',
                        imageUrl: imageUrl,
                    });
                }
            ).end(processedImageBuffer);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;