"use strict";

module.exports = doc => {
  switch (doc.type) {
    case "concat":
      return {
        ...doc,
        parts: doc.parts
          .map(function self(part) {
            return part.type === "concat" && part.groupLines === doc.groupLines
              ? part.parts.map(self)
              : module.exports(part);
          })
          .flat(Infinity)
      };
    case "indent":
    case "group":
      return {
        ...doc,
        contents: module.exports(doc.contents),
        expandedStates:
          doc.expandedStates && doc.expandedStates.map(module.exports)
      };
  }
  return doc;
};
