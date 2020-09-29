"use strict";

const tokensToString = require("./tokens-to-string");

module.exports = (parts) =>
  tokensToString({ type: "concat", parts }).includes("=");
