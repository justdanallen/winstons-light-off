/**
 * This file is meant to run in a forked process
 * so we can control the wemo discovery process
 * 
 * process exits once winstons light is found
 */
const config = require('./config')
const Wemo = require('wemo-client')
const wemo = new Wemo()

log('starting discovery')

// Discover the wemo
wemo.discover(function(value, deviceInfo) {
  //console.log(arguments); //had to check all the arguments
  if(deviceInfo) {
    log('Wemo Device Found: ' + deviceInfo.friendlyName)
   
    // check if it is winstons light
    if(deviceInfo.friendlyName === 'Winstons Light') {
      log('Found "Winstons Light": ' + deviceInfo.host)
      // send data about the wemo
      process.send({ deviceInfo })

      log('exiting')
      process.exit()
    }
  }
  else {
    log('no wemo found')
    process.send({error: 'no wemo found'})
    log('exiting')
    process.exit()
  }
})

// stop discovery after 10s
setTimeout( () => {
  log('Stopping discovery')
  process.send({error: 'timeout'})
  process.exit()
}, config.DISCOVER_TIME_PERIOD)

function log(msg) {
  console.log('[Discovery] ' + msg)
}