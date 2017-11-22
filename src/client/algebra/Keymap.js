let Keyboard = require("src/client/algebra/Keyboard");
let Util = require("src/client/algebra/Util");

let M = {
    create(args) {
        let handlers = [];
        for (let [keyCode, handler] of Object.entries(args)) {
            switch (keyCode) {
                case "left":  keyCode = 37; break;
                case "up":    keyCode = 38; break;
                case "right": keyCode = 39; break;
                case "down":  keyCode = 40; break;
            }
            let kb = Keyboard(keyCode);
            kb.press = handler;
            handlers.push(kb);
        }
        let self = { handlers };
        return self;
    },
    listen(self) {
        for (let kb of self.handlers)
            kb.listen();
    },
    unlisten(self) {
        for (let kb of self.handlers)
            kb.unlisten();
    },
}
M.new = Util.constructor(M);
module.exports = M;
