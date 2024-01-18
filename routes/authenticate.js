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
        res.json({ status: 'success', role: role, userData: userData });
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

        if (role === 'INVALID' || role !== 'superadmin' || role !== 'admin') {
            res.status(401).json({ status: 'failure', message: 'Invalid account role' });
            return;
        }

        const userCredential = await firebase.signInWithEmailAndPassword(firebase.getAuth(), email, password)
        const user = userCredential.user;

        // Authentication successful
        req.session.isAuthenticated = true;
        req.session.userRole = role; // Store user role in session
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
    const address = req.body.address
    const role = req.body.role

    try {
        const userAlreadyExists = await userExists(email);

        if (userAlreadyExists) {
            res.status(400).json({ status: 'failure', message: 'User with this email already exists' });
            return;
        }

        if (role === 'user') {
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
                address: address,
                role: role
            });
            
            const apiKey = 'AIzaSyApYzXx3126zpxJdnRSxo7r1EGZQbR2lG8';
            const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
            axios.get(apiUrl)
            .then(response => {
                const results = response.data.results;
                if (results && results.length > 0) {
                    const country = getAddressComponent("country", response.data)

                    if (country === "Malaysia") {
                        const administrativeAreaLevel1 = getAddressComponent("administrative_area_level_1", response.data);
                        const locality = getAddressComponent("locality", response.data);
                        console.log(locality)
                        const sublocalityLevel1 = getAddressComponent("sublocality_level_1", response.data);
        
                        const databaseRef = admin.database().ref(`Location/${administrativeAreaLevel1}/${locality}`).set({
                            name: locality
                        });
                    }
                    else {
                        console.log("We only support Malaysia location.")
                    }
                } else {
                    console.error('No results found for the given address.');
                }
            })
            .catch(error => {
                console.error('Error fetching data from Google Maps API:', error.message);
            });
            console.log('Database updated successfully.');

        } else if ((role === 'superadmin' || role === 'admin') && req.body.uid) {
            const reqemail = req.body.reqemail

            const pendingAccountId = admin.database().ref('Pending Account').push().key;
            await admin.database().ref(`Pending Account/${pendingAccountId}`).set({
                email: email,
                firstName: firstName,
                lastName: lastName,
                birthday: birthday,
                address: address,
                role: role,
                reqemail: reqemail
            });

            console.log('Pending account added. Waiting for approval.');
        } else {
            console.log('Invalid role for signup account.');
        }

        res.json({ status: 'success' });
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
