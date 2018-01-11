"use strict";

const { indent } = require("../doc/doc-builders");

module.exports = items =>
  items.some(item => {
    if (!item.parts[0].contents) {
      return false;
    }
    const valuePart = item.parts[0].contents.parts[2];
    if (valuePart) {
      item.parts[0].contents.parts[2] = indent(valuePart);
    }
  });
