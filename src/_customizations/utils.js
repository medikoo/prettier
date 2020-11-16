'use strict';

const isArray = Array.isArray;
const objHasOwnProperty = Object.prototype.hasOwnProperty;

module.exports.capitalize = function () {
  var str = String(this);
	return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports.count = function (search) {
	var string = String(this), count = 0, index = 0;

	search = String(search);
	if (!search) throw new TypeError("Search string cannot be empty");
	while ((index = string.indexOf(search, index)) !== -1) {
		++count;
		index += search.length;
	}
	return count;
};


module.exports.flatten = function () {
  var input = this, index = 0, remaining, remainingIndexes, length, i, result = [];
	// Jslint: ignore
	main: while (input) {
		length = input.length;
		for (i = index; i < length; ++i) {
			if (!objHasOwnProperty.call(input, i)) continue;
			if (isArray(input[i])) {
				if (i < length - 1) {
					// eslint-disable-next-line max-depth
					if (!remaining) {
						remaining = [];
						remainingIndexes = [];
					}
					remaining.push(input);
					remainingIndexes.push(i + 1);
				}
				input = input[i];
				index = 0;
				continue main;
			}
			result.push(input[i]);
		}
		if (remaining) {
			input = remaining.pop();
			index = remainingIndexes.pop();
		} else {
			input = null;
		}
	}
	return result;
}