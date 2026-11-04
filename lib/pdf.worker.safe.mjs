// PDF worker entry: polyfills first, then the real pdf.js worker.
import "./streams-polyfill.js";
import "./pdf.worker.min.mjs";
