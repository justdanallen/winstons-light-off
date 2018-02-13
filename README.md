# Description
A little project so I can turn a night lite off in my son's room. It is connected to an old Wemo.

I'm using Firebase to act like a socket to control the Wemo over the local network. This code is meant to run on an RPi.

# Deploying to the Pi
1. On the RPi, create a directory in the home folder called, SunDusk. Copy or pull the files to the RPi.
2. Install all the dependencies 
`npm install`
3. Install forever globally
`npm install forever -g`
4. Add this line to the `/etc/rc.local` folder:
`/usr/bin/sudo -u pi /usr/bin/forever start /home/pi/SunDuskLane/index.js`


# TODO:
1. Test how discovery works when wemo isn't found (done)
2. Add logging to firebase for remote management, look at winston logger (done)
3. Add firebase function for controlling (done)
4. Look at adding npm package 'ping' (done)
5. Add status monitoring to FB for PI and Wemo (done)
6. Add webhook for installing new SW
7. Load to pie (done)
8. Upload repo to GitHub

Add queue to make sure FB commands get implemented?

