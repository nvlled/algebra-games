let PIXI = require("src/client/pixi");

let M = {
    create(width, height) {
        return new Proxy(new PIXI.Container(), {
            set(target, name, value) {
                let resize = false;
                if (name == "width") {
                    width = value;
                    resize = true;
                } else if (name == "height") {
                    height = value;
                    resize = true;
                } else {
                    target[name] = value;
                }
                if (resize && typeof target.onResize == "function") {
                    target.onResize(width, height);
                }
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
