# Description
A little project so I can turn a night lite off in my son's room. It is connected to an old Wemo. My Wemo is so old that it no longer worked with my wemo app. In fact it never worked reliable with the Wemo app, so I of course tried to patch something together for fun.

I'm using Firebase to act like a socket to control the Wemo over the local network. This code is meant to run on an RPi. 

There's also a firebase function that runs to watch to trigger on and off. I wired them up to a IFTTT function for a timed ON/OFF control.

## Why I'm proud of this
I know this is a super simple project and I could have easily bought something that did this for like $20, but is was good learning. I really tried to build this thing to be solid no matter of a power outage , netwok reliability, device lost power, etc. 

* DEVICE MONITORING: The code monitors the connection with the wemo using as little multicast network traffic as possible (multicast devices can be so chatty). The project instead uses light weight pings to track the status of the wemo and only triggers discovery when pings aren't resolving. 
* ENFORCES STATE: I spent a lot of time figuring out the best way to ensure the command is set on the Wemo. This includes retries and verifying the state took. I also did some polling to make sure the Wemo maintains state with what's on Firebase.
* FIREBASE CONSOLE: I use the FB console to monitor the status of the project. I can see when the service is currently running on the PI, the Wemo device connection status, the Wemo state, and any errors that may happen. 

# Deploying to the Pi
1. On the RPi, create a directory in the home folder called, SunDusk. Copy or pull the files to the RPi.
2. Install all the dependencies 
`npm install`
3. Install forever globally
`npm install forever -g`
4. Add this line to the `/etc/rc.local` folder:
`/usr/bin/sudo -u pi /usr/bin/forever start /home/pi/SunDuskLane/winstons-light-off/index.js`


