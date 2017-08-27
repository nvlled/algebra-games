let path = require("path");
let Util = require("src/Util");
let PIXI = require("pixi.js");

let filenames = [
	"ground_01.png",
	"ground_02.png",
	"ground_03.png",
	"ground_04.png",
	"ground_05.png",
	"ground_06.png",
	"metile.png",
];

let dir = "images/Ground";
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

    randomTexture(resources) {
        return resources[M.randomName()].texture;
    },

    random(resources) {
        return new PIXI.Sprite(resources[M.randomName()].texture);
    },
}

module.exports = M;

