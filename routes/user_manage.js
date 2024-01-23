const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const {checkAdminRole} = require('../middleware/checkadmin.js')

router.post('/searchuser', checkAdminRole, async (req, res) => {
  try {
    const email = req.body.email;
    const role = req.body.role;
    let userRecords;
    const listUsers = await admin.auth().listUsers();

    if (!role) {
      res.json({ status: 'fail', messsage: 'Require role params'})
    }

    userRecords = listUsers.users.filter(user => {
      const emailMatch = email ? user.email.toLowerCase().includes(email.toLowerCase()) : true;
      const roleMatch = role === "ALL" || (user.customClaims && user.customClaims.role === role);

      return emailMatch && roleMatch;
    });

    if (userRecords && userRecords.length > 0) {
      const users = [];

      for (const userRecord of userRecords) {
        const userId = userRecord.uid;
        const userSnapshot = await admin.database().ref(`/Users/${userId}`).once('value');
        const userData = userSnapshot.val();
        let deleteShow

        if (req.session.userRole === "superadmin" || (req.session.userRole === "admin" && userRecord.customClaims.role === "user")) {
          deleteShow = (userRecord.customClaims.role !== "superadmin") && (req.session.userId !== userId)
        } else {
          deleteShow = false
        }

        users.push({
          userId: userRecord.uid,
          email: userRecord.email,
          role: userRecord.customClaims.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          location: userData.coordinates,
          birthdate: userData.birthday,
          deleteShow: deleteShow
        });
      }

      res.json({ status: 'success', users: users });
    } else {
      res.json({ status: 'fail', message: 'No users found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

router.post('/edituser', checkAdminRole, async (req, res) => {
  try {
    const userId = req.body.userId;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const birthdate = req.body.birthdate;

    if (!userId || !firstName || !lastName || !birthdate) {
      return res.status(400).json({ status: 'fail', message: 'All fields are required' });
    }

    await admin.database().ref(`/Users/${userId}`).update({
      firstName: firstName,
      lastName: lastName,
      birthday: birthdate
    });

    res.json({ status: 'success', message: 'User information updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

router.post('/deleteuser', checkAdminRole, async (req, res) => {
  try {
    const userId = req.body.userId;
    const role = req.body.role

    // Validate input
    if (!userId || !role) {
        return res.status(400).json({ status: 'fail', message: 'Param is required' });
    }

    if (req.session.userRole === "superadmin" || (req.session.userRole === "admin" && role === "user")) {
      const validacc = (role !== "superadmin") || (req.session.userId !== userId)
      if (validacc) {
        await admin.auth().deleteUser(userId);
      }
      else {
        return res.status(401).json({ status: 'fail', message: 'Cannot delete own account or super admin account' });
      }
    } else {
      return res.status(402).json({ status: 'fail', message: 'Access denied' });
    }
    
    // Delete user from the Firebase Realtime Database
    await admin.database().ref(`/Users/${userId}`).remove();

    res.json({ status: 'success', message: 'User deleted successfully' });
} catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
}
});

module.exports = router;
