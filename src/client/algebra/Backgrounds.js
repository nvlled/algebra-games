let path = require("path");
let Util = require("src/client/algebra/Util");
let PIXI = require("src/client/pixi");

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
    "wizardtower.png",
];

let dir = "static/images/backgrounds";
let bgnames = [];
let M = {
    dir,

    loadTextures(loader) {
        bgnames = [];
        for (let filename of filenames) {
            let ext = path.extname(filename);
            let name = path.basename(filename, ext);
            loader.add(name, `${dir}/${filename}`);
            bgnames.push(name);
        }
    },

    fullpath(filename) {
        return dir+"/"+filename;
    },

    randomName() { return Util.randomSelect(bgnames)[0]; },

    random(resources) {
        return new PIXI.Sprite(resources[M.randomName()].texture);
    },
}

module.exports = M;
