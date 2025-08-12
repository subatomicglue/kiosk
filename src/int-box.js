const globalStyles = new CSSStyleSheet();
globalStyles.replaceSync(`
`);

class IntBox extends HTMLElement {
  static observedAttributes = ["min", "max", "callback", "width"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [globalStyles];
    this.shadowRoot.innerHTML = `
      <style>
        .box {
          display: inline-block;
          width: 30px;
          height: 30px;
          line-height: 30px;
          text-align: center;
          border: 1px solid #aaa;
          user-select: none;
          cursor: ns-resize;
          font-family: sans-serif;
        }
      </style>
      <div class="box"></div>
    `;

    this.displayEl = this.shadowRoot.querySelector("div");

    this.value = 0;
    this.min = -Infinity;
    this.max = Infinity;
    this.callbackName = null;
    this.dragStartY = null;

    this.addEventListener("mousedown", this.onMouseDown.bind(this));
  }

  connectedCallback() {
    // allow user to define initial value in light dom
    const initial = parseInt(this.textContent);
    if (!isNaN(initial)) {
      this.value = initial;
    }
    this.updateDisplay();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "min") {
      this.min = parseInt(newValue);
    }
    if (name === "max") {
      this.max = parseInt(newValue);
    }
    if (name === "callback") {
      this.callbackName = newValue;
    }
  }

  updateDisplay() {
    this.displayEl.textContent = this.value;
  }

  onMouseDown(e) {
    e.preventDefault();
    this.dragStartY = e.clientY;
    this.startValue = this.value;

    const onMouseMove = (evt) => {
      const dy = evt.clientY - this.dragStartY;
      let delta = -Math.round(dy / 5); // 5px per unit
      let newValue = this.startValue + delta;
      newValue = Math.max(this.min, Math.min(this.max, newValue));
      if (newValue !== this.value) {
        this.value = newValue;
        this.updateDisplay();
        this.invokeCallback();
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  invokeCallback() {
    // modern pattern: custom event
    this.dispatchEvent(new CustomEvent("change", {
      detail: this.value
    }));
  }

  set value(v) {
    this._value = v;
    this.updateDisplay();
  }

  get value() {
    return this._value;
  }
}

customElements.define("int-box", IntBox);
