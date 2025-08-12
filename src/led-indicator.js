const globalStyles = new CSSStyleSheet();
globalStyles.replaceSync(`
`);

class LedIndicator extends HTMLElement {
  static get observedAttributes() { return ["value"]; }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._value = false;

    this.shadowRoot.innerHTML = `
      <style>
        .box {
          display: inline-block;
          width: 30px;
          height: 30px;
          line-height: 30px;
          border: 1px solid #aaa;
          background: #555;
          user-select: none;
          cursor: pointer;
        }
      </style>
      <div class="box"></div>
    `;

    this.box = this.shadowRoot.querySelector(".box");
    this.box.addEventListener("click", () => {
      this.value = !this.value;
      this.dispatchEvent(new CustomEvent("change", { detail: this.value }));
    });
  }

  connectedCallback() {
    const inner = this.textContent.trim().toLowerCase();
    if (inner === "true") this.value = true;
    else if (inner === "false") this.value = false;
    this.update();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "value") {
      this.value = newVal === "true";
    }
  }

  set value(v) {
    this._value = !!v;
    this.update();
  }

  get value() {
    return this._value;
  }

  update() {
    this.box.style.background = this._value ? "#ff5e00" : "#555555";
  }
}

customElements.define("led-indicator", LedIndicator);
