const firebase = require('firebase-admin')
const { fork } = require('child_process')
const secret = require('./secret')


// set up Firebase
serviceAccount = require(secret.firebase.keyPath)

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: secret.firebase.url
});

// start after FB is set up
const presence = require('./presence')
const winston = require('./winstonsLight')

// As an admin, the app has access to read and write all data, regardless of Security Rules
const db = firebase.database()
const winstonsLightStateRef = db.ref(secret.firebase.deviceRef)


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
