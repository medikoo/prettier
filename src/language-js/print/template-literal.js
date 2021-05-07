"use strict";

const { getStringWidth, getIndentSize } = require("../../common/util");
const {
  builders: {
    concat,
    join,
    line,
    hardline,
    softline,
    group,
    indent,
    align,
    lineSuffixBoundary,
    addAlignmentToDoc,
  },
  printer: { printDocToString },
  utils: { mapDoc },
} = require("../../document");
const {
  isBinaryish,
  isJestEachTemplateLiteral,
  isSimpleTemplateLiteral,
} = require("../utils");

function printTemplateLiteral(path, print, options) {
  const node = path.getValue();
  const isTemplateLiteral = node.type === "TemplateLiteral";

  if (
    isTemplateLiteral &&
    isJestEachTemplateLiteral(node, path.getParentNode())
  ) {
    const printed = printJestEachTemplateLiteral(path, options, print);
    if (printed) {
      return printed;
    }
  }
  let expressionsKey = "expressions";
  if (node.type === "TSTemplateLiteralType") {
    expressionsKey = "types";
  }
  const parts = [];

  let expressions = path.map(print, expressionsKey);
  const isSimple = isSimpleTemplateLiteral(node);

  if (isSimple) {
    expressions = expressions.map(
      (doc) =>
        printDocToString(doc, { ...options, printWidth: Infinity }).formatted
    );
  }

  parts.push(lineSuffixBoundary, "`");

  path.each((childPath) => {
    const i = childPath.getName();

    parts.push(print(childPath));

    if (i < expressions.length) {
      // For a template literal of the following form:
      //   `someQuery {
      //     ${call({
      //       a,
      //       b,
      //     })}
      //   }`
      // the expression is on its own line (there is a \n in the previous
      // quasi literal), therefore we want to indent the JavaScript
      // expression inside at the beginning of ${ instead of the beginning
      // of the `.
      const { tabWidth } = options;
      const quasi = childPath.getValue();
      const indentSize = getIndentSize(quasi.value.raw, tabWidth);

      let printed = expressions[i];

      printed = concat([indent(concat([line, printed])), line]);

      const aligned =
        indentSize === 0 && quasi.value.raw.endsWith("\n")
          ? align(-Infinity, printed)
          : addAlignmentToDoc(printed, indentSize, tabWidth);

      parts.push(group(concat(["${", aligned, lineSuffixBoundary, "}"])));
    }
  }, "quasis");

  parts.push("`");

  return concat(parts);
}

function printJestEachTemplateLiteral(path, options, print) {
  /**
   * a    | b    | expected
   * ${1} | ${1} | ${2}
   * ${1} | ${2} | ${3}
   * ${2} | ${1} | ${3}
   */
  const node = path.getNode();
  const headerNames = node.quasis[0].value.raw.trim().split(/\s*\|\s*/);
  if (
    headerNames.length > 1 ||
    headerNames.some((headerName) => headerName.length !== 0)
  ) {
    options.__inJestEach = true;
    const expressions = path.map(print, "expressions");
    options.__inJestEach = false;
    const parts = [];
    const stringifiedExpressions = expressions.map(
      (doc) =>
        "${" +
        printDocToString(doc, {
          ...options,
          printWidth: Infinity,
          endOfLine: "lf",
        }).formatted +
        "}"
    );

    const tableBody = [{ hasLineBreak: false, cells: [] }];
    for (let i = 1; i < node.quasis.length; i++) {
      const row = tableBody[tableBody.length - 1];
      const correspondingExpression = stringifiedExpressions[i - 1];

      row.cells.push(correspondingExpression);
      if (correspondingExpression.includes("\n")) {
        row.hasLineBreak = true;
      }

      if (node.quasis[i].value.raw.includes("\n")) {
        tableBody.push({ hasLineBreak: false, cells: [] });
      }
    }

    const maxColumnCount = Math.max(
      headerNames.length,
      ...tableBody.map((row) => row.cells.length)
    );

    const maxColumnWidths = Array.from({ length: maxColumnCount }).fill(0);
    const table = [
      { cells: headerNames },
      ...tableBody.filter((row) => row.cells.length !== 0),
    ];
    for (const { cells } of table.filter((row) => !row.hasLineBreak)) {
      cells.forEach((cell, index) => {
        maxColumnWidths[index] = Math.max(
          maxColumnWidths[index],
          getStringWidth(cell)
        );
      });
    }

    parts.push(
      lineSuffixBoundary,
      "`",
      indent(
        concat([
          hardline,
          join(
            hardline,
            table.map((row) =>
              join(
                " | ",
                row.cells.map((cell, index) =>
                  row.hasLineBreak
                    ? cell
                    : cell +
                      " ".repeat(maxColumnWidths[index] - getStringWidth(cell))
                )
              )
            )
          ),
        ])
      ),
      hardline,
      "`"
    );
    return concat(parts);
  }
}

function printTemplateExpression(path, print) {
  const node = path.getValue();
  let printed = print(path);
  if (node.comments && node.comments.length) {
    printed = group(concat([indent(concat([softline, printed])), softline]));
  }
  return concat(["${", printed, lineSuffixBoundary, "}"]);
}

function printTemplateExpressions(path, print) {
  return path.map(
    (path) => printTemplateExpression(path, print),
    "expressions"
  );
}

function escapeTemplateCharacters(doc, raw) {
  return mapDoc(doc, (currentDoc) => {
    if (!currentDoc.parts) {
      return currentDoc;
    }

    const parts = currentDoc.parts.map((part) => {
      if (typeof part === "string") {
        return raw
          ? part.replace(/(\\*)`/g, "$1$1\\`")
          : uncookTemplateElementValue(part);
      }

      return part;
    });

    return { ...currentDoc, parts };
  });
}

function uncookTemplateElementValue(cookedValue) {
  return cookedValue.replace(/([\\`]|\${)/g, "\\$1");
}

module.exports = {
  printTemplateLiteral,
  printTemplateExpressions,
  escapeTemplateCharacters,
  uncookTemplateElementValue,
};
