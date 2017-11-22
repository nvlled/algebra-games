let Util = require("src/client/algebra/Util");
let PIXI = require("src/client/pixi");

let M = {
    create({
        image,
        tileWidth,
        tileHeight,
        cols, rows,
        exclude=0,
    }) {
        if (cols != null && tileWidth == null)
            tileWidth = image.width/cols;
        if (rows != null && tileHeight == null)
            tileHeight = image.height/rows;

        let countRows = rows == null;
        if (countRows)
            rows = 0;

        let textures = [];

        let x = 0;
        let y = 0;
        while (y < image.height) {
            let rect = new PIXI.Rectangle(x, y, tileWidth, tileHeight);
            let texture = new PIXI.Texture(image, rect)
            textures.push(texture);
            x += tileWidth;
            if (x >= image.width) {
                x = 0;
                y += tileHeight;
                if (countRows)
                    rows++;
            }
            if (cols != null && 
                textures.length >= cols*rows - exclude)
                break;
        }

        if (cols == null && rows != 0)
            cols = textures.length/rows;
        else
            cols = 0;

        return {
            textures,
            rows, cols,
        }
    },

    indexTextures(self, indices) {
        return self.textures.filter((_, i) => indices.indexOf(i) >= 0);
    },

    random(self) {
        return Util.randomSelect(self.textures)[0];
    },
}
M.new = Util.constructor(M);

module.exports = M;
