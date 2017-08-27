let path = require("path");
let Util = require("src/Util");
let PIXI = require("pixi.js");

let filenames = [
    "backdrop.png",
    "background.png",
    "bg5.jpg",
    "cyberglow.png",
    "dark background.png",
    "grassy_plains_by_theodenn.jpg",
    "industrial-background.jpg",
    "pyramid-background.svg",
    "pyramid.jpg",
    "sky5.png",
    "starfield2.jpg",
    "sunsetintheswamp.png",
    "tilesetOpenGameBackground.png",
    "tron.png",
    "voodoo_cactus_underwater.jpg",
    "wizardtower.png",
];

let dir = "images/backgrounds";
let bgnames = [];
let M = {

    loadTextures(loader) {
        bgnames = [];
        for (let filename of filenames) {
            let ext = path.extname(filename);
            let name = path.basename(filename, ext);
            loader.add(name, `${dir}/${filename}`);
            bgnames.push(name);
        }
    },

    randomName() { return Util.randomSelect(bgnames)[0]; },

    random(resources) {
        return new PIXI.Sprite(resources[M.randomName()].texture);
    },
}

module.exports = M;
