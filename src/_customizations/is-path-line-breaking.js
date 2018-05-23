"use strict";

const isNakedLineBreaking = require("./is-naked-line-breaking");

module.exports = function(path, printStatementSequence, options, print) {
  return isNakedLineBreaking(printStatementSequence(path, options, print));
};
