const firebase = require('firebase-admin')
const ip = require('ip')

// This is where we will store data about being online/offline.
const deviceStatusRef = firebase.database().ref(`/rpi-fatdan/connected`);

// We'll create two constants which we will write to 
// the Realtime database when this device is offline
// or online.
const isOfflineForDatabase = () => {
  return {
    state: "offline",
    last_changed: firebase.database.ServerValue.TIMESTAMP, 
    formattedTime: new Date().toString()
  }
};

const isOnlineForDatabase = () => {
  return {
    state: "online",
    last_changed: firebase.database.ServerValue.TIMESTAMP,
    formattedTime: new Date().toString(),
    ip: ip.address()
  }
};

// Create a reference to the special ".info/connected" path in 
// Realtime Database. This path returns `true` when connected
// and `false` when disconnected.
firebase.database().ref(".info/connected").on("value", function (snapshot) {
    console.log('[Presence] connected: ' + snapshot.val())
    // If we're not currently connected, don't do anything.
    if (snapshot.val() == false) {
        return;
    };

    // If we are currently connected, then use the 'onDisconnect()' 
    // method to add a set which will only trigger once this 
    // client has disconnected by closing the app, 
    // losing internet, or any other means.
    deviceStatusRef.onDisconnect().set(isOfflineForDatabase()).then(function () {
        // The promise returned from .onDisconnect().set() will
        // resolve as soon as the server acknowledges the onDisconnect() 
        // request, NOT once we've actually disconnected:
        // https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect

        // We can now safely set ourselves as "online" knowing that the
        // server will mark us as offline once we lose connection.
        deviceStatusRef.set(isOnlineForDatabase());
    });
});