'use strict';

module.exports = function getFileExtension(asset) {
  var extRegex = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/i;
  var ext = asset.match(extRegex);

  return ext ? ext[0].slice(1) : '';
};