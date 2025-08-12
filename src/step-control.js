const globalStyles = new CSSStyleSheet();
globalStyles.replaceSync(`
`);

class StepControl extends HTMLElement {
  static observedAttributes = ["type", "note", "velocity"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 30px;
          height: 30px;
          border: 1px solid #aaa;
          text-align: center;
          line-height: 30px;
          user-select: none;
          cursor: pointer;
          font-family: sans-serif;
        }
      </style>
      <div>-</div>
    `;
    this.display = this.shadowRoot.querySelector("div");

    this.addEventListener("click", this.onClick.bind(this));
  }

  connectedCallback() {
    this.type = this.getAttribute("type") || "rest";
    this.note = parseInt(this.getAttribute("note") || "60");
    this.velocity = parseInt(this.getAttribute("velocity") || "100");
    this.update();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "type") this.type = newVal;
    if (name === "note") this.note = parseInt(newVal);
    if (name === "velocity") this.velocity = parseInt(newVal);
    this.update();
  }

  onClick() {
    const cycle = ["rest", "note", "tie"];
    const idx = cycle.indexOf(this.type);
    this.type = cycle[(idx + 1) % cycle.length];

    this.setAttribute("type", this.type);
    this.update();
    this.dispatchEvent(new CustomEvent("change", { detail: this.type }));
  }

  update() {
    if (this.type === "note") {
      this.display.textContent = "♪";
    } else if (this.type === "tie") {
      this.display.textContent = "_";
    } else {
      this.display.textContent = "-";
    }
  }
}

customElements.define("step-control", StepControl);
