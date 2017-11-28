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

        let width  = cols != null && cols != 0
            ? tileWidth*cols : image.width;
        let height = rows != null && rows != 0
            ? tileHeight*rows : image.height;

        let x = 0;
        let y = 0;
        while (y < height) {
            let rect = new PIXI.Rectangle(x, y, tileWidth, tileHeight);
            let texture;
            texture = new PIXI.Texture(image, rect)

            textures.push(texture);
            x += tileWidth;
            if (x >= width) {
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
        else if (cols == null)
            cols = 0;

        return {
            textures,
            rows, cols,
        }
    },

    get(self, i) {
        return self.textures[i];
    },

    createSprite(self, i) {
        let t = self.textures[i];
        return new PIXI.Sprite(t);
    },

    createSpriteXY(self, x, y) {
        let i = y*self.cols + x;
        return M.createSprite(self, i);
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
