"use strict";

const isLineBreaking = require("./doc-printer/is-line-breaking");

module.exports = (naked) => isLineBreaking(naked, 2, 1, 2);
