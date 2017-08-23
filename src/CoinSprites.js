
let Util = require("src/Util");
let AniSprite = require("src/AniSprite");
let TextureSet = require("src/TextureSet");
let dir = "images/coins";
let M = {
    create({
        tileWidth=32, tileHeight=32,
    }={}) {
        return {
            tileWidth, tileHeight,
            textureSets: [],
            names: ["coin_copper","coin_silver","coin_gold"], 
        }
    },

    loadTextures(self, loader) {
        let n = 12;
        for (let name of self.names) {
                loader.add(name, dir+"/"+name+".png");
        }
    },

    getConstructors(self, resources) {
        let n = 12;
        let {tileHeight, tileWidth} = self;
        let ctors = [];
        for (let name of self.names) {
            if (!self.textureSets[name]) {
                let image = resources[name].texture;
                self.textureSets[name] = 
                    TextureSet.new({image, tileWidth, tileHeight});
            }
            let textureSet = self.textureSets[name];
            ctors.push(args => {
                let indices = Util.range(textureSet.textures.length);
                let indices_ = indices.reverse();
                let sprite = AniSprite.new(Object.assign({
                    textureSet: textureSet,
                    states: {
                        idle: indices,
                        right: indices,
                        down: indices,
                        left: indices_,
                        up: indices_,
                    },
                    animationSpeed: 0.1
                }, args));
                sprite.startIdling();
                return sprite;
            });
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


