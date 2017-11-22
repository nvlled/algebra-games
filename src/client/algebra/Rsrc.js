
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

let M = {
    cake: () => cakeTxtr.textures.map(t=>new Sprite(t)),
    konett: () => konettTxtr.textures.map(t=>new Sprite(t)),
}

module.exports = M;

//let sprite = AniSprite.new(Object.assign({
//    textureSet: textureSet,
//    states: {
//        idle: [7],
//        left: [9,10,11],
//        down: [6,7,8],
//        right: [3,4,5],
//        up: [0,1,2],
//    },
//    animationSpeed: 0.05
//}, args));
