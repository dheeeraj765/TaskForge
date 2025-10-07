// apps/client/webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

const MODE = process.env.NODE_ENV || 'development';
const IS_DEV = MODE !== 'production';

const PROD_BACKEND_DEFAULT =
  process.env.API_URL || 'https://potential-goggles-5gv959p6jxqwc7qrq-4000.app.github.dev';

const API_URL_FOR_APP = IS_DEV ? '' : PROD_BACKEND_DEFAULT;
const PROXY_TARGET = process.env.PROXY_TARGET || 'http://localhost:4000';

module.exports = {
  mode: MODE,
  entry: path.resolve(__dirname, 'src/main.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/js/bundle.[contenthash].js',
    publicPath: '/',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader', options: { cacheDirectory: true } }
      },
      { test: /\.(scss|css)$/i, use: ['style-loader', 'css-loader', 'sass-loader'] },
      {
        test: /\.(png|jpe?g|gif|svg|woff2?|ttf|eot)$/i,
        type: 'asset/resource',
        generator: { filename: 'assets/[name][hash][ext][query]' }
      }
    ]
  },
  resolve: { extensions: ['.js'] },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
      inject: 'body'
    }),
    new webpack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(API_URL_FOR_APP),
      'process.env.NODE_ENV': JSON.stringify(MODE)
    })
  ],
  devServer: {
    static: { directory: path.resolve(__dirname, 'dist') },
    historyApiFallback: true,
    compress: true,
    host: '0.0.0.0',
    port: 5173,
    hot: true,
    allowedHosts: 'all',
    client: { overlay: true },
    proxy: IS_DEV
      ? {
          '/api': {
            target: PROXY_TARGET,
            changeOrigin: true,
            secure: false,
            ws: true
          }
        }
      : undefined
  },
  performance: { hints: false }
};