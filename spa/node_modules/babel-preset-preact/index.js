var jsxTransform = require('@babel/plugin-transform-react-jsx');

module.exports = function() {
  return {
    plugins: [
      [jsxTransform, { pragma: 'h' }]
    ]
  };
};
