
let PIXI = require("src/client/pixi");
let Vec = require("src/client/algebra/Vec");
let Block = require("src/client/algebra/Block");
let Util = require("src/client/algebra/Util");
let Rect = require("src/client/algebra/Rect");
let Waypoint = require("src/client/algebra/Waypoint");
let Tileset = require("src/client/algebra/Tileset");
let Inspector = require("src/client/algebra/Inspector");
let PixiUtil = require("src/client/algebra/PixiUtil");
let SpriteSel = require("src/client/algebra/SpriteSel");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let GraphicTable = require("src/client/algebra/GraphicTable");

let M = {
    create({
        textureSet,
        states,
        defaultState="idle",
        animationSpeed=0.5,
    }) {
        let indices =  states[defaultState];
        let textures = textureSet.indexTextures(indices);
        let sprite = new PIXI.extras.AnimatedSprite(textures);

        sprite.state = defaultState;
        sprite.states = states;
        sprite.textureSet = textureSet;
        sprite.animationSpeed = animationSpeed;
        sprite.lastStateUpdate = +new Date;
        sprite.play();
        return sprite;
    },

    startIdling(self) {
        self.on("removed", () => {
            M.stopIdling(self);
        });

        let bored = () => {
            if ((+new Date) - self.lastStateUpdate > 3000) {
                let [state] = Util.randomSelect(Object.keys(self.states));
                M.setState(self, state);
            }
        }
        let loop = () => {
            bored();
            self.timerId = setTimeout(loop, 3000 + Math.random()*2000);
        }
        loop();
    },

    stopIdling(self) {
        clearInterval(self.timerId);
    },

    setState(self, name, randomDelay=false) {
        async function potatoChips() {
            if (self.state == name)
                return;
            self.state = name;
            if (randomDelay) {
                await Util.sleep(Math.random()*1000);
            }

            let textures = M.getStateTextures(self, name);
            if (textures) {
                self.textures = textures;
                self.play();
            }
            self.lastStateUpdate = +new Date;
        }
        potatoChips();
    },

    getStateTextures(self, name) {
        let indices = self.states[name];
        if (!indices) {
            console.warn("unknown state name: " + name);
            return;
        }
        return self.textureSet.indexTextures(indices);
    }
}
M.new = Util.constructor(M);
module.exports = M;
