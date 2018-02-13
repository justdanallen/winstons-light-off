const firebase = require('firebase-admin')
const { fork } = require('child_process')
const ping = require('ping')
const async = require('async')
const config = require('./config')
const Wemo = require('wemo-client')
const wemo = new Wemo()


let client = null
const connectedRef = firebase.database().ref('/winstons-light/connected')
const deviceInfoRef = firebase.database().ref('/winstons-light/deviceInfo')


exports.on = () => {
    if(client) {
      client.setBinaryState(1)
    }
    else {
      log('no device found yet')
    }
  }

exports.off = () => {
  if(client) {
    client.setBinaryState(0)
  }
  else {
      log('no device found yet')
  }
}



/**
 * Discover the wemo and set the client
 * used in discoveryLoop async.retry
 * @param {Callback} next next(err, result) 
 */
function singleDiscovery(next) {

  const discoverProcess = fork('discover.js')
  
  discoverProcess.on('message', (msg) => {
    if(msg.error) {
      setTimeout(() => {
        next('device not found')
      }, config.DISCOVERY_TIME_BETWEEN_RETRY)
    }
    else {
      next(null, msg.deviceInfo)
    }
  })

}

/**
 * A ghetto logger
 * @param {String or Object} msg 
 */
function log(msg) {
  //console.log('[WinstonsLight] ', arguments)
  if(typeof msg === 'object'){
    console.log('[WinstonsLight] ' + JSON.stringify(msg))    
  }
  else {
    console.log('[WinstonsLight] ' + msg)
  }
}



/**
 * Update's the global client variable
 * @param {Object} deviceInfo Info from wemo discovery
 */
function updateClient(deviceInfo){
  if(deviceInfo){
    log('Setting wemo client: ' + deviceInfo.host)
    
    client = wemo.client(deviceInfo)
    connectedRef.set(isConnectedMessage())
    deviceInfoRef.set(deviceInfo)
  
    client.on('binaryState', value => {
      log('Binary State changed to: ' + value);
    })
    
    client.on('error', err => {
      log(err)
    })
  }
  else{
    log('Setting wemo client: null')
    connectedRef.set(isNotConnectedMessage())
    deviceInfoRef = null
    client = null
  }

}

const isConnectedMessage = () => {
  return { 
    state: 'connected',
    last_change: firebase.database.ServerValue.TIMESTAMP, 
    formattedTime: new Date().toString()
  }
}

const isNotConnectedMessage = () => {
  return { 
    state: 'disconnected',
    last_change: firebase.database.ServerValue.TIMESTAMP, 
    formattedTime: new Date().toString()
  }
}

/**
 * A method that doesn't quit until the wemo is found! Does a singleDiscovery numTries
 * @param {number} numTries The number of times to run the loop
 * @return {Promise} A promise that resolves when the device is discovered 
 * or numTries is reached
 */
function discoveryLoop(numTries) {
  
  return new Promise((resolve, reject) => {
    async.retry(numTries, singleDiscovery, (error, result) => {
      if(error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })

}

/**
 * Performs a discoverlop then monitors the client for lost connection
 */
function discovery(){
  discoveryLoop(config.DISCOVERY_NUM_RETRIES)
  .then(function(deviceInfo){

    // start a ping loop keep going until device doesn't respond
    updateClient(deviceInfo)

    // // monitor client until lost
    let pingLoop = setInterval(function() { 

      //only ping when there is a client
      if(client !== null){
        //console.log(client.host)
        pinging()
      }

    }, config.PING_TIME_INTERVAL)
    
  })
  .catch(error => {
    log(`couldn't find the wemo`)
  })
}

// Do the initial Discovery
discovery()

// Set a loop to do regular discovery
setInterval( () => {
  
  // only discover when there is no client
  if(!client) {
    discovery()
  }

}, config.DISCOVERY_RETRY_TIME_INTERVAL)


/** 
 * Pings the client until no response. When now response, it resets the client
 * so that discover will start.
*/
function pinging(){

  let ipAddress = client.host
    
    ping.sys.probe(ipAddress, function(isAlive){ 

      log(`pinging: ${ipAddress}  result: ${isAlive}`)
      
      if(!isAlive){

        updateClient(null)
        
        //try one more ping
        setTimeout(() => {

            ping.sys.probe(ipAddress, function(secondIsAlive){

              log(`retry pinging: ${ipAddress}  result: ${isAlive}`)
              
              if(!secondIsAlive){
                // it's really dead!
                log('super dead')

              } else {
                // bring it back right away!
                discovery()
              }
            
            })

        }, config.PING_TIME_INTERVAL)
      } else {
        // notify alive
        connectedRef.set(isConnectedMessage())
      }
    })
}