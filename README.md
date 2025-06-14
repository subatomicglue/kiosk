# media kiosk

 - **Audio Player** - index.html - a demo showing a plex-like or spotify-like playlist with playlist and now-playing controls all acting on a central JukeBoxPlayer

 - **Mantis Seq** - midi.html - a demo showing midi sequencing in the browser, for controllking softsynth or external midigear.


## Audio Player - try it
install a simple http server and run it...
```
npm install
npm start
```

edit the playlist inside the .html

## kiosk mode
example method to run the app in chrome, in kiosk mode
```
chromium-browser --kiosk file:///home/pi/index.html
```

