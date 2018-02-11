const firebase = require('firebase-admin')
const { fork } = require('child_process')
const winston = require('./winstonsLight')
const config = require('./secret/config')

// set up Firebase
serviceAccount = require(config.firebase.keyPath)

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: config.firebase.url
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
const db = firebase.database()
const winstonsLightStateRef = db.ref(config.firebase.deviceRef)


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
