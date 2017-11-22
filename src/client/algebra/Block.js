let Vec = require("src/client/algebra/Vec");
let Util = require("src/client/algebra/Util");

function indexToXY({i, cols}) {
    return {
        x: i % cols,
        y: Math.floor(i / cols),
    }
}

let M = {
    create({
        pos={x: 0, y: 0},
        data=[],
        cols=1,
        rows=data.length/cols,
        pivot=Math.floor(cols/2),
        square=false,
        rigid=true,
    } = {}) {
        return {
            data,
            cols,
            rows,
            square,
            pivot,
            // TODO: decide if to return null or what
            points: data.map((_, i) => {
                let p = Vec.new(pos).add(indexToXY({i, cols}));
                return p;
            }),
        }
    },
    destroy(self) {
        for (let s of self.data) {
            s.visible = true;
            if (s.destroy)
                s.destroy();
        }
    },
}
M.new = Util.constructor(M);
module.exports = M;
