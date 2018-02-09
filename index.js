const firebase = require('firebase-admin')
const { fork } = require('child_process')
const winston = require('./winstonsLight')

// set up Firebase
serviceAccount = require('./key/Sun Dusk Lane-fd8663d61538.json')

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: 'https://sun-dusk-lane.firebaseio.com/'
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
const db = firebase.database()
const winstonsLightStateRef = db.ref('/winstons-light/state')


// This is where we handle the commands from firebase
winstonsLightStateRef.on('value', function(snapshot) {
  console.log('[Firebase] ' + snapshot.val())

  const command = snapshot.val()
  if(command === 'on'){
    winston.on()
  }
  else if(command === 'off'){
    winston.off()
  }
});
