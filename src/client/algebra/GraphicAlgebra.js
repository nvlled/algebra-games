let Util = require("src/client/algebra/Util");
let PIXI = require("src/client/pixi");
let ELEM = Symbol();

let M = {
    create({
        algebra,
        textures,
    }) {
        return {algebra, textures};
    },

    createSprite(self, elem) {
        let {textures} = self;
        let texture = textures[elem];
        if (!texture) {
            throw "no texture found for elem: " + elem;
        }
        if (typeof texture == "function") {
            texture = texture();
        }

        if (texture instanceof PIXI.Sprite) {
            if (texture.setState) {
                texture[ELEM] = elem;
                return texture;
            } else {
                texture = texture.texture;
            }
        }

        let sprite =  new PIXI.Sprite(texture);
        sprite[ELEM] = elem;
        return sprite;
    },

    randomElement(self, withIdentity) {
        return self.algebra.randomElement(withIdentity);
    },

    randomSprite(self, withIdentity) {
        return M.createSprite(self, M.randomElement(self, withIdentity));
    },

    createAllSprites(self) {
        return self.algebra.elems.map(elem => {
            return M.createSprite(self, elem);
        });
    },

    getTexture(self, elem) {
        let {textures} = self;
        return textures[elem];
    },

    getElem(self, sprite) {
        if (!sprite)
            return null;
        return sprite[ELEM];
    },

    getElems(self) {
        return self.algebra.elems;
    },

    getElemArgs(self) {
        return self.algebra.elemArgs;
    },

    getIdentity(self) {
        return self.algebra.identity;
    },

    getSize(self) {
        return self.algebra.getSize();
    },

    getMaxArgLen(self) {
        return self.algebra.getMaxArgLen();
    },

    apply(self, ...elems) {
        let {algebra} = self;
        return algebra.apply(...elems);
    },

    applySprites(self, ...sprites) {
        let {algebra} = self;
        let args = sprites.map(s => s ? s[ELEM] : null).filter(x => x);
        let elem = algebra.apply(...args);
        if (elem)
            return M.createSprite(self, elem);
        return null;
    },
}
M.new = Util.constructor(M);

module.exports = M;
