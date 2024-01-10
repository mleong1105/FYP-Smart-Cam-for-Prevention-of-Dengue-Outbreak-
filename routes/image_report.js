const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/addImageReport', upload.single('file'), async (req, res) => {
    try {
        const location = req.body.location;
        const coordinates = req.body.coordinates;
        const userId = req.body.userId;
        const userRole = req.body.userRole;

        if (!location || !userRole || !userId || !coordinates) {
            console.log(location, coordinates, userId, userRole)
            res.status(400).json({ status: 'error', message: 'Missing parameters.' });
            return;
        }

        if (userRole === 'admin' || userRole === 'superadmin') {
            const file = req.file;
    
            if (!file) {
                res.status(400).json({ status: 'error', message: 'File not provided.' });
                return;
            }

            const scriptPath = path.join(__dirname, '../YOLOv8/detectstatic.py');
            const pythonProcess = spawn('python', [scriptPath], { cwd: path.join(__dirname, '../YOLOv8') });
    
            pythonProcess.stdin.write(file.buffer);
            pythonProcess.stdin.end();
    
            // pythonProcess.stdout.on('data', (data) => {
            //     console.log(`Python script output: ${data}`);
            // });
    
            // pythonProcess.stderr.on('data', (data) => {
            //     console.error(`Python script error: ${data}`);
            // });
    
            pythonProcess.on('close', (code) => {
                console.log(`Python script exited with code ${code}`);
    
                // Read the processed image from the Python script's stdout
                const processedImageBuffer = file.buffer;
    
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
        }
        else {
            res.status(400).json({ status: 'error', message: 'Invalid account role' });
            return;
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;