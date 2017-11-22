let Util = require("src/client/algebra/Util");
let Grid = require("src/client/algebra/Grid");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");

let M = {
    create(graphicAlgebra, args) {
        let {rows, cols} = graphicAlgebra.getSize();
        let {algebra} = graphicAlgebra;
        args.cols = cols;
        args.rows = rows;

        if (graphicAlgebra.getTexture("equals"))
            args.cols++;
        let grid = Grid.new(args);

        grid.eachRowIndex(y => {
            let row = algebra.table[y].slice();
            if (row.length < args.cols) {
                let z = row.pop();
                row.push("equals");
                row.push(z);
            }
            row.forEach((elem, x) => {
                let sprite = graphicAlgebra.createSprite(elem);
                grid.setSprite({x, y, sprite, fit: true});
            });
        });

        return {
            grid,
        }
    },
}
M.new = Util.constructor(M);

module.exports = M;


