'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var getAssetKind = require('./lib/getAssetKind');
var isHMRUpdate = require('./lib/isHMRUpdate');
var isSourceMap = require('./lib/isSourceMap');
var getDynamicImportedChildAssets = require('./lib/getDynamicImportedChildAssets');

var createQueuedWriter = require('./lib/output/createQueuedWriter');
var createOutputWriter = require('./lib/output/createOutputWriter');

function AssetsWebpackPlugin(options) {
  this.options = _.merge({}, {
    filename: 'webpack-assets.json',
    prettyPrint: false,
    update: false,
    fullPath: true,
    manifestFirst: true,
    useCompilerPath: false,
    fileTypes: ['js', 'css'],
    includeAllFileTypes: true,
    includeFilesWithoutChunk: false,
    includeAuxiliaryAssets: false,
    includeDynamicImportedAssets: false,
    keepInMemory: false,
    integrity: false,
    removeFullPathAutoPrefix: false
  }, options);
}

AssetsWebpackPlugin.prototype = {
  constructor: AssetsWebpackPlugin,

  apply: function apply(compiler) {
    var self = this;

    self.options.path = path.resolve(self.options.useCompilerPath ? compiler.options.output.path || '.' : self.options.path || '.');
    self.writer = createQueuedWriter(createOutputWriter(self.options));

    var afterEmit = function afterEmit(compilation, callback) {
      var options = compiler.options;
      var stats = compilation.getStats().toJson({
        hash: true,
        publicPath: true,
        assets: true,
        chunks: false,
        modules: false,
        source: false,
        errorDetails: false,
        timings: false
      });

      var assetPath = stats.publicPath && self.options.fullPath ? stats.publicPath : '';
      // assetsByChunkName contains a hash with the bundle names and the produced files
      // e.g. { one: 'one-bundle.js', two: 'two-bundle.js' }
      // in some cases (when using a plugin or source maps) it might contain an array of produced files
      // e.g. {
      // main:
      //   [ 'index-bundle-42b6e1ec4fa8c5f0303e.js',
      //     'index-bundle-42b6e1ec4fa8c5f0303e.js.map' ]
      // }
      // starting with webpack 5, the public path is automatically determined when possible and the path is prefaced
      // with `/auto/`, the `removeAutoPrefix` option can be set to turn this off

      if (self.options.removeFullPathAutoPrefix) {
        if (assetPath.startsWith('auto')) {
          assetPath = assetPath.substring(4);
        }
      }

      var seenAssets = {};
      var chunks = void 0;

      if (self.options.entrypoints) {
        chunks = Object.keys(stats.entrypoints);
        if (self.options.includeFilesWithoutChunk) {
          chunks.push(''); // push "unnamed" chunk
        }
      } else {
        chunks = Object.keys(stats.assetsByChunkName);
        chunks.push(''); // push "unnamed" chunk
      }

      var output = chunks.reduce(function (chunkMap, chunkName) {
        var assets = void 0;

        if (self.options.entrypoints) {
          assets = chunkName ? stats.entrypoints[chunkName].assets : stats.assets;
        } else {
          assets = chunkName ? stats.assetsByChunkName[chunkName] : stats.assets;
        }

        if (self.options.includeAuxiliaryAssets && chunkName && stats.entrypoints[chunkName].auxiliaryAssets) {
          assets = [].concat(_toConsumableArray(assets), _toConsumableArray(stats.entrypoints[chunkName].auxiliaryAssets));
        }

        if (self.options.includeDynamicImportedAssets && chunkName && stats.entrypoints[chunkName].children) {
          var dynamicImportedChildAssets = getDynamicImportedChildAssets(options, stats.entrypoints[chunkName].children);
          assets = [].concat(_toConsumableArray(assets), _toConsumableArray(dynamicImportedChildAssets));
        }

        if (!Array.isArray(assets)) {
          assets = [assets];
        }
        var added = false;
        var typeMap = assets.reduce(function (typeMap, obj) {
          var asset = obj.name || obj;

          if (isHMRUpdate(options, asset) || isSourceMap(options, asset) || !chunkName && seenAssets[asset]) {
            return typeMap;
          }

          var typeName = getAssetKind(options, asset);
          if (self.options.includeAllFileTypes || self.options.fileTypes.includes(typeName)) {
            var combinedPath = assetPath && assetPath.slice(-1) !== '/' ? assetPath + '/' + asset : assetPath + asset;
            var type = _typeof(typeMap[typeName]);
            var compilationAsset = compilation.assets[asset];
            var integrity = compilationAsset && compilationAsset.integrity;
            var loadingBehavior = obj.loadingBehavior;

            if (type === 'undefined') {
              typeMap[typeName] = combinedPath;

              if (self.options.integrity && integrity) {
                typeMap[typeName + 'Integrity'] = integrity;
              }
            } else {
              if (type === 'string') {
                typeMap[typeName] = [typeMap[typeName]];
              }

              if (self.options.includeDynamicImportedAssets && loadingBehavior) {
                var typeNameWithLoadingBehavior = typeName + ':' + loadingBehavior;

                typeMap[typeNameWithLoadingBehavior] = typeMap[typeNameWithLoadingBehavior] || [];
                typeMap[typeNameWithLoadingBehavior].push(combinedPath);
              } else {
                typeMap[typeName].push(combinedPath);
              }
            }

            added = true;
            seenAssets[asset] = true;
          }
          return typeMap;
        }, {});

        if (added) {
          chunkMap[chunkName] = typeMap;
        }
        return chunkMap;
      }, {});

      var manifestNames = self.options.includeManifest === true ? ['manifest'] : self.options.includeManifest;

      if (typeof manifestNames === 'string') {
        manifestNames = [manifestNames];
      }

      if (manifestNames) {
        for (var i = 0; i < manifestNames.length; i++) {
          var manifestName = manifestNames[i];
          var manifestEntry = output[manifestName];

          if (manifestEntry) {
            var js = manifestEntry.js || manifestEntry.mjs;
            if (!Array.isArray(js)) {
              js = [js];
            }
            var manifestAssetKey = js[js.length - 1].substr(assetPath.length);
            var parentSource = compilation.assets[manifestAssetKey];
            var entryText = parentSource.source();
            if (!entryText) {
              throw new Error('Could not locate manifest function in source', parentSource);
            }
            manifestEntry.text = entryText;
          }
        }
      }

      if (self.options.metadata) {
        output.metadata = self.options.metadata;
      }

      if (!compiler.outputFileSystem.readFile) {
        compiler.outputFileSystem.readFile = fs.readFile.bind(fs);
      }

      if (!compiler.outputFileSystem.join) {
        compiler.outputFileSystem.join = path.join.bind(path);
      }

      self.writer(compiler.outputFileSystem, output, function (err) {
        if (err) {
          compilation.errors.push(err);
        }
        callback();
      });
    };

    if (compiler.hooks) {
      var plugin = { name: 'AssetsWebpackPlugin' };

      compiler.hooks.afterEmit.tapAsync(plugin, afterEmit);
    } else {
      compiler.plugin('after-emit', afterEmit);
    }
  }
};

module.exports = AssetsWebpackPlugin;