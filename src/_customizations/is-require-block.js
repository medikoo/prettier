"use strict";

const tokensToString = require("./tokens-to-string");

module.exports = items =>
  items.some(item => {
    if (!item.parts[0].contents) {
      return false;
    }
    const valuePart = item.parts[0].contents.parts[2];
    return valuePart && tokensToString(valuePart).includes("require(");
  });
