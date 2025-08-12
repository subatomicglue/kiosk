const globalStyles = new CSSStyleSheet();
globalStyles.replaceSync(`
  @font-face {
    font-family: 'Material Icons';
    src: url('./MaterialSymbolsRounded-Regular.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }

  .material-icons {
    font-family: 'Material Icons';
    font-weight: normal;
    font-style: normal;
    display: inline-block;
    line-height: 1;
    text-transform: none;
    letter-spacing: normal;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }

  .bold {
    font-weight: 700;
  }
`);

// jukebox-player.js
class JukeboxPlayer {
  constructor() {
    this.audio = new Audio();
    this.queue = [];
    this.index = -1;
    this._listeners = new Set();

    // auto advance the track when it ends, to the next track.
    this.audio.addEventListener("ended", () => this.next() )

    // emit events for generate audio state changes
    this.audio.addEventListener("play", () => this._emit( "play-state", { state: "play", track: this.getCurrentTrack() } ) )
    this.audio.addEventListener("pause", () => this._emit( "play-state", { state: "pause", track: this.getCurrentTrack() } ) )
    this.audio.addEventListener("ended", () => this._emit( "play-state", { state: "ended", track: this.getCurrentTrack() } ) )
    this.audio.addEventListener("timeupdate", (event) => this._emit("timeupdate", { event: event, audio: this.audio } ) );
  }

  static getInstance() {
    if (!window._jukeboxPlayer) {
      window._jukeboxPlayer = new JukeboxPlayer();
    }
    return window._jukeboxPlayer;
  }

  setPlaylist(queue) {
    this._emit("playlist-ended");
    this.queue = queue;
    this.queue.forEach( track => {
      JukeboxPlayer.extractMetadata(track).then( metadata => { track.metadata = metadata } );
    })
    this._emit("track-changed", this.queue.length > 0 ? this.queue[0] : { src: "empty playlist", track: "empty playlist" });
  }

  playPlaylist(queue, startIndex = 0) {
    this.setPlaylist( queue )
    this.play(startIndex);
  }

  // Extract metadata (album, artist, title) and update the queue
  static async extractMetadata(track) {
    if (!track.src) return track; // Skip if no source available

    try {
      //const jsmediatags = await import("https://cdn.jsdelivr.net/npm/jsmediatags@3.9.5/dist/jsmediatags.min.js");
      //const jsmediatags = await import("./jsmediatags.min.js");
      const jsmediatags = window.jsmediatags;
      return new Promise((resolve) => {
        jsmediatags.read(track.src, {
          onSuccess: (tag) => {
            const { artist, album, title } = tag.tags;
            resolve({ ...track, artist: artist || "Unknown Artist", album: album || "Unknown Album", title: title || track.title });
          },
          onError: (error) => {
            console.warn("Metadata extraction failed:", error);
            resolve(track); // Return the original track if metadata extraction fails
          },
        });
      });
    } catch (error) {
      console.error("Failed to load jsmediatags library:", error);
      return track; // Return the original track if the library fails to load
    }
  }

  // playTitle( title ) {
  //   let i = this.queue.findIndex( r => title == r.title )
  //   if (0 <= i && i < this.queue.length)
  //     this.play( i );
  //   else
  //     console.log( `JukeBox: playTitle title not found ${title}` )
  // }

  // playSrc( src ) {
  //   let i = this.queue.findIndex( r => src == r.src )
  //   console.log( this.queue )
  //   console.log( i );
  //   if (0 <= i && i < this.queue.length)
  //     this.play( i );
  //   else
  //   console.log( `JukeBox: playTitle src not found ${src}` )
  // }

  play(index = this.index) {
    if (index < 0 || index >= this.queue.length) return;
    if (index == this.index) { this.audio.play(); return }
    this.index = index;
    this.audio.src = this.queue[index].src;
    this.audio.play();
    this._emit("track-changed", this.getCurrentTrack());
  }

  isPlaying() { return this.audio && !this.audio.paused; }

  toggle(index = this.index) {
    if (index == this.index) {
      if (this.isPlaying())
        this.pause()
      else
        this.play()
    } else
      this.play( index );
  }

  next() {
    if (this.index + 1 < this.queue.length) {
      this.play(this.index + 1);
    } else {
      this._emit("playlist-ended");
    }
  }

  prev() {
    if (this.index - 1 >= 0) {
      this.play(this.index - 1);
    }
  }

  pause() {
    this.audio.pause();
  }

  getCurrentTrack() {
    return this.queue[this.index] || undefined;
  }

  getAudioElement() {
    return this.audio;
  }

  setCurrentTimeNormalized( zeroToOne ) {
    this.setCurrentTime( this.audio.duration * zeroToOne )
  }

  setCurrentTime( seconds ) {
    if (this.audio && !isNaN(this.audio.duration) && 0 <= this.audio.duration) {
      // sanity check that the audio is seekable
      if (this.audio.seekable.length > 0 && (this.audio.seekable.end(0) - this.audio.seekable.start(0)) == 0) {
        console.log(`seekable range: ${this.audio.seekable.start(0)} - ${this.audio.seekable.end(0)}`);
        console.log(`Load up your dev-tools and Verify that the Accept-Ranges: bytes header is present.`)
        console.log(`You likely need to change your webserver:`);
        console.log(` ❌ python -m http.server 8000         (will fail, doesn't support range)`)
        console.log(` ✅ npm install --save "http-server"   (14.1.1 verified to work)`)
      }

      // Check if audio is ready for seeking, if not, queue the change for what audio becomes ready.
      if (this.audio.readyState >= 2) {
        this.audio.currentTime = seconds;
        console.log(`currentTime: ${this.audio.currentTime}`);
      } else {
        console.warn("Audio not ready for seeking. Waiting for readyState >= 2.");

        // Wait for audio to be ready
        const onCanPlay = () => {
          console.log(`Audio is now ready for seeking. Setting currentTime to ${seconds}s.`);
          this.audio.currentTime = seconds;
          console.log(`currentTime (after ready): ${this.audio.currentTime}`);
          this.audio.removeEventListener('canplay', onCanPlay);
        };

        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.addEventListener('canplay', onCanPlay);
      }
    }
  }

  getCurrentTime() { return this.audio.currentTime; }

  on(event, callback) {
    this._listeners.add({ event, callback });
  }

  _emit(event, data) {
    for (const { event: evt, callback } of this._listeners) {
      if (evt === event) callback(data);
    }
  }
}


customElements.define("playpause-button", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.title = this.getAttribute("title");
    this.src = this.getAttribute("src");

    this.shadowRoot.adoptedStyleSheets = [globalStyles];
    this.shadowRoot.innerHTML = `
      <style>
        .material-icons {
          cursor: pointer;
          margin: 5px;
        }
      </style>
      <i class="playpause-button material-icons">play_arrow</i>
    `;

    this.buttonElement = this.shadowRoot.querySelector(".playpause-button");
    this.buttonElement.addEventListener("click", () => this.togglePlayback());
    JukeboxPlayer.getInstance().on("play-state", (event) => this.updatePlayState(event));
    JukeboxPlayer.getInstance().on("play-state", (event) => this.updatePlayState(event));
  }

  togglePlayback() {
    const rootNode = this.getRootNode();
    const songItem = rootNode.host;

    const songGrouper = songItem.closest("song-grouper");
    if (songGrouper) {
      const trackData = songItem.getSongData();
      const playlistData = Array.from(songGrouper.querySelectorAll("song-item")).map((el) => el.getSongData());
      JukeboxPlayer.getInstance().setPlaylist( playlistData );
      JukeboxPlayer.getInstance().toggle( playlistData.findIndex((track) => track.title === trackData.title) );
    } else {
      if (JukeboxPlayer.getInstance().getCurrentTrack()) {
        JukeboxPlayer.getInstance().toggle(); // Toggle the current track's playback state
      } else {
        console.warn("No track is currently active to toggle playback.");
      }
    }
  }

  updatePlayState(event) {
    const { state, track } = event;

    // Update button state based on the current track
    if (track.title === this.title) {
      this.buttonElement.textContent = state === "play" ? "pause" : "play_arrow";
    } else {
      this.buttonElement.textContent = "play_arrow"
    }
  }
});

customElements.define("song-item", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const title = this.getAttribute("title");
    const src = this.getAttribute("src");

    this.shadowRoot.adoptedStyleSheets = [globalStyles];
    this.shadowRoot.innerHTML = `
      <div><playpause-button title="${title}" src="${src}"></playpause-button><span class="title bold" style="cursor: pointer">${title}</span></div>
    `;

    this.shadowRoot.querySelector(".title").addEventListener("click", () => {
      const parent = this.closest("song-grouper");
      if (parent) parent.playSong(this);
    });
    JukeboxPlayer.getInstance().on("track-changed", track => this.updateTrack(track));
  }

  getSongData() {
    return {
      title: this.getAttribute("title"),
      src: this.getAttribute("src"),
      album: this.getAttribute("album") || "",
      art: this.getAttribute("art") || ""
    };
  }

  updateTrack( track ) {
    const titleElement = this.shadowRoot.querySelector(".title");
    if (this.getAttribute("title") === track.title) {
      titleElement.classList.add("bold");
    } else {
      titleElement.classList.remove("bold");
    }
  }
});




customElements.define("song-grouper", class extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.songs = Array.from(this.querySelectorAll("song-item"));
    let active = this.getAttribute("active") === "true"
    if (active) {
      setTimeout( () => {
        this.setPlaylist()
      }, 100 )
    }

    // move song-items into a new structure
    // const wrapper = document.createElement("div");
    // wrapper.classList.add("song-list-wrapper");
    // this.songs.forEach(song => {
    //   wrapper.appendChild(song); // This moves the element, it doesn't duplicate it
    // });
    // this.appendChild(wrapper);
  }

  setPlaylist() {
    const data = this.songs.map(el => el.getSongData());
    JukeboxPlayer.getInstance().setPlaylist(data);
  }

  playSong(songEl) {
    const data = this.songs.map(el => el.getSongData());
    const index = this.songs.indexOf(songEl);
    JukeboxPlayer.getInstance().playPlaylist(data, index);
  }
});




customElements.define("now-playing", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.adoptedStyleSheets = [globalStyles];
    this.shadowRoot.innerHTML = `
      <div class="progress-meter" style="width: 100%; height: 1rem; background-color: #333; position: relative;">
          <div class="progress" style="width: 0%; height: 100%; background-color: #f33;"></div>
      </div>
      <div style="width: 100%; background-color: #f9f9f9; padding: 1rem; box-sizing: border-box; border-top: 1px solid #ccc;">
        <div class="container" style="display: flex; align-items: center; gap: 20px;">
          <img class="art" src="" alt="Album Art" style="width: 100px; height: 100px; object-fit: cover; border: 1px solid #ccc;">
          <div class="info" style="flex: 1; font-size: 1em;">
            <strong class="title">Track Title</strong>
            <div class="time" style="margin-top: 1em; font-size: 0.9em; color: #555;">
              <span class="current">--:--:--</span>
            </div>
          </div>
          <div class="controls" style="display: flex; gap: 10px; align-items: center;">
            <i class="prev material-icons" style="cursor: pointer;">skip_previous</i>
            <i class="dec material-icons" style="cursor: pointer;">arrow_back</i>
            <playpause-button title="" src="" class="playpause-button" style="display: inline-block; cursor: pointer;"></playpause-button>
            <i class="inc material-icons" style="cursor: pointer;">arrow_forward</i>
            <i class="next material-icons" style="cursor: pointer;">skip_next</i>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    JukeboxPlayer.getInstance().on("track-changed", track => {
      this.updateTrack(track)
    });

    this.current_time = this.shadowRoot.querySelector(".current");
    this.progress = this.shadowRoot.querySelector(".progress")

    // Live update time
    JukeboxPlayer.getInstance().on("timeupdate", (obj) => this.updateTime(obj.event, obj.audio) );

    // progress-meter
    function onProgressBarChange(e) {
      if (e.buttons !== 1) return;
      const rect = e.currentTarget.getBoundingClientRect(); // Get the bounding box of the element
      const zeroToOne = (e.clientX - rect.left) / rect.width; // Calculate normalized value (0-1)
      JukeboxPlayer.getInstance().setCurrentTimeNormalized( zeroToOne ) // update audio playback position
    }
    this.shadowRoot.querySelector(".progress-meter").addEventListener( "mousedown", (e) => onProgressBarChange(e) );
    this.shadowRoot.querySelector(".progress-meter").addEventListener( "mousemove", (e) => onProgressBarChange(e) );

    document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));

    this.shadowRoot.querySelector(".prev").addEventListener( "click", () => JukeboxPlayer.getInstance().prev() )
    this.shadowRoot.querySelector(".next").addEventListener( "click", () => JukeboxPlayer.getInstance().next() )
    this.shadowRoot.querySelector(".dec").addEventListener( "click", () => JukeboxPlayer.getInstance().setCurrentTime( JukeboxPlayer.getInstance().getCurrentTime() - 10 ) )
    this.shadowRoot.querySelector(".inc").addEventListener( "click", () => JukeboxPlayer.getInstance().setCurrentTime( JukeboxPlayer.getInstance().getCurrentTime() + 10 ) )
  }

  handleGlobalKeydown(e) {
    switch (e.key) {
      case ' ':
        e.preventDefault(); // Prevent default spacebar scrolling
        this.shadowRoot.querySelector("playpause-button").shadowRoot.querySelector('.playpause-button').click();
        break;
      case 'ArrowLeft':
        this.shadowRoot.querySelector('.dec').click();
        break;
      case 'ArrowRight':
        this.shadowRoot.querySelector('.inc').click();
        break;
      case 'ArrowUp':
        this.shadowRoot.querySelector('.prev').click();
        break;
      case 'ArrowDown':
        this.shadowRoot.querySelector('.next').click();
        break;
      default:
        break;
    }
  }

  updateTrack(track) {
    if (!track) return;
    this.shadowRoot.querySelector(".art").src = track.art || "";
    this.shadowRoot.querySelector(".title").textContent = track.title || "";

    this.shadowRoot.querySelector("playpause-button").title = track.title
    this.shadowRoot.querySelector("playpause-button").src = track.src
  }

  updateTime( event, audio ) {
    // update the time text
    this.current_time.textContent = this.formatTime(audio.currentTime);

    // update the progress meter
    const progressPercent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    this.progress.style.width = `${progressPercent}%`
  }

  formatTime(sec) {
    const h = Math.floor(sec / (60*60)).toString().padStart(2, "0");;
    const m = Math.floor((sec % (60*60)) / 60).toString().padStart(2, "0");;
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
});

//const jukebox = JukeboxPlayer.getInstance();
//jukebox.setPlaylist([{ title: "X", src: "..." }]);

