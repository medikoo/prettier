"use strict";

const isObject = require("es5-ext/object/is-object");

const ignoredKeys = new Set([
  "comments",
  "directives",
  "guardedHandlers",
  "innerComments",
  "loc",
]);

const commentLineTypes = new Set(["CommentLine", "Line"]);

module.exports = function (data) {
  const stack = [data];

  while (stack.length) {
    const item = stack.pop();

    if (!isObject(item)) {
      continue;
    }
    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
      continue;
    }
    if (item.comments) {
      if (item.comments.some((comment) => commentLineTypes.has(comment.type))) {
        return true;
      }
    }
    Object.keys(item).forEach((key) => {
      if (ignoredKeys.has(key)) {
        return;
      }
      if (!isObject(item[key])) {
        return;
      }
      stack.push(item[key]);
    });
  }
  return false;
};
