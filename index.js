const firebase = require('firebase-admin')
const { fork } = require('child_process')
const winston = require('./winstonsLight')

const Wemo = require('wemo-client')
const wemo = new Wemo()

// variable to keep Winstons light
let winstonsLight = null
//discover()

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
  console.log(snapshot.val())
  //changWemoState(snapshot.val())
  const command = snapshot.val()
  if(command === 'on'){
    winston.on()
  }
  else if(command === 'off'){
    winston.off()
  }
});

function changWemoState(command){
  
  if(winstonsLight){
    const client = wemo.client(winstonsLight)
    if(command === 'on') {
      client.setBinaryState(1)
    }
    else if(command === 'off'){
      client.setBinaryState(0)
    }
  }
  else {
    console.log('Warning: winstonsLight is not defined')

    //try 3 times to discover
    discover().then((deviceInfo) => {
      const client = wemo.client(deviceInfo)
      client.setBinaryState();
    })

  }
}

// Discover the wemo
function discover() {
  return new Promise((resolve, reject) => {
    const discover = fork('discover.js')
    
    discover.on('message', (msg) => {
      if(msg.error) {
        console.log('Discover error: ' + msg.error)
        reject('device not found')
      }
      else {
        winstonsLight = msg.deviceInfo
        resolve(msg.deviceInfo)
      }
    })
  })
}
