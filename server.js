require('dotenv').config();

const express = require('express');
const session = require('express-session')
const path = require('path');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const {checkSession} = require('./middleware/session.js')

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

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
