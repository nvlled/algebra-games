var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var path = require('path')
var webpack = require('webpack')

module.exports = {
    node: {fs: "empty"},
    entry: ["babel-polyfill", "./src/main.js"],
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js"
    },
    //devtool: "eval",
    resolve: {
        extensions: [".js"],
        //alias: {
        //    src: path.resolve(__dirname, "src/"),
        //    images: path.resolve(__dirname, "images/"),
        //},
    },
    plugins: [
        //new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
            template: './index.html'
        }),
        new CopyWebpackPlugin([{from: "./images", to: "images/"}]),
    ],
    module: {
        rules: [
        ],

        loaders: [
        ],
    },
};


