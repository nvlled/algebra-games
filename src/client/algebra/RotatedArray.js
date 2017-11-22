let Vec = require("src/client/algebra/Vec");

let M = {
    create({rows=0, cols=0}, {x, y}, array) {
        let dir, start;
        let vertical = true;
        if (x == 0 && y > 0) {
            start = { x: 0, y: 0 };
            dir   = { x: 1, y: 1 };
        } else if (x == 0 && y < 0) {
            start = { x: cols-1, y: rows-1 };
            dir   = { x:-1, y:-1 };
        } else {
            vertical = false;
            if (x > 0 && y == 0) {
                start = { x: 0, y: rows-1};
                dir   = { x: 1, y:-1 };
            } else if (x < 0 && y == 0) {
                start = { x: cols-1, y: 0};
                dir   = { x:-1, y: 1 };
            } else {
                throw "invalid vector for array rotation";
            }
        }
        let end = Vec.new(dir).times({x: rows, y: cols}).add(start);

        let indexMap = [];
        if (vertical) {
            for (let i = start.y; i != end.y; i+= dir.y) {
                for (let j = start.x; j != end.x; j+= dir.x) {
                    let idx = i*cols + j;
                    indexMap.push(idx);
                }
            }
        } else {
            for (let j = start.x; j != end.x; j+= dir.x) {
                for (let i = start.y; i != end.y; i+= dir.y) {
                    let idx = i*cols + j;
                    indexMap.push(idx);
                }
            }
        }
        let self = {
            rows,
            cols,
            array,
            indexMap,
            translate(x, y) {
                let idx = indexMap[y*cols + x];
                return {
                    x: Math.floor(idx%cols),
                    y: Math.floor(idx/cols),
                }
            },
        }
        return new Proxy(self, {
            get(target, k) {
                if (isNaN(+k))
                    return target[k];
                let i = indexMap[k];
                return array[i];
            },
            set(target, k, v) {
                if (isNaN(+k))
                    target[k] = v;
                let i = indexMap[k];
                array[i] = v;
            },
        });
    }
}

module.exports = M;
