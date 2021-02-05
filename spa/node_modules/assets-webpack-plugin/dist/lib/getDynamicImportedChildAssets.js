'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var getAssetsFromChildChunk = function getAssetsFromChildChunk(options, chunk, loadingBehavior) {
  var assets = [];

  if (chunk.assets) {
    chunk.assets.forEach(function (asset) {
      asset.loadingBehavior = loadingBehavior;
      assets.push(asset);
    });
  }

  if (options.includeAuxiliaryAssets && chunk.auxiliaryAssets) {
    chunk.auxiliaryAssets.forEach(function (asset) {
      asset.loadingBehavior = loadingBehavior;
      assets.push(asset);
    });
  }

  return assets;
};

module.exports = function getDynamicImportedChildAssets(options, children) {
  var loadingBehaviors = ['preload', 'prefetch'];
  var assets = [];

  loadingBehaviors.forEach(function (loadingBehavior) {
    if (children[loadingBehavior]) {
      children[loadingBehavior].forEach(function (childChunk) {
        assets = [].concat(_toConsumableArray(assets), _toConsumableArray(getAssetsFromChildChunk(options, childChunk, loadingBehavior)));
      });
    }
  });

  return assets;
};