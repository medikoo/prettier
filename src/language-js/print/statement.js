"use strict";

const { isNextLineEmpty } = require("../../common/util");
const {
  builders: { concat, join, hardline },
} = require("../../document");
const pathNeedsParens = require("../needs-parens");
const {
  classChildNeedsASIProtection,
  classPropMayCauseASIProblems,
  getLeftSidePathName,
  hasNakedLeftSide,
  isJSXNode,
  isLastStatement,
  isTheOnlyJSXElementInMarkdown,
} = require("../utils");
const { locEnd } = require("../loc");
const { shouldPrintParamsWithoutParens } = require("./function");

/** @typedef {import("../../document").Doc} Doc */

function printStatement({ path, index, bodyNode, isClass }, options, print) {
  const node = path.getValue();

  // Just in case the AST has been modified to contain falsy
  // "statements," it's safer simply to skip them.
  /* istanbul ignore if */
  if (!node) {
    return;
  }

  // Skip printing EmptyStatement nodes to avoid leaving stray
  // semicolons lying around.
  if (node.type === "EmptyStatement") {
    return;
  }

  const printed = print(path);
  const text = options.originalText;
  const parts = [];

  // in no-semi mode, prepend statement with semicolon if it might break ASI
  // don't prepend the only JSX element in a program with semicolon
  if (
    !options.semi &&
    !isClass &&
    !isTheOnlyJSXElementInMarkdown(options, path) &&
    statementNeedsASIProtection(path, options)
  ) {
    if (node.comments && node.comments.some((comment) => comment.leading)) {
      parts.push(print(path, { needsSemi: true }));
    } else {
      parts.push(";", printed);
    }
  } else {
    parts.push(printed);
  }

  if (!options.semi && isClass) {
    if (classPropMayCauseASIProblems(path)) {
      parts.push(";");
    } else if (
      node.type === "ClassProperty" ||
      node.type === "FieldDefinition"
    ) {
      const nextChild = bodyNode.body[index + 1];
      if (classChildNeedsASIProtection(nextChild)) {
        parts.push(";");
      }
    }
  }

  if (isNextLineEmpty(text, node, locEnd) && !isLastStatement(path)) {
    parts.push(hardline);
  }

  return concat(parts);
}

function printStatementSequence(path, options, print) {
  const bodyNode = path.getNode();
  const isClass = bodyNode.type === "ClassBody";

  const printed = path
    .map((statementPath, index) =>
      printStatement(
        {
          path,
          index,
          bodyNode,
          isClass,
        },
        options,
        print
      )
    )
    .filter(Boolean);

  return join(hardline, printed);
}

function statementNeedsASIProtection(path, options) {
  const node = path.getNode();

  if (node.type !== "ExpressionStatement") {
    return false;
  }

  return path.call(
    (childPath) => expressionNeedsASIProtection(childPath, options),
    "expression"
  );
}

function expressionNeedsASIProtection(path, options) {
  const node = path.getValue();

  const maybeASIProblem =
    pathNeedsParens(path, options) ||
    node.type === "ParenthesizedExpression" ||
    node.type === "TypeCastExpression" ||
    (node.type === "ArrowFunctionExpression" &&
      !shouldPrintParamsWithoutParens(path, options)) ||
    node.type === "ArrayExpression" ||
    node.type === "ArrayPattern" ||
    (node.type === "UnaryExpression" &&
      node.prefix &&
      (node.operator === "+" || node.operator === "-")) ||
    node.type === "TemplateLiteral" ||
    node.type === "TemplateElement" ||
    isJSXNode(node) ||
    (node.type === "BindExpression" && !node.object) ||
    node.type === "RegExpLiteral" ||
    (node.type === "Literal" && node.pattern) ||
    (node.type === "Literal" && node.regex);

  if (maybeASIProblem) {
    return true;
  }

  if (!hasNakedLeftSide(node)) {
    return false;
  }

  return path.call(
    (childPath) => expressionNeedsASIProtection(childPath, options),
    ...getLeftSidePathName(path, node)
  );
}

module.exports = { printStatementSequence };
