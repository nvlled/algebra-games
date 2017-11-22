const path = require('path');

module.exports = {
    //entry: ["babel-polyfill", "./src/main.js"],
    entry: {
        index:     ["babel-polyfill", './dist/client/page-scripts/index.js'],
        mapeditor: './dist/client/page-scripts/mapeditor.js',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'static/scripts')
    },

    module: {
        rules: [
        {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['env']
                }
            }
        }
        ],
        loaders: [
        ],
    },
};



