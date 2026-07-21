const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/assets/js/block_minijava.ts'),
  output: {
    filename: 'block_minijava.js',
    path: path.resolve(__dirname, 'docs'),
    // `docs/` is also the tracked GitHub Pages root. Preserve hand-authored
    // refactor documentation while replacing generated application artifacts.
    clean: { keep: /ui-refactor\// },
    publicPath: ''
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
      scriptLoading: 'defer'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/assets/images'),
          to: 'assets/images',
          noErrorOnMissing: true
        }
      ]
    })
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'docs')
    },
    hot: true,
    open: true
  }
};
