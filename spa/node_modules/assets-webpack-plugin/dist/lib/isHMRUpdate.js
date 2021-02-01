'use strict';

var pathTemplate = require('./pathTemplate');

module.exports = function isHMRUpdate(options, asset) {
  if (asset.includes('.hot-update.')) return true;

  var hotUpdateChunkFilename = options.output.hotUpdateChunkFilename;
  var hotUpdateTemplate = pathTemplate(hotUpdateChunkFilename);
  return hotUpdateTemplate.matches(asset);
};