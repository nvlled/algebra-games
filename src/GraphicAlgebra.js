let Util = require("src/Util");
let PIXI = require("pixi.js");
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
        let sprite =  new PIXI.Sprite(texture);
        sprite[ELEM] = elem;
        return sprite;
    },

    randomElement(self) {
        return self.algebra.randomElement();
    },

    randomSprite(self) {
        return M.createSprite(self, M.randomElement(self));
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

    getSize(self) {
        return self.algebra.getSize();
    },

    apply(self, ...elems) {
        let {algebra} = self;
        return algebra.apply(...elems);
    },

    applySprites(self, ...sprites) {
        let {algebra} = self;
        let args = sprites.map(s => s[ELEM]);
        let elem = algebra.apply(...args);
        if (elem)
            return M.createSprite(self, elem);
        return null;
    },
}
M.new = Util.constructor(M);

module.exports = M;
