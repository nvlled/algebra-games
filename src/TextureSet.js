let Util = require("src/Util");
let PIXI = require("pixi.js");

let M = {
    create({
        image,
        tileWidth=tileSize,
        tileHeight=tileSize,
    }) {
        let textures = [];
        let rows = 0;
        let x = 0;
        let y = 0;
        while (y+tileHeight < image.height) {
            let rect = new PIXI.Rectangle(x, y, tileWidth, tileHeight);
            textures.push(new PIXI.Texture(image, rect));
            x += tileWidth;
            if (x+tileWidth >= image.width) {
                x = 0;
                y += tileHeight;
                rows++;
            }
        }
        let cols = textures.length/rows;
        return {
            textures,
        }
    },

    random(self) {
        return Util.randomSelect(self.textures)[0];
    },
}
M.new = Util.constructor(M);

module.exports = M;
