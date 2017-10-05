"use strict";

module.exports = {
  applyElasticBreaks: require("./apply-elastic-breaks"),
  identity: i => i,
  indentVarAssignment: require("./indent-var-assignment"),
  isRequireBlock: require("./is-require-block"),
  requireBlockKinds: new Set(["const", "var"])
};
