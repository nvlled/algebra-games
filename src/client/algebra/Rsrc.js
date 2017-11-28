
let PIXI = require("src/client/pixi");
let TextureSet = require("src/client/algebra/TextureSet");

let {Texture, Sprite} = PIXI;
let txtr = filename => Texture.from("static/images/"+filename);

let cakeTxtr = TextureSet.new({
    cols: 5,
    rows: 9,
    tileWidth: 64,
    tileHeight: 64,
    exclude: 1,
    image: txtr("cake.png")
});

let konettTxtr = TextureSet.new({
    cols: 5,
    rows: 6,
    tileWidth: 64,
    tileHeight: 64,
    exclude: 2,
    image: txtr("konett.png"),
});

let sharm = {
    tiles() {
        let t = TextureSet.new({
            cols: 8,
            rows: 10,
            tileWidth: 16,
            tileHeight: 16,
            image: txtr("sharm/tiles.png"),
        });
        return t;
    },
    characters() {
        let t = TextureSet.new({
            cols: 12,
            rows: 8,
            tileWidth: 16,
            tileHeight: 16,
            image: txtr("sharm/characters.png"),
        });
        return t;
    },
    charSprite() {
    },
}

let M = {
    cake: () => cakeTxtr.textures.map(t=>new Sprite(t)),
    konett: () => konettTxtr.textures.map(t=>new Sprite(t)),

    sharm,
    numbers: () => {
        let t = TextureSet.new({
            cols: 5,
            rows: 2,
            tileWidth: 155.6,
            tileHeight: 175.5,
            image: txtr("numbers_set.png"),
        });
        return t;
    },
}

module.exports = M;

