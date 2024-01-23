require('dotenv').config();

const express = require('express');
const session = require('express-session')
const path = require('path');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const firebase = require("firebase/app");
const {checkSession} = require('./middleware/session.js')
const cron = require('node-cron');
const { weatherDataScrapingJob } = require('./middleware/scraping_data.js');
const cloudinary = require('cloudinary').v2;

const serviceAccount = require('./firebase/firebase-service-key.json');

const app = express();
const port = 5000;

app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'src/views')));
// app.set('views', path.join(__dirname, 'src/views'));
// app.engine('html', require('ejs').renderFile);
// app.set('view engine', 'html');

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      proxy: true,
      cookie: {
        // httpOnly: true,
        // secure: true,
        // sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24,
      }
    })
);
app.use(checkSession);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://dengueshield-default-rtdb.asia-southeast1.firebasedatabase.app/', // Replace with your database URL
});

const config = {
    apiKey: "AIzaSyCYcfKQn-qa77dG-N73nJe2JBpGEDO1-5E",
    authDomain: "dengueshield.firebaseapp.com",
    databaseURL: "https://dengueshield-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dengueshield",
    storageBucket: "dengueshield.appspot.com",
    messagingSenderId: "628193220247",
    appId: "1:628193220247:web:2b7bbbe115041de7337bd2",
    measurementId: "G-9YCV5RT8VT"
};
firebase.initializeApp(config);

cloudinary.config({
    cloud_name: 'dlogct9ex',
    api_key: '744349133114636',
    api_secret: 'z7dnO2LVYOlEHgAWO6Z3CMubbqk'
})

app.use((req, res, next) => {
    res.show = (name) => {
      res.sendFile(`/web/${name}`, {root: __dirname + '/src/views'});
    };
    next();
});

app.get('/navbar', function(req, res) {
    res.show('general/navbar.html');
})

app.get('/login', function(req, res) {
    if (req.isAuthenticated) {
        return res.redirect('/dashboard')
    }
    return res.show('general/login.html');
})

app.get('/dashboard', function(req, res) {
    res.show('general/dashboard.html');
})

app.get('/usermanagement', function(req, res) {
    res.show('usermanagement/usermanagement.html');
})

app.get('/imagereport', function(req, res) {
    res.show('imagereport/imagereport.html');
})

app.get('/api/time', (req, res) => {
    const currentTime = new Date().toLocaleString();
    res.json({ time: currentTime });
});

app.get('/api/tryapi', (req, res) => {
    weatherDataScrapingJob(admin);
    res.json({ status: "good" });
});

//Routes and API
//Routes - Login Authentication
app.use('/api/authenticate', require('./routes/authenticate'))

//Routes - Resource Management Search
app.use('/api/resourcemanage', require('./routes/resourcemanage'))

app.use('/api/predictionDcWeather', require('./routes/prediction_dc_weather.js'))

app.use('/api/imageReport', require('./routes/image_report'))

app.use('/api/usermanage', require('./routes/user_manage.js'))

app.get('/api/userSession', function(req, res) {
    const userId = req.userId;
    const userRole = req.userRole;
    const isAuthenticated = req.isAuthenticated

    res.json({ userId, userRole, isAuthenticated });
});

app.post('/api/userInfo', async(req, res) => {
    const userId = req.body.userId;
    try {
        const snapshot = await admin.database().ref(`Users/${userId}`).once('value');
        if(snapshot.exists()) {
            const data = snapshot.val()
            res.status(200).json({ data });
        }
    } catch(error) {
        res.status(404).json({ error: 'User not found' });
    }
});

app.post('/api/signout', (req, res) => {
    const isAuthenticated = req.isAuthenticated || false;
  
    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    admin.auth().revokeRefreshTokens(req.userId)
      .then(() => {
        req.session.isAuthenticated = false;
        req.session.userId = null;
        req.session.userRole = null;
        res.status(200).json({ message: 'Signout successful' });
      })
      .catch((error) => {
        console.error('Error during signout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      });
});

app.get('*', function(req, res) {
    res.redirect('/dashboard');
});

cron.schedule('0 16 * * *', async () => {
    await weatherDataScrapingJob(admin);
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
