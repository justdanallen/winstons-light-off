const { fork } = require('child_process');
const Wemo = require('wemo-client')
const wemo = new Wemo()


let client;
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
        client = wemo.client(msg.deviceInfo)
        client.on('binaryState', value => {
          console.log('[Winstons Light] Binary State changed to: %s', value);
        })

        resolve()
      }
    })
  })
}

function errorHandler( error ) {
  console.error( error )
}