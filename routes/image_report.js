const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');

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
    
            let imageUrl, numObjects;

            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log(`Python script output: ${output}`);

                const matchObjects = output.match(/Number of detected objects: (\d+)/);
                numObjects = matchObjects ? parseInt(matchObjects[1]) : null;

                const matchUrl = output.match(/Cloudinary Image URL: (.+)/);
                imageUrl = matchUrl ? matchUrl[1] : null;
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python script error: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                console.log(`Python script exited with code ${code}`);

                if (imageUrl) {
                    const currentTime = admin.database.ServerValue.TIMESTAMP;
                    const imageStatus = numObjects > 0;
                    const manualAnnotationStatus = !imageStatus;
            
                    const updateData = {
                        imageUrl: imageUrl,
                        updaterUid: userId,
                        updateTime: currentTime,
                        detectedObjects: numObjects,
                        imageStatus: imageStatus,
                        manualAnnotationStatus: manualAnnotationStatus,
                        // manualAnnotatedImageUrl: "NO_URL",
                        // manualAnnotatedTime: "NO_TIME",
                        // annotaterUid: "NO_UID"
                    };
            
                    new Promise((resolve, reject) => {
                        const updateRef = admin.database().ref('Image Reports').push();
                        updateRef.set(updateData, (error) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    })
                    .then(() => {
                        let message = 'Image uploaded';
                        if (manualAnnotationStatus) {
                            message =  message + ",manual bounding box annotation required for activating image report."
                            console.log(message);
                        }
            
                        res.status(200).json({
                            status: 'success',
                            message: message,
                            imageUrl: imageUrl,
                            detectedObjects: numObjects,
                            manualAnnotationStatus: manualAnnotationStatus
                        });
                    })
                    .catch((error) => {
                        console.error('Error writing to Firebase:', error);
                        res.status(500).json({ status: 'error', message: 'Error writing to Firebase' });
                    });
                } else {
                    res.status(500).json({ status: 'error', message: 'Error uploading image to Cloudinary' });
                }
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