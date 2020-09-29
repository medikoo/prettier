"use strict";

const isObject = require("es5-ext/object/is-object");

const ignoredKeys = new Set(["directives", "guardedHandlers", "loc"]);

module.exports = function (data, type) {
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
    if (item.type === type) {
      return true;
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
