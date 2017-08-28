let Util = require("src/Util");
let PIXI = require("pixi.js");

let M = {
    create({
        image,
        tileWidth,
        tileHeight,
        cols, rows
    }) {
        if (cols != null && tileWidth == null)
            tileWidth = image.width/cols;
        if (rows != null && tileHeight == null)
            tileHeight = image.height/rows;

        let textures = [];
        rows = 0;
        let x = 0;
        let y = 0;
        while (y < image.height) {
            let rect = new PIXI.Rectangle(x, y, tileWidth, tileHeight);
            textures.push(new PIXI.Texture(image, rect));
            x += tileWidth;
            if (x >= image.width) {
                x = 0;
                y += tileHeight;
                rows++;
            }
        }
        cols = textures.length/rows;
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
