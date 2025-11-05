# media kiosk

 - **Audio Player** - index.html - a demo showing a plex-like or spotify-like playlist with playlist and now-playing controls all acting on a central JukeBoxPlayer
 - **Mantis Seq** - midi.html - a demo showing midi sequencing in the browser, for controllking softsynth or external midigear.   
   - [try it](https://htmlpreview.github.io/?https://raw.githubusercontent.com/subatomicglue/kiosk/master/examples/midi.html) (REQUIRES! a midi device on your system, select it from the dropdown)

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

## HelloWorld Demos
To help you navigate, here's a complete list of my hello world demos

### Simple Demos
- 2D SVG - [helloworld_html_js_svg](https://github.com/subatomicglue/helloworld_html_js_svg)
- 2D Canvas - [helloworld_html_js_canvas](https://github.com/subatomicglue/helloworld_html_js_canvas)
- 3D Canvas - [threejs-helloworld-cube](https://github.com/subatomicglue/threejs-helloworld-cube)
- 2D Spline Curve through points - [helloworld-catmull-rom-spline-curve](https://github.com/subatomicglue/helloworld-catmull-rom-spline-curve)

### More Advanced Demos
- 2D Canvas with fractal tree - [fractaltree](https://github.com/subatomicglue/fractaltree)
- 2D Canvas with sprites and map tiles - [sprite_demo_js](https://github.com/subatomicglue/sprite_demo_js)
- Audio Demo with drummachine - [drummachine](https://github.com/subatomicglue/drummachine)
- Audio Demos:  MIDI music, Audio player - [drummachine](https://github.com/subatomicglue/kiosk)
- Peer to Peer chat using WebRTC - [helloworld_html_js_webrtc_p2p](https://github.com/subatomicglue/helloworld_html_js_webrtc_p2p)

