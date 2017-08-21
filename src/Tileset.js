let Util = require("src/Util");

// loads a tile data created with tiled
let Tileset = {
    create({image, data, module} = {}) {
        let tileset = Util.extend({}, data);
        let {tilecount, tilewidth, tileheight, columns} = data;
        for (let [k, obj] of Object.entries(tileset.tiles)) {
            console.log("gid", k, );
            let name = obj.objectgroup.name;
            let idx = parseInt(k);
            let [i, j] = [Math.floor(idx/columns), idx%columns];
            let [x, y] = [i*tileheight, j*tilewidth];
            let rect = new module.Rectangle(x, y, tilewidth, tileheight);
            tileset[name] = new module.Texture(image, rect);
        }
        return tileset;
    },
    tileAt(self) {
        let tileset = Util.extend({}, self);
        let {tilecount, columns} = tileset;
        let rows = tilecount/columns;
    },
}

module.exports = Tileset;
