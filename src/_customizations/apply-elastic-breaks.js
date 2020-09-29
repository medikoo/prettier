"use strict";

const count = require("es5-ext/string/#/count");
const tokensToString = require("./tokens-to-string");

const resolveLengthCorrection = (identifier) => {
  if (identifier[0] !== "{" && identifier[0] !== "[") {
    return 0;
  }
  return 2 + count.call(identifier, ",");
};

module.exports = (items) => {
  const lengths = items.map((item) => {
    if (!item.parts[0].contents || !item.parts[0].contents.parts[2]) {
      return null;
    }
    const str = tokensToString(item.parts[0].contents.parts[0]);
    return str.length + resolveLengthCorrection(str);
  });
  const longestIdentLength = Math.max(...lengths);
  items.forEach((item, index) => {
    if (!lengths[index]) {
      return;
    }
    item.parts[0].contents.parts[1] =
      " ".repeat(longestIdentLength - lengths[index]) +
      item.parts[0].contents.parts[1];
  });
};
