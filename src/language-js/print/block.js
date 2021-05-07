"use strict";

const { printDanglingComments } = require("../../main/comments");
const { isNextLineEmpty } = require("../../common/util");
const {
  builders: { concat, hardline, indent, group, line },
} = require("../../document");
const { hasDanglingComments } = require("../utils");
const { locEnd } = require("../loc");

const { printStatementSequence } = require("./statement");

const customizations = require("../../_customizations");

/** @typedef {import("../../document").Doc} Doc */

function printBlock(path, options, print) {
  const n = path.getValue();
  const parts = [];
  const semi = options.semi ? ";" : "";
  const naked = path.call((bodyPath) => {
    return printStatementSequence(bodyPath, options, print);
  }, "body");

  if (n.type === "StaticBlock") {
    parts.push("static ");
  }

  const hasContent = n.body.some((node) => node.type !== "EmptyStatement");
  const hasDirectives = n.directives && n.directives.length > 0;

  const parent = path.getParentNode();
  const parentParent = path.getParentNode(1);
  if (
    !hasContent &&
    !hasDirectives &&
    !hasDanglingComments(n) &&
    (parent.type === "ArrowFunctionExpression" ||
      parent.type === "FunctionExpression" ||
      parent.type === "FunctionDeclaration" ||
      parent.type === "ObjectMethod" ||
      parent.type === "ClassMethod" ||
      parent.type === "ClassPrivateMethod" ||
      parent.type === "ForStatement" ||
      parent.type === "WhileStatement" ||
      parent.type === "DoWhileStatement" ||
      parent.type === "DoExpression" ||
      (parent.type === "TryStatement" && parent.isInlineBlockOk) ||
      (parent.type === "CatchClause" &&
        (!parentParent.finalizer || parentParent.isInlineBlockOk)) ||
      parent.type === "TSModuleDeclaration" ||
      parent.type === "TSDeclareFunction" ||
      n.type === "StaticBlock")
  ) {
    return concat([...parts, "{}"]);
  }

  parts.push("{");

  const canBeInline = (() => {
    let result;
    if (hasDirectives && hasContent) {
      return false;
    }
    if (parent.type === "CatchClause") {
      result = parentParent.isInlineBlockOk;
    } else if (parent.type === "TryStatement") {
      result = parent.isInlineBlockOk;
    } else if (
      parent.type !== "ArrowFunctionExpression" &&
      parent.type !== "ClassMethod" &&
      parent.type !== "ClassPrivateMethod" &&
      parent.type !== "FunctionDeclaration" &&
      parent.type !== "FunctionExpression" &&
      parent.type !== "ObjectMethod"
    ) {
      return false;
    } else {
      result = !customizations.isNakedLineBreaking(naked);
    }
    if (!result) {
      return false;
    }
    if (customizations.hasLineComment(n.body)) {
      return false;
    }
    return !customizations.hasType(n.body, "BlockStatement");
  })();
  const lineMode = canBeInline ? line : hardline;

  const contentParts = [];

  // Babel 6
  if (hasDirectives) {
    path.each((childPath) => {
      contentParts.push(indent(concat([lineMode, print(childPath), semi])));
      if (isNextLineEmpty(options.originalText, childPath.getValue(), locEnd)) {
        contentParts.push(lineMode);
      }
    }, "directives");
  }

  if (hasContent) {
    contentParts.push(indent(concat([lineMode, naked])));
  }

  contentParts.push(printDanglingComments(path, options, null, null, true));
  contentParts.push(lineMode);

  if (canBeInline) {
    parts.push(group(concat(contentParts)));
  } else {
    parts.push(...contentParts);
  }
  parts.push("}");
  return concat(parts);
}

module.exports = { printBlock };
