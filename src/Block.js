let Vec = require("src/Vec");

function indexToXY({i, cols}) {
    return {
        x: i % cols,
        y: Math.floor(i / cols),
    }
}

let Block = {
    create({
        pos={x: 0, y: 0},
        data=[],
        cols=1,
        rows=data.length/cols,
        pivot=Math.floor(cols/2),
        noRotate=false,
        rigid=true,
    } = {}) {
        return {
            data,
            cols,
            rows,
            noRotate,
            pivot,
            // TODO: decide if to return null or what
            points: data.map((_, i) => {
                let p = Vec.new(pos).add(indexToXY({i, cols}));
                return p;
            }),
        }
    },
}
module.exports = Block;
