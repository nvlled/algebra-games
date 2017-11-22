let PIXI = require("src/client/pixi");

let M = {
    create(width, height) {
        return new Proxy(new PIXI.Container(), {
            set(target, name, value) {
                if (name == "width") 
                    width = value;
                else if (name == "height") 
                    height = value;
                else
                    target[name] = value;
                return true;
            },
            get(target, name) {
                if (name == "width")
                    return width;
                if (name == "height")
                    return height;
                return target[name];
            },
        });
    },
}
module.exports = M;
