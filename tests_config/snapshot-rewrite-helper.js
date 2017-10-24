// Helps to rewrite snapshots

"use strict";

const { resolve } = require("path");
const readdir = require("fs2/readdir");
const readFile = require("fs2/read-file");
const writeFile = require("fs2/write-file");
const testsPath = resolve(__dirname, "../tests");

const divider =
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~";

const from = /function(<[\0-\uffff]*?>)?\s*\(/g;
const to = "function$1 (";

readdir(testsPath, {
  depth: Infinity,
  type: { file: true },
  pattern: /\/jsfmt\.spec\.js\.snap$/
})
  .map(fileName => {
    const fullPath = resolve(testsPath, fileName);
    return readFile(fullPath)(content => {
      return writeFile(
        fullPath,
        String(content)
          .split(divider)
          .map(part => {
            const index = part.indexOf("\n\n`;\n");
            if (index === -1) {
              return part;
            }
            return part.slice(0, index).replace(from, to) + part.slice(index);
          })
          .join(divider)
      );
    });
  })
  .done();
