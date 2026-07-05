const path = require('path');

/** Node-target bundle of the parser + generator for the headless round-trip tests. */
module.exports = {
  mode: 'development',
  target: 'node',
  devtool: false,
  entry: path.resolve(__dirname, 'test/roundtrip.entry.ts'),
  output: {
    filename: 'roundtrip.bundle.js',
    path: path.resolve(__dirname, 'test/dist'),
    library: { type: 'commonjs2' },
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  // Blockly's node build pulls in jsdom, whose dynamic requires trip
  // webpack's critical-dependency warning; they are harmless here.
  ignoreWarnings: [{ module: /jsdom/ }],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};
