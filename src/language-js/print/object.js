"use strict";

const { printDanglingComments } = require("../../main/comments");
const {
  builders: { concat, line, softline, group, indent, ifBreak, hardline },
} = require("../../document");
const {
  getLast,
  isNextLineEmpty,
  hasNewlineInRange,
  hasNewline,
} = require("../../common/util");
const {
  hasDanglingComments,
  shouldPrintComma,
  hasNodeIgnoreComment,
  isBlockComment,
} = require("../utils");
const { locStart, locEnd } = require("../loc");

const { printOptionalToken } = require("./misc");
const { shouldHugFunctionParameters } = require("./function-parameters");
const { printTypeAnnotation, shouldHugType } = require("./type-annotation");

const isIdentifierName = require("esutils").keyword.isIdentifierNameES5;

/** @typedef {import("../../document").Doc} Doc */

function printObject(path, options, print) {
  const semi = options.semi ? ";" : "";
  const n = path.getValue();

  let propertiesField;

  if (n.type === "TSTypeLiteral") {
    propertiesField = "members";
  } else if (n.type === "TSInterfaceBody") {
    propertiesField = "body";
  } else {
    propertiesField = "properties";
  }

  const isTypeAnnotation = n.type === "ObjectTypeAnnotation";
  const fields = [];
  if (isTypeAnnotation) {
    fields.push("indexers", "callProperties", "internalSlots");
  }
  fields.push(propertiesField);

  const firstProperty = fields
    .map((field) => n[field][0])
    .sort((a, b) => locStart(a) - locStart(b))[0];

  const parent = path.getParentNode(0);
  const isFlowInterfaceLikeBody =
    isTypeAnnotation &&
    parent &&
    (parent.type === "InterfaceDeclaration" ||
      parent.type === "DeclareInterface" ||
      parent.type === "DeclareClass") &&
    path.getName() === "body";
  const shouldBreak = false;

  const separator = isFlowInterfaceLikeBody
    ? ";"
    : n.type === "TSInterfaceBody" || n.type === "TSTypeLiteral"
    ? ifBreak(semi, ";")
    : ",";
  const leftBrace = n.type === "RecordExpression" ? "#{" : n.exact ? "{|" : "{";
  const rightBrace = n.exact ? "|}" : "}";

  // Unfortunately, things are grouped together in the ast can be
  // interleaved in the source code. So we need to reorder them before
  // printing them.
  const propsAndLoc = [];
  fields.forEach((field) => {
    let anyStringKey = false;
    if (field === "properties") {
      path.each((childPath) => {
        if (anyStringKey) {
          return;
        }
        const node = childPath.getValue();
        if (
          node.type !== "ObjectTypeProperty" &&
          node.type !== "ObjectProperty"
        ) {
          return;
        }
        if (node.key.type !== "StringLiteral") {
          return;
        }
        anyStringKey = !isIdentifierName(node.key.value);
      }, field);
    }
    path.each((childPath) => {
      const node = childPath.getValue();
      if (anyStringKey) {
        node._keepAsStringLiteral = true;
      }
      propsAndLoc.push({
        node,
        printed: print(childPath),
        loc: options.locStart(node),
      });
      if (anyStringKey) {
        delete node._keepAsStringLiteral;
      }
    }, field);
  });

  let separatorParts = [];
  const props = propsAndLoc
    .sort((a, b) => a.loc - b.loc)
    .map((prop) => {
      const result = concat(separatorParts.concat(group(prop.printed)));
      separatorParts = [separator, line];
      if (
        (prop.node.type === "TSPropertySignature" ||
          prop.node.type === "TSMethodSignature" ||
          prop.node.type === "TSConstructSignatureDeclaration") &&
        hasNodeIgnoreComment(prop.node)
      ) {
        separatorParts.shift();
      }
      if (isNextLineEmpty(options.originalText, prop.node, locEnd)) {
        separatorParts.push(hardline);
      }
      return result;
    });

  if (n.inexact) {
    let printed;
    if (hasDanglingComments(n)) {
      const hasLineComments = !n.comments.every((comment) =>
        isBlockComment(comment)
      );
      const printedDanglingComments = printDanglingComments(
        path,
        options,
        /* sameIndent */ true
      );
      printed = concat([
        printedDanglingComments,
        hasLineComments ||
        hasNewline(
          options.originalText,
          locEnd(n.comments[n.comments.length - 1])
        )
          ? hardline
          : line,
        "...",
      ]);
    } else {
      printed = "...";
    }
    props.push(concat(separatorParts.concat(printed)));
  }

  const lastElem = getLast(n[propertiesField]);

  const canHaveTrailingSeparator = !(
    n.inexact ||
    (lastElem && lastElem.type === "RestElement") ||
    (lastElem &&
      (lastElem.type === "TSPropertySignature" ||
        lastElem.type === "TSCallSignatureDeclaration" ||
        lastElem.type === "TSMethodSignature" ||
        lastElem.type === "TSConstructSignatureDeclaration") &&
      hasNodeIgnoreComment(lastElem))
  );

  let content;
  if (props.length === 0) {
    if (!hasDanglingComments(n)) {
      return concat([
        leftBrace,
        rightBrace,
        printTypeAnnotation(path, options, print),
      ]);
    }

    content = group(
      concat([
        leftBrace,
        printDanglingComments(path, options),
        softline,
        rightBrace,
        printOptionalToken(path),
        printTypeAnnotation(path, options, print),
      ])
    );
  } else {
    content = concat([
      leftBrace,
      indent(concat([options.bracketSpacing ? line : softline, concat(props)])),
      ifBreak(
        canHaveTrailingSeparator &&
          (separator !== "," || shouldPrintComma(options))
          ? separator
          : ""
      ),
      concat([options.bracketSpacing ? line : softline, rightBrace]),
      printOptionalToken(path),
      printTypeAnnotation(path, options, print),
    ]);
  }

  // If we inline the object as first argument of the parent, we don't want
  // to create another group so that the object breaks before the return
  // type
  if (
    path.match(
      (node) => node.type === "ObjectPattern" && !node.decorators,
      (node, name, number) =>
        shouldHugFunctionParameters(node) &&
        (name === "params" ||
          name === "parameters" ||
          name === "this" ||
          name === "rest") &&
        number === 0
    ) ||
    path.match(
      shouldHugType,
      (node, name) => name === "typeAnnotation",
      (node, name) => name === "typeAnnotation",
      (node, name, number) =>
        shouldHugFunctionParameters(node) &&
        (name === "params" ||
          name === "parameters" ||
          name === "this" ||
          name === "rest") &&
        number === 0
    )
  ) {
    return content;
  }

  return group(content, { shouldBreak });
}

module.exports = { printObject };
