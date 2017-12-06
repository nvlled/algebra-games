const path = require('path');

module.exports = {
    entry: {
        index:     './dist/client/page-scripts/index.js',
    },
    devtool: "eval",
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'static/scripts')
    },
};



