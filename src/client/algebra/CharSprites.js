let Util = require("src/client/algebra/Util");
let AniSprite = require("src/client/algebra/AniSprite");
let TextureSet = require("src/client/algebra/TextureSet");
let dir = "static/images/chars";
let M = {
    create({
        tileWidth=16, tileHeight=17,
    }={}) {
        return {
            tileWidth, tileHeight,
            textureSets: [],
        }
    },

    loadTextures(self, loader) {
        let n = 12;
        for (let s of ["M", "F"]) {
            for (let i = 1; i < n; i++) {
                let name = s+"_"+Util.leftpad(i+"", 2, "0");
                loader.add(name, dir+"/"+name+".png");
            }
        }
    },

    getConstructors(self, resources) {
        let n = 12;
        let {tileHeight, tileWidth} = self;
        let ctors = [];
        for (let s of ["M", "F"]) {
            for (let i = 1; i < n; i++) {
                let name = s+"_"+Util.leftpad(i+"", 2, "0");
                if (!self.textureSets[name]) {

                    let image = resources[name].texture;
                    if (image.width == 1 && image.height == 1)
                        continue;

                    self.textureSets[name] = 
                        TextureSet.new({image, tileWidth, tileHeight});
                }
                let textureSet = self.textureSets[name];
                ctors.push(args => {
                    let sprite = AniSprite.new(Object.assign({
                        textureSet: textureSet,
                        states: {
                            idle: [0],
                            right: [1,5,9],
                            down: [0, 4, 8],
                            left: [3,7,11],
                            up: [2, 6, 10],
                        },
                        animationSpeed: 0.1
                    }, args));
                    return sprite;
                });
            }
        }
        return ctors;
    },
}

M.new = Util.constructor(M);
module.exports = M;


