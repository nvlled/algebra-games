let Util = require("src/Util");
let AniSprite = require("src/AniSprite");
let TextureSet = require("src/TextureSet");
let dir = "images/monsters";
let names = ["bat", "bee", "big_worm", "eyeball", "ghost", "man_eater_flower", "pumpking", "slime", "small_worm", "snake"];
let M = {
    create({
        tileWidth=31, tileHeight=31,
    }={}) {
        return {
            tileWidth, tileHeight,
            textureSets: [],
        }
    },

    loadTextures(self, loader) {
        names.forEach(name => loader.add(name, dir+"/"+name+".png"));
    },

    getConstructors(self, resources) {
        let n = 12;
        let {tileHeight, tileWidth} = self;
        let ctors = [];
        names.forEach(name => {
            if (!self.textureSets[name]) {
                let image = resources[name].texture;
                self.textureSets[name] = 
                    TextureSet.new({image, cols: 3, rows: 4});
            }
            let textureSet = self.textureSets[name];
            ctors.push(args => {
                let sprite = AniSprite.new(Object.assign({
                    textureSet: textureSet,
                    states: {
                        idle: [7],
                        right: [9,10,11],
                        down: [6,7,8],
                        left: [3,4,5],
                        up: [0,1,2],
                    },
                    animationSpeed: 0.05
                }, args));
                sprite.startIdling();
                return sprite;
            });
        });
        return ctors;
    },
}

M.new = Util.constructor(M);
module.exports = M;


