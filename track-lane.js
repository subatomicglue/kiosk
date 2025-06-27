const globalStyles = new CSSStyleSheet();
globalStyles.replaceSync(`
`);

class TrackLane extends HTMLElement {
  static count = 0;

  constructor() {
    super();
    this.id = this.constructor.count++;
    this.steps = [];
    this.currentStep = 0;
    this.activeNote = null;
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        .step-grid { display: flex; gap: 4px; }
        .edit-grid { display: flex; gap: 4px; margin-top: 4px; }
        .vel-grid { display: flex; gap: 4px; margin-top: 4px; }
        .slur-grid { display: flex; gap: 4px; margin-top: 4px; }
      </style>
      <div>
        <label>MIDI Out:
          <select class="midiOut"></select>
        </label>
        <label>Channel:
          <int-box min="1" max="16">1</int-box>
        </label>
        <label>Prog:
          <int-box id="prog" min="0" max="127">1</int-box>
        </label>
        <label>Mute:
          <led-indicator id="mute">false</led-indicator>
        </label>
        <div class="step-grid"></div>
        <div class="edit-grid"></div>
        <div class="vel-grid"></div>
        <div class="slur-grid"></div>
      </div>
    `;

    this.outputSelect = this.shadowRoot.querySelector(".midiOut");
    this.grid = this.shadowRoot.querySelector(".step-grid");
    this.editGrid = this.shadowRoot.querySelector(".edit-grid");
    this.velGrid = this.shadowRoot.querySelector(".vel-grid");
    this.slurGrid = this.shadowRoot.querySelector(".slur-grid");
    this.intBox = this.shadowRoot.querySelector("int-box");
    this.programBox = this.shadowRoot.querySelector("#prog");
    this.programBox.addEventListener("change", e => {
      console.log("Prog changed to", e.detail);
      this.program = e.detail
      this.saveToStorage()
    });
    this.muteSwitch = this.shadowRoot.querySelector("#mute");
    this.muteSwitch.addEventListener("change", e => {
      console.log("Mute changed to", e.detail);
      this.isMuted = e.detail
      this.saveToStorage()
    });

    // build steps
    for (let i = 0; i < 16; i++) {
      const step = document.createElement("step-control");
      step.setAttribute("type", "rest");
      this.steps.push({
        type: "rest",
        note: 60,
        velocity: 100,
        ref: step
      });

      step.addEventListener("change", e => {
        this.steps[i].type = e.detail;
        this.updateEditGrid();
        this.saveToStorage();
      });

      this.grid.appendChild(step);

      // note
      const noteBox = document.createElement("int-box");
      noteBox.min = 0;
      noteBox.max = 127;
      noteBox.value = 60;

      noteBox.addEventListener("change", ev => {
        const step = this.steps[i];
        if (step.type !== "note") return;
        step.note = ev.detail;
        this.saveToStorage();
      });

      this.editGrid.appendChild(noteBox);


      // velocity
      const velBox = document.createElement("int-box");
      velBox.min = 0;
      velBox.max = 127;
      velBox.value = 60;

      velBox.addEventListener("change", ev => {
        const step = this.steps[i];
        if (step.type !== "note") return;
        step.velocity = ev.detail;
        this.saveToStorage();
      });

      this.velGrid.appendChild(velBox);


      // slur
      const slurSwitch = document.createElement("led-indicator");
      slurSwitch.addEventListener("change", ev => {
        const step = this.steps[i];
        step.slurred = ev.detail;
        this.saveToStorage();
      });

      this.slurGrid.appendChild(slurSwitch);
    }

    this.loadFromStorage();

    // hook up int-box
    this.intBox.addEventListener("change", e => {
      console.log("Channel changed to", e.detail);
      this.channel = e.detail
      this.resetMidi();
      this.saveToStorage();
    });
  }

  updateEditGrid() {
    this.steps.forEach((step, i) => {
      const cell = this.editGrid.children[i];
      if (step.type === "note") {
        cell.value = step.note; // initially just note number
        cell.min = "0"
        cell.max = "127"
      } else {
        cell.value = "---";
        cell.min = "---"
        cell.max = "---"
      }

      const vcell = this.velGrid.children[i];
      if (step.type === "note") {
        vcell.value = step.velocity;
        vcell.min = "0"
        vcell.max = "127"
      } else {
        vcell.value = "---";
        vcell.min = "---"
        vcell.max = "---"
      }

      // this.velGrid.children[i].value = step.velocity
      this.slurGrid.children[i].value = step.slurred
    });
    this.programChange( this.program )
  }

  onMIDISuccess(midi) {
    this.midiAccess = midi;
    for (const output of this.midiAccess.outputs.values()) {
      const opt = document.createElement('option');
      opt.value = output.id;
      opt.text = output.name;
      this.outputSelect.appendChild(opt);
    }
  }

  getMidiOutput() {
    return this.midiAccess ? this.midiAccess.outputs.get(this.outputSelect.value) : undefined;
  }

  playStep() {
    if (this.isMuted == true) return;

    const step = this.steps[this.currentStep];
    const out = this.getMidiOutput();
    if (!out || !step) {
      return;
    }

    if (step.type === "note") {
      if (step.slurred) {
        // console.log( "note slur")
        if (step.velocity) out.send([0x90 | (this.channel - 1), step.note, step.velocity]);
        if (this.activeNote !== null) {
          out.send([0x80 | (this.channel - 1), this.activeNote.note, 0]);
          this.activeNote = null
        }
      } else {
        // console.log( "note")
        if (this.activeNote !== null) {
          out.send([0x80 | (this.channel - 1), this.activeNote.note, 0]);
          this.activeNote = null
        }
        if (step.velocity) out.send([0x90 | (this.channel - 1), step.note, step.velocity]);
      }
      if (step.velocity) this.activeNote = step;
    } else if (step.type === "rest") {
      if (this.activeNote !== null) {
        out.send([0x80 | (this.channel - 1), this.activeNote.note, 0]);
        this.activeNote = null;
      }
    } else if (step.type === "tie") {
      //console.log( " tie")
    }
  }

  incStep() {
    this.currentStep = (this.currentStep + 1) % 16;
  }
  setStep(val = 0) {
    this.currentStep = val
  }

  programChange(p) {
    this.programBox.value = this.program = p;
    const out = this.getMidiOutput();
    if (!out) return;
    const channel = this.channel; // user channels 1..16
    const program = p; // 0..127
    const status = 0xC0 | (channel - 1);
    out.send([status, program]);
  }
  stopActiveNote() {
    if (this.activeNote !== null) {
      out.send([0x80 | (this.channel - 1), this.activeNote.note, 0]);
      this.activeNote = null;
    }
  }
  mute() {
    this.isMuted = true;
    //this.resetMidi();
    stopActiveNote()
  }
  unmute() {
    this.isMuted = false;
  }

  resetMidi() {
    if (this.midiAccess)
      for (let ch = 0; ch < 16; ch++) {
        this.midiAccess.outputs.forEach(out => {
          out.send([0xB0 | ch, 0x7B, 0x00]);
        });
      }
  }


  saveToStorage() {
    const state = {
      channel: this.channel || 1,
      program: this.program || 0,
      isMuted: this.isMuted || false,
      outputId: this.outputSelect.value,
      steps: this.steps.map(s => ({
        type: s.type,
        note: s.note,
        velocity: s.velocity,
        slurred: s.slurred || false,
      }))
    };
          console.log( this.channel, "pr" , state.program )

    localStorage.setItem(`track-${this.id}`, JSON.stringify(state));
    console.log(`saveToStorage track-${this.id}`);
  }

  loadFromStorage() {
    const state = JSON.parse(localStorage.getItem(`track-${this.id}`));
    if (!state) return;
    this.program = state.program || 1;
    this.channel = state.channel || 1;
    this.intBox.value = this.channel;
    this.isMuted = state.isMuted || false;
    this.muteSwitch.value = this.isMuted;
    this.outputSelect.value = state.outputId;
    this.steps.forEach((step, i) => {
      const saved = state.steps[i];
      step.type = saved.type;
      step.note = saved.note;
      step.velocity = saved.velocity;
      step.slurred = saved.slurred || false;
      step.ref.setAttribute("type", saved.type);
    });
    console.log( this.channel, "pr" , this.program )
    this.updateEditGrid();
  }
}

customElements.define("track-lane", TrackLane);
