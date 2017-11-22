let path = require("path");
let Util = require("src/client/algebra/Util");

let filenames = [
	"ground_01.png",
	"ground_02.png",
	"ground_03.png",
	"ground_04.png",
	"ground_05.png",
	"ground_06.png",
	"metile.png",
];

let dir = "static/images/Ground";
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

    get(filename) {
        return dir+"/"+filename;
    },

    randomName(exclude) { return Util.randomSelect(bgnames, exclude)[0]; },

    randomTexture(resources, exclude) {
        return resources[M.randomName(exclude)].texture;
    },

    random(resources, exclude) {
        return new PIXI.Sprite(resources[M.randomName(exclude)].texture);
    },
}

module.exports = M;

