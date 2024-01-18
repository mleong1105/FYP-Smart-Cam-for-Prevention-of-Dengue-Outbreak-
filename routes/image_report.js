const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const axios = require('axios')

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

            const [latStr, longStr] = coordinates.split(', ');
            const lat = parseFloat(latStr);
            const long = parseFloat(longStr);
            let formatAddr, administrativeAreaLevel1, locality, sublocalityLevel1, country

            const apiKey = 'AIzaSyApYzXx3126zpxJdnRSxo7r1EGZQbR2lG8';
            const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${apiKey}`;
            try {
                const response = await axios.get(apiUrl);
                const results = response.data.results;
    
                if (results && results.length > 0) {
                    formatAddr = results[0].formatted_address;
                    country = getAddressComponent("country", response.data);
                    administrativeAreaLevel1 = getAddressComponent("administrative_area_level_1", response.data);
                    locality = getAddressComponent("locality", response.data);
                    sublocalityLevel1 = getAddressComponent("sublocality_level_1", response.data);

                    if (administrativeAreaLevel1 === "Wilayah Persekutuan Kuala Lumpur" || "Federal Territory of Kuala Lumpur") {
                        administrativeAreaLevel1 = "Kuala Lumpur";
                    }
                    valueNull = false;
                } else {
                    valueNull = true;
                    console.error('No results found for the given address.');
                }
            } catch (error) {
                valueNull = true;
                console.error('Error fetching data from Google Maps API:', error.message);
            }

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
                        coordinates: coordinates,
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
                        const updateRef = admin.database().ref(`Image Reports/${administrativeAreaLevel1}/${locality}/${sublocalityLevel1}`).push();
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
                            coordinates: coordinates,
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

function getAddressComponent(type, addressDetails) {
    const result = addressDetails.results[0].address_components.find(component => component.types.includes(type));
    return result ? result.long_name : null;
}

module.exports = router;