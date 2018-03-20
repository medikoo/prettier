// Resolve item lines within large array as:
// [
//   "1111111111111111111", "222222222222222222", "33333333333333",
//   "1111111111111111111", "222222222222222222", "33333333333333",
//   "444444"
// ]

"use strict";

module.exports = function(ind, MODE_FLAT, width, pos, doc, options, fits) {
  const contents = { type: "concat" };
  const next = [ind, MODE_FLAT, contents];
  const rem = width - pos;
  const groupedParts = [];
  let currentIndex = 0;
  let currentPart = doc.parts[currentIndex];
  let someGrouped = false;
  let groupedGroupsLength = 0;
  let currentItemStartIndex;
  let currentItemEndIndex;
  let currentGroupLastItemEndIndex;
  let currentGroupStartIndex = 0;

  while (currentPart != null) {
    // Expected pattern of doc.parts is repeating:
    //
    // { "type": "group", ... }
    // ","
    // { "type": "line" }
    //
    // We stop at every "group" and check if it fits curent line with eventual postfix ","
    if (currentPart && currentPart.type === "group") {
      // In sparse arrays there can be more than one coma
      // We detect how many we included, to know where to split groups if that one
      // doesn't fit the line
      currentItemStartIndex = currentIndex;
      while (doc.parts[currentIndex + 1] === ",") {
        currentPart = doc.parts[++currentIndex];
      }
      currentItemEndIndex = currentIndex + 1;
      contents.parts = doc.parts.slice(
        currentGroupStartIndex,
        currentItemEndIndex
      );
      if (!fits(next, [], rem, options)) {
        if (currentGroupLastItemEndIndex) {
          // There is at least two groups in set
          if (groupedGroupsLength > 1) {
            // More than one fit a line, create a group
            someGrouped = true;
            groupedParts.push(
              // group of items
              {
                type: "group",
                break: false,
                contents: {
                  type: "concat",
                  parts: doc.parts.slice(
                    currentGroupStartIndex,
                    currentGroupLastItemEndIndex
                  )
                }
              },
              // line
              ...doc.parts.slice(
                currentGroupLastItemEndIndex,
                currentItemStartIndex
              )
            );
          } else {
            // Just one fits the line no need for extra groupping
            groupedParts.push(
              ...doc.parts.slice(currentGroupStartIndex, currentItemStartIndex)
            );
          }
          currentGroupStartIndex = currentItemStartIndex;
          // Reset index so we start again with group which didn't fit
          currentIndex = currentItemStartIndex - 1;
        } else {
          // Group on its own doesn't fit the line, pass it through
          groupedParts.push(
            ...doc.parts.slice(currentGroupStartIndex, currentItemEndIndex)
          );
          // Pass through any fruther coma or newline, until next group
          while (
            doc.parts[currentIndex + 1] &&
            doc.parts[currentIndex + 1].type !== "group"
          ) {
            currentPart = doc.parts[++currentIndex];
            groupedParts.push(currentPart);
          }
          currentGroupStartIndex = currentIndex + 1;
        }
        groupedGroupsLength = 0;
        currentGroupLastItemEndIndex = null;
      } else {
        // Group fits the line
        ++groupedGroupsLength;
        currentGroupLastItemEndIndex = currentItemEndIndex;
      }
    }
    currentPart = doc.parts[++currentIndex];
  }
  if (someGrouped || groupedGroupsLength > 1) {
    // Some line grouping were resolved, therefore return generated groups
    if (groupedGroupsLength > 1) {
      groupedParts.push({
        type: "group",
        break: false,
        contents: {
          type: "concat",
          parts: doc.parts.slice(currentGroupStartIndex)
        }
      });
    } else if (doc.parts.length > currentGroupStartIndex) {
      groupedParts.push(...doc.parts.slice(currentGroupStartIndex));
    }
    return groupedParts;
  }
  return doc.parts;
};
