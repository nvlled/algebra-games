let Util = require("src/client/algebra/Util");
let Anima = require("src/client/algebra/Anima");

let M = {
    create(text, fontStyle) {
        let self = new PIXI.Container();
        self.text = new PIXI.Text(text, fontStyle);
        self.fontStyle = fontStyle;
        return self;
    },

    async setText(self, text, {x=0, y=0}={}) {
        let t = new PIXI.Text(text, self.fontStyle);
        t.x = 0;
        t.y = 0;
        self.addChild(t);
        await Anima.fadeLift(t, {
            seconds: 2.3,
        }); 
        t.destroy(true);
    },
}
M.new = Util.constructor(M);
module.exports = M;
