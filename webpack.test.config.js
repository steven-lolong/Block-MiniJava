const path = require('path');

/** Node-target bundles of the parser, generator and type checker for the headless tests. */
module.exports = {
  mode: 'development',
  target: 'node',
  devtool: false,
  entry: {
    roundtrip: path.resolve(__dirname, 'test/roundtrip.entry.ts'),
    typecheck: path.resolve(__dirname, 'test/typecheck.entry.ts'),
    machine: path.resolve(__dirname, 'test/machine.entry.ts'),
    subst: path.resolve(__dirname, 'test/subst.entry.ts'),
    smoke: path.resolve(__dirname, 'test/smoke-csesk.entry.ts')
  },
  output: {
    filename: '[name].bundle.js',
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
