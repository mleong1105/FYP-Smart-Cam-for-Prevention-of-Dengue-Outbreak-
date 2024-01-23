const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const firebase = require('firebase/auth');
const axios = require('axios')

async function userExists(email) {
    try {
        await admin.auth().getUserByEmail(email);
        return true; 
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            return false; 
        } else {
            throw error; 
        }
    }
}

router.post('/accountlogin', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const userRecord = await admin.auth().getUserByEmail(email);

        const role = userRecord.customClaims && userRecord.customClaims.role ? userRecord.customClaims.role : "INVALID";

        if (role === 'INVALID') {
            res.status(401).json({ status: 'failure', message: 'Invalid account role' });
            return;
        }

        const userCredential = await firebase.signInWithEmailAndPassword(firebase.getAuth(), email, password)
        const user = userCredential.user;

        const userId = user.uid;
        const userSnapshot = await admin.database().ref(`Users/${userId}`).once('value');
        const userData = userSnapshot.val();

        // Authentication successful
        req.session.isAuthenticated = true;
        req.session.userRole = role; // Store user role in session
        res.json({ status: 'success', uid: userId, role: role, userData: userData });
    } catch (error) {
        console.error('Error authenticating user:', error.message);
        res.status(401).json({ status: 'failure', message: 'Invalid email or password' });
    }
});

router.post('/accountloginAP', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const userRecord = await admin.auth().getUserByEmail(email);

        // Assuming 'role' is a custom field in the user's profile
        const role = userRecord.customClaims && userRecord.customClaims.role ? userRecord.customClaims.role : "INVALID";

        if (role === 'INVALID' || ( role !== 'superadmin' && role !== 'admin')) {
            res.status(401).json({ status: 'failure', message: 'Invalid account role' });
            return;
        }

        const userCredential = await firebase.signInWithEmailAndPassword(firebase.getAuth(), email, password)
        const user = userCredential.user;
        const uid = user.uid;

        // Authentication successful
        req.session.isAuthenticated = true;
        req.session.userRole = role; // Store user role in session
        req.session.userId = uid
        res.json({ status: 'success', role: role});
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(401).json({ status: 'failure', message: 'Invalid email or password' });
    }
});

router.post('/accountsignup', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const firstName = req.body.firstName
    const lastName = req.body.lastName
    const birthday = req.body.birthday
    const coordinates = req.body.coordinates
    const role = req.body.role

    try {
        const userAlreadyExists = await userExists(email);

        if (userAlreadyExists) {
            res.status(400).json({ status: 'failure', message: 'User with this email already exists' });
            return;
        }

        if (role === 'user' || (req.userRole === 'superadmin' && role === 'admin')) {
            const userCredential = await firebase.createUserWithEmailAndPassword(firebase.getAuth(), email, password);
            const user = userCredential.user;
            const userId = user.uid;
    
            // Set custom claims for the user (e.g., role)
            await admin.auth().setCustomUserClaims(userId, { role: role });
    
            await admin.database().ref('Users/' + userId).set({
                email: email,
                firstName: firstName,
                lastName: lastName,
                birthday: birthday,
                coordinates: coordinates,
                role: role
            });
            const [latStr, longStr] = coordinates.split(', ');
            const lat = parseFloat(latStr);
            const long = parseFloat(longStr);

            const apiKey = 'AIzaSyApYzXx3126zpxJdnRSxo7r1EGZQbR2lG8';
            // const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
            const latlongapiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${apiKey}`;

            let formatted_address
            try {
                const response = await axios.get(latlongapiUrl);
                const results = response.data.results;

                if (results && results.length > 0) {
                    formatted_address = results[0].formatted_address
                } else {
                    console.error('No results found for the given location.');
                }
            } catch (error) {
                console.error('Error fetching data from Google Maps API:', error.message);
            }

            if (formatted_address) {
                const addrapiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formatted_address)}&key=${apiKey}`;
                try {
                    const response = await axios.get(addrapiUrl)
                    const results = response.data.results

                    if (results && results.length > 0) {
                        const country = getAddressComponent("country", response.data)
    
                        if (country === "Malaysia") {
                            let administrativeAreaLevel1 = getAddressComponent("administrative_area_level_1", response.data);
                            let locality = getAddressComponent("locality", response.data);
                            let route = getAddressComponent("route", response.data);
                            let newlat = results[0].geometry.location.lat
                            let newlong = results[0].geometry.location.lng
            
                            if (administrativeAreaLevel1 === "Wilayah Persekutuan Kuala Lumpur" || administrativeAreaLevel1 === "Federal Territory of Kuala Lumpur") {
                                administrativeAreaLevel1 = "Kuala Lumpur";
                            }

                            if (route === null) {
                                let sublocality = getAddressComponent("sublocality_level_1", response.data)
                                if (sublocality !== null) {
                                    route = sublocality
                                } else {
                                    route = locality
                                }
                            }
                            const sanitizedRoute = route.replace(/\//g, '_');
                            const databaseRef = admin.database().ref(`Location/${administrativeAreaLevel1}/${locality}/${sanitizedRoute}`).set({
                                name: formatted_address,
                                coordinateBU: `${newlat}, ${newlong}`
                            });
                            console.log('Database updated successfully.');
                            return res.json({ status: 'success' });
                        }
                        else {
                            console.log("We only support Malaysia location.")
                            return res.status(401).json({ status: 'failure', message: 'Only Malaysia Location' });
                        }
                    } else {
                        console.error('No results found for the given address.');
                        return res.status(402).json({ status: 'failure', message: 'No result found on given address' });
                    }
                } catch (error) {
                    console.error('Error fetching data from Google Maps API:', error.message);
                    return res.status(403).json({ status: 'failure', message: 'Error fetching data from Google Maps' });
                }
            } else {
                console.error('No results found for the given coordinates.');
                return res.status(404).json({ status: 'failure', message: 'No result found on coordinates' });
            }
        } else {
            console.log('Invalid role for signup account.');
            return res.status(405).json({ status: 'failure', message: 'Invalid role for signup' });
        }

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create user' });
    }
});

function getAddressComponent(type, addressDetails) {
    const result = addressDetails.results[0].address_components.find(component => component.types.includes(type));
    return result ? result.long_name : null;
}

module.exports = router;
