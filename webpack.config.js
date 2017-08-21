var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var path = require('path')
var webpack = require('webpack')

module.exports = {
    node: {fs: "empty"},
    entry: "./src/main.js",
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
        //new CopyWebpackPlugin([{from: "./images", to: "images/"}]),
    ],
    module: {
        loaders: [
            //{ test: /\.js?$/, loader: "ts-loader" },

        //{
        //    test: /\.js$/,
        //    loader: require.resolve("identity-loader"),
        //},
        //{
        //    test: /\.(js|jsx)$/,
        //    exclude: /(node_modules|bower_components)/,
        //    loader: require.resolve('babel-loader'),
        //    options: {
        //        babelrc: false,
        //        presets: ["env"],
        //        cacheDirectory: true,
        //    },
        //},
        //{ 
        //    test: /\.css$/, loader: "style!css" 
        //},
        //{
        //    test: /\.json$/,
        //    loader: 'file-loader',
        //    options: {
        //        name: 'static/media/[name].[hash:8].[ext]',
        //    },
        //},
        //{
        //    test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
        //    loader: require.resolve('url-loader'),
        //    options: {
        //        limit: 10000,
        //        name: 'static/media/[name].[hash:8].[ext]',
        //    },
        //},
        ],
    },
};


