// Safari (iOS) has no async iteration for ReadableStream (for await ... of stream).
// pdf.js 6 uses it, so add it where missing. Loaded in the page and in the PDF worker.
(function (g) {
  var RS = g.ReadableStream;
  if (!RS || RS.prototype[Symbol.asyncIterator]) return;
  async function* values(opts) {
    var reader = this.getReader();
    try {
      while (true) {
        var r = await reader.read();
        if (r.done) return;
        yield r.value;
      }
    } finally {
      if (!(opts && opts.preventCancel)) { try { await reader.cancel(); } catch (_) {} }
      try { reader.releaseLock(); } catch (_) {}
    }
  }
  Object.defineProperty(RS.prototype, Symbol.asyncIterator, { value: values, writable: true, configurable: true });
  if (!RS.prototype.values) Object.defineProperty(RS.prototype, "values", { value: values, writable: true, configurable: true });
})(typeof self !== "undefined" ? self : globalThis);
