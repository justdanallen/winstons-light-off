const firebase = require('firebase-admin')
const { fork } = require('child_process')
const ping = require('ping')
const async = require('async')
const config = require('./config')
const secret = require('./secret')
const Wemo = require('wemo-client')
const wemo = new Wemo()


let client = null
const db = firebase.database()
const connectedRef = db.ref('/winstons-light/connected')
const deviceInfoRef = db.ref('/winstons-light/deviceInfo')
const errorRef = db.ref(secret.firebase.errorRef)

let binaryState = null
let command = null
let setBinaryStateTries = 0

exports.on = () => {
  const one = 1
  command = one.toString()
  setBinaryState('1')
}

exports.off = () => {
  const zero = 0
  command = zero.toString()
  setBinaryState('0')
}

/**
 * Sets the binary state of the wemo
 * @param {String} state 1 is on 0 is off
 */
function setBinaryState(state){
  if(client){
    // only change if the new state doesn't match the current state
    log('set state: ' + state + ' current binaryState: ' + binaryState)
    
    if(state !== binaryState){

      if(setBinaryStateTries < config.SET_STATE_MAX_RETRIES){
        logSetBinaryStateTry(state)
        client.setBinaryState(state, setBinaryStateCallback)
      } 

    }
  } else {
    errorHandler('notFound', {message: 'tried to set state before device is found'})
    log('no device found yet')
  }
}


function setBinaryStateCallback(err, state) {
  if(err){
    errorHandler('setBinaryState', err)
  }

  binaryState = state.BinaryState
  if(setBinaryStateTries > SET_STATE_NUM_RETRIES){
    getBinaryState()
  }

  // retry when the return state doesn't match the command
  if(state.BinaryState !== command) {
    setTimeout( ()=>{
      setBinaryState(command)
    }, SET_STATE_TIME_BETWEEN) 

  } else {
    setBinaryStateTries = 0
  }
}

function logSetBinaryStateTry(state){
  setBinaryStateTries++
  log('set binary state try: SET: ' + command + 
      ' CURRENT: ' + binaryState +
      ' TRIES: ' + setBinaryStateTries)
}

/**
 * Discover the wemo and set the client
 * used in discoveryLoop async.retry
 * @param {Callback} next next(err, result) 
 */
function singleDiscovery(next) {

  const discoverProcess = fork(__dirname + '/discover.js')
  
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
      binaryState = value
      log('Binary State changed to: ' + value);
    })
    
    client.on('error', err => {
      errorHandler('wemoClient', err)
    })
  }
  else{
    log('Setting wemo client: null')
    connectedRef.set(isNotConnectedMessage())
    deviceInfoRef.set(null)
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
        updateClient(null)
        reject(error)

      } else {
        // now that we found it, set the state to match FB
        console.log('found: ' + result.binaryState)
        binaryState = result.binaryState

        if(result.binaryState !== command){
          setBinaryState(command)
        }

        // set the wemo client
        updateClient(result)
        
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
 * Gets the binary state and addes it to the local variable
 * binaryState
 */
function getBinaryState(){
  if(client){
    client.getBinaryState( (err, state)=>{
      if(!err){
        // returns string: '1' or '0'
        binaryState = state
        log('Got current binary state: ' + binaryState)
        deviceInfoRef.update({binaryState: state})
      }
    })
  }
}

// poll for the current state
setInterval( () => {
  getBinaryState()
}, config.SYNC_BINARYSTATE_INTERVAL)

/** 
 * Pings the client until no response. When no response, it resets the client
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

/**
 * Pass errors up to firebase for debugging
 * @param {String} type Error type for firebase
 * @param {Object} err The error objec
 */
function errorHandler(type, err){
  let obj = {}
  obj[type] = {
    time: new Date().toString(),
    error: err.message
  }
  errorRef.update(obj)
  log('Error: ' + type + ' - ' + err.message)
}