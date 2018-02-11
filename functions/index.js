const functions = require('firebase-functions')
const admin = require('firebase-admin')
const compare = require('secure-compare')

admin.initializeApp(functions.config().firebase)
const rpiHookSecret = functions.config().rpihook.secret

exports.rpiHook = functions.https.onRequest((req, res) => {
  console.log('Incoming request: ', req.method)

  if(req.method === 'POST'){
    console.log('Request body: ', req.body)

    const command = req.body.command
    const secret = req.body.secret

    if(compare(rpiHookSecret, secret)) {
      
      const ref = admin.database().ref('/winstons-light/state')
      
      if(command === 'on'){
        ref.set('on')
        res.status(200).send('success')
      }
      else if(command === 'off'){
        ref.set('off')
        res.status(200).send('success')
      }
      else {
        console.log('Command unknown: ', command)
        res.status().send('bad request')
      }
    }
    else {
      console.log('Unauthorized request')
      res.status(403).send('not authorized')
    }

  }
  else{
    res.status(200).send('why hello there!')
  }

})