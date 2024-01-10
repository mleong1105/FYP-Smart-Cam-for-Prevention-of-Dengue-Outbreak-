const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const firebase = require('firebase/auth');

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

        // Assuming 'role' is a custom field in the user's profile
        const role = userRecord.customClaims && userRecord.customClaims.role ? userRecord.customClaims.role : "INVALID";

        if (role === 'INVALID') {
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

    try {
        const userAlreadyExists = await userExists(email);

        if (userAlreadyExists) {
            res.status(400).json({ status: 'failure', message: 'User with this email already exists' });
            return;
        }

        const userCredential = await firebase.createUserWithEmailAndPassword(firebase.getAuth(), email, password);
        const user = userCredential.user;
        const userId = user.uid;

        // Set custom claims for the user (e.g., role)
        await admin.auth().setCustomUserClaims(userId, { role: 'user' });
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create user' });
    }
});

router.post('/accountsignupAP', async (req, res) => {
    const email = req.body.email;
    const userRole = req.body.userId;

    try {
        if (userRole === 'superadmin') {
            const userAlreadyExists = await userExists(email);

            if (userAlreadyExists) {
                res.status(400).json({ status: 'failure', message: 'User with this email already exists' });
                return;
            }    
            const userCredential = await firebase.createUserWithEmailAndPassword(firebase.getAuth(), email, password);
            const user = userCredential.user;
            const userId = user.uid;
    
            // Set custom claims for the user (e.g., role)
            await admin.auth().setCustomUserClaims(userId, { role: 'admin' });
            
            res.json({ status: 'success' });
        }
        else {
            res.status(401).json({ status: 'failure', message: 'Invalid account role' });
            return;
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create user' });
    }
});

module.exports = router;
