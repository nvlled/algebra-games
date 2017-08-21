let Util = require("src/Util");
let Rect = require("src/Rect");
let PixiUtil = require("src/PixiUtil");
let Vec = require("src/Vec");
let PIXI = require("pixi.js");

let SELECTED = Symbol();
let CLICK = Symbol();
let REGION = Symbol();

let SpriteSel = {
    new(...args) {
        return Util.wrap(SpriteSel.create(...args), SpriteSel.Proto);
    },
    create({
        fill = 0xaa0000, 
        radius = 2,
        //camera,
    } = {}) {
        let obj = {radius, fill};
        obj.sprites = [];
        //obj.g = new PIXI.Graphics(0, 0, 100, 100);
        //obj.camera = camera;
        return obj;
    },
    _draw(self, obj) {
        let {radius, fill} = self;
        let g = obj[SELECTED];
        if (!g.parent)
            return;
        let {width, height, scale} = g.parent;
        let r = { width: width/scale.x, height: height/scale.y, 
            x: 0, y: 0, anchor: g.parent.anchor};
        let {left, up, right, down} = Util.wrap(r, Rect);

        g.clear();
        g.beginFill(fill);
        let radius_ = radius/((scale.x+scale.y)/2);
        console.log(radius, scale.x, scale.y, radius_);
        g.drawCircle(left, up,    radius_);
        g.drawCircle(right, up,   radius_);
        g.drawCircle(left, down,  radius_);
        g.drawCircle(right, down, radius_);
        g.endFill();
    },
    clearSelect(self) {
        SpriteSel.unselect(self, ...self.sprites);
    },
    select(self, ...objs) {
        for (let obj of objs) {
            if (obj[SELECTED])
                continue;
            let g = new PIXI.Graphics();
            self.sprites.push(obj);
            obj[SELECTED] = g;
            obj.addChild(g);
            SpriteSel._draw(self, obj);
        }
        if (self.onSpriteSelect)
            self.onSpriteSelect(...objs);
    },
    unselect(self, ...objs) {
        for (let obj of objs) {
            if (!obj[SELECTED])
                continue;
            let g = obj[SELECTED];
            g.clear();
            g.destroy();
            delete obj[SELECTED];
            Util.remove(self.sprites, obj);
        }
    },
    getSelected(self) {
        return self.sprites[0];
        //return self.g.parent;
    },
    getAllSelected(self) {
        return self.sprites;
    },
    addClickHandler(self, obj) {
        if (obj[CLICK])
            return;
        obj[CLICK] = function(e) {
            if (self.regionActive)
                return;
            SpriteSel.select(sel, obj);
        }
        obj.addListener("click", obj[CLICK]);
    },
    removeClickHandler(self, obj) {
        e.stopPropagation();
        obj.removeListener("click", obj[CLICK]);
    },

    addRegionHandler(self, container) {
        if (container[REGION])
            return;

        let pos1 = null;
        let pos2 = null;
        let rect = null;
        let mousedown = e => {
            SpriteSel.clearSelect(self);
            container.removeChild(rect);
            pos1 = PixiUtil.containerPos(container, e.data.global);
            rect = SpriteSel.createRegion(pos1, pos1);
            container.addChild(rect);
            e.stopPropagation();
        }
        let mousemove = e => {
            if (!pos1)
                return;
            pos2 = PixiUtil.containerPos(container, e.data.global);
            let size = Vec.new(pos2).sub(pos1);

            rect.clear();
            rect.beginFill(0xff5500, 0.5);
            rect.drawRect(0, 0, Math.abs(size.x), Math.abs(size.y));
            rect.endFill(0xff5500, 0.5);

            rect.width = size.x;
            rect.height = size.y;
        }
        let mouseup = e => {
            let hasRegion = pos2 != null;
            [pos1, pos2] = [null, null];
            container.removeChild(rect);
            if (!hasRegion)
                return;
            for (let sprite of container.children) {
                if (!sprite[CLICK])
                    continue;
                let crect = Rect.wrap(rect);
                let srect = Rect.wrap(sprite);
                if (crect.contains(srect)) {
                    SpriteSel.select(self, sprite);
                }
            }
        }
        container[REGION] = [mousedown, mousemove, mouseup];
        container.addListener("mousedown", mousedown);
        container.addListener("mousemove", mousemove);
        container.addListener("mouseup",   mouseup);
    },
    removeRegionHandler(self, container) {
        [mousedown, mousemove, mouseup] = container[REGION];
        container.removeListener("mousedown", mousedown);
        container.removeListener("mousemove", mousemove);
        container.removeListener("mouseup",   mouseup);
        delete container[REGION];
    },
    createRegion(self, pos1, pos2) {
        if (!pos2)
            pos2 = pos1;
        let size = Vec.new(pos2).sub(pos2);

        let g = new PIXI.Graphics();
        g.x = pos1.x;
        g.y = pos1.y;

        g.beginFill(0xff5500, 0.5);
        g.drawRect(0, 0, size.x, size.y);
        g.endFill(0xff5500, 0.5);
        return g;
    },
}
SpriteSel.Proto = Util.prototypify(SpriteSel);

module.exports = SpriteSel;



