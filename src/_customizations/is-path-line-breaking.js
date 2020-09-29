"use strict";

const isNakedLineBreaking = require("./is-naked-line-breaking");

const allowedStatements = new Set([
  "EmptyStatement",
  "ExpressionStatement",
  "ReturnStatement",
]);
module.exports = function (path, printStatementSequence, options, print) {
  const pathValue = path.getValue();
  const type = pathValue && pathValue[0] && pathValue[0].type;
  if (type && type.endsWith("Statement") && !allowedStatements.has(type)) {
    return true;
  }
  return isNakedLineBreaking(printStatementSequence(path, options, print));
};
