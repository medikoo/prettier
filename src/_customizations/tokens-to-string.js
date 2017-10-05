"use strict";

module.exports = data => {
  const stack = [data];
  let out = "";

  while (stack.length) {
    const item = stack.pop();

    if (typeof item === "string") {
      out += item;
      continue;
    }
    switch (item.type) {
      case "concat":
        for (let i = item.parts.length - 1; i >= 0; i--) {
          stack.push(item.parts[i]);
        }
        break;
      case "group":
      case "align":
      case "indent":
        stack.push(item.contents);
        break;
      default:
    }
  }
  return out.trim();
};
