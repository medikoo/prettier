"use strict";

const tokensToString = require("./tokens-to-string");

module.exports = items => {
  const lengths = items.map(item => {
    if (!item.parts[0].contents || !item.parts[0].contents.parts[2]) {
      return null;
    }
    const str = tokensToString(item.parts[0].contents.parts[0]);
    return str.length + (str[0] === "{" ? 2 : 0);
  });
  const longestIdentLength = Math.max.apply(Math, lengths);
  items.forEach((item, index) => {
    if (!lengths[index]) {
      return;
    }
    item.parts[0].contents.parts[1] =
      " ".repeat(longestIdentLength - lengths[index]) +
      item.parts[0].contents.parts[1];
  });
};
