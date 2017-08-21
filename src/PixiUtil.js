let PIXI = require("pixi.js");
let Vec = require("src/Vec");

let PixiUtil = {
    point(container, x, y) {
        let g = new PIXI.Graphics();
        g.beginFill(0xaa0000, 0.5);
        g.drawCircle(0, 0, 5);
        g.endFill();
        g.x = x;
        g.y = y;
        container.addChild(g);
        return g;
    },
    containerPos(container, pos) {
        let {x, y} = pos;
        let {x:sx, y:sy} = world.scale;
        let [gx,gy] = [(x+world.x)/sx, (y+world.y)/sy];
        return Vec.create(gx, gy);
    },
}

module.exports = PixiUtil;
