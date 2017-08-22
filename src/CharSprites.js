let Util = require("src/Util");
let AniSprite = require("src/AniSprite");
let TextureSet = require("src/TextureSet");
let dir = "images/chars";
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
                    sprite.startIdling();
                    return sprite;
                });
            }
        }
        return ctors;

        //sprite.width = 64;
        //sprite.height = 64;
        //sprite.y = 64;
        //sprite.x = 64;

        //sprite.setState("walkRight");
        //setTimeout(x=>sprite.setState("walkLeft"), 2000);
        //gameStage.addChild(sprite);
    },
}

M.new = Util.constructor(M);
module.exports = M;


