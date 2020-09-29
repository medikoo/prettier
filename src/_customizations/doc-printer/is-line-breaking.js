"use strict";

module.exports = function (doc, mode, MODE_BREAK, MODE_FLAT) {
  const remaining = [doc];
  while (remaining.length) {
    const current = remaining.pop();
    switch (current.type) {
      case "break-parent":
        return true;
      case "concat":
      case "fill":
        for (let i = current.parts.length - 1; i >= 0; i--) {
          remaining.push(current.parts[i]);
        }
        break;
      case "group":
        if (current.break) {
          return true;
        }
        remaining.push(current.contents);
        break;
      case "if-break":
        if (mode === MODE_BREAK) {
          if (current.breakContents) {
            remaining.push(current.breakContents);
          }
        }
        if (mode === MODE_FLAT) {
          if (current.flatContents) {
            remaining.push(current.flatContents);
          }
        }
        break;
      case "line":
        if (current.hard) {
          return true;
        }
        break;
    }
  }
  return false;
};
