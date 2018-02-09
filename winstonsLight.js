const { fork } = require('child_process');
const Wemo = require('wemo-client')
const wemo = new Wemo()


let client
discover().catch(errorHandler)


exports.on = () => {
    if(client) {
      client.setBinaryState(1)
    }
    else {
      discover()
        .then( () => {
          client.setBinaryState(1)
        })
        .catch(errorHandler)
    }
  }

exports.off = () => {
  if(client) {
    client.setBinaryState(0)
  }
  else {
    discover()
      .then( () => {
        client.setBinaryState(0)
      })
      .catch(errorHandler)
  }
}

 // Discover the wemo and set the client
function discover() {
  return new Promise((resolve, reject) => {
    const discover = fork('discover.js')
    
    discover.on('message', (msg) => {
      if(msg.error) {
        console.log('Discover error: ' + msg.error)
        reject('device not found')
      }
      else {
        log('Setting client: ' + msg.deviceInfo.host)
        client = wemo.client(msg.deviceInfo)

        client.on('binaryState', value => {
          log('Binary State changed to: ' + value);
        })

        client.on('error', err => {
          log(err)
        })

        resolve()
      }
    })
  })
}

function handler(value) {
  log('Binary State changed to: ' + value);
}

function errorHandler( error ) {
  log(error)
}

function log(msg) {
  if(typeof msg === 'object'){
    console.log('[WinstonsLight] ' + JSON.stringify(msg))    
  }
  else {
    console.log('[WinstonsLight] ' + msg)
  }
}