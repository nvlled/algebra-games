const path = require('path');

module.exports = {
    entry: {
        index:     ["babel-polyfill", './dist/client/page-scripts/index.js'],
    },
    //devtool: "source-map",
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
                    presets: ['env', 'es2015']
                }
            }
        }
        ],
        loaders: [
        ],
    },
};

