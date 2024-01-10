require('dotenv').config();

const express = require('express');
const session = require('express-session')
const path = require('path');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const firebase = require("firebase/app");
const {checkSession} = require('./middleware/session.js')
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
      saveUninitialized: true
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
    res.show('general/login.html');
})

app.get('/dashboard', function(req, res) {
    res.show('general/dashboard.html');
})

app.get('/resourcemanage', function(req, res) {
    res.show('resourcemanage/resourcemanage.html');
})

app.get('/dronemanage', function(req, res) {
    res.show('dronemanage/dronemanage.html');
})

//Routes and API
//Routes - Login Authentication
app.use('/api/authenticate', require('./routes/authenticate'))

//Routes - Resource Management Search
app.use('/api/resourcemanage', require('./routes/resourcemanage'))

app.use('/api/exampleapi', require('./routes/exampleapi'))

app.use('/api/imageReport', require('./routes/image_report'))

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
