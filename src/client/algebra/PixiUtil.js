let PIXI = require("src/client/pixi");
let Vec = require("src/client/algebra/Vec");
let Util = require("src/client/algebra/Util");
let G = require("src/client/algebra/G");

let M = {
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

    tintAll(sprites, tint=0xffffff) {
        for (let sprite of sprites) {
            if (sprite)
                sprite.tint = tint;
        }
    },

    async flashSprites(sprites, tint=0x00ff00, millis=1000) {
        M.tintAll(sprites, tint);
        await Util.sleep(millis);
        M.tintAll(sprites);
    },

    center(sprite) {
        let container = sprite.parent;
        if (!container)
            return container;
        sprite.x = (container.width - sprite.width)/2;
        sprite.y = (container.height - sprite.height)/2;
    },

    loadVideo(path, {loop=true,autoplay=true, width, height}) {
        var texture = PIXI.Texture.fromVideo(path);
        var videoSprite = new PIXI.Sprite(texture);
        let source = texture.baseTexture.source;
        source.loop = loop;
        source.autoplay = autoplay;
        videoSprite.width = width;
        videoSprite.height = height;

        return videoSprite;
    },

    line({g, container, p1, p2, lineWidth=1, color=0x333333, alpha=1}={}) {
        if (!g)
            g = new PIXI.Graphics();
        g.lineStyle(lineWidth, color, alpha);
        g.beginFill();
        g.moveTo(p1.x, p1.y);
        g.lineTo(p2.x, p2.y);
        g.endFill();
        if (container)
            container.addChild(g);
        return g;
    },

    topLeft(sprite) {
        let a = sprite.anchor;
        if (!a) {
            return {
                x: sprite.x,
                y: sprite.y,
            }
        }
        return {
            x: sprite.x - a.x*sprite.width,
            y: sprite.y - a.y*sprite.height,
        }
    },

    centerPos(sprite) {
        let a = sprite.anchor;
        if (!a) {
            return {
                x: sprite.x,
                y: sprite.y,
            }
        }
        return {
            x: sprite.x - a.x*sprite.width,
            y: sprite.y - a.y*sprite.height,
        }
    },

    setTopLeft(sprite, {x, y}) {
        let a = sprite.anchor;
        if (!a) {
            sprite.x = x;
            sprite.y = y;
        }
        sprite.x = x + a.x*sprite.width;
        sprite.y = y + a.y*sprite.height;
    },

    fixSize(sprite) {
        let {width, height} = sprite;
        return new Proxy(sprite, {
            get(target, name) {
                if (name == 'width')
                    return width;
                else if (name == 'height')
                    return height;
                return target[name];
            }
        });
    },

    overlay(frontSprite, args={}) {
        let {
            radius,
            backSprite,
            margin=0,
            marginX=margin,
            marginY=margin,
            parent,
        } = args;

        if (!backSprite) {
            backSprite = M.roundedRect({
                radius,
                alpha: 0.8,
                width: frontSprite.width+marginX,
                height: frontSprite.height+marginY,
            });
        }
        if (!parent)
            parent = frontSprite.parent;
        if (parent) {
            try {
                let i = parent.getChildIndex(frontSprite);
                parent.addChildAt(backSprite, i);
            } catch (e) {
                parent.addChild(backSprite);
            }
        }

        //frontSprite.x += margin/2;
        //frontSprite.y += margin/2;
        let tl = M.topLeft(frontSprite);
        M.setTopLeft(backSprite, {x: tl.x-marginX/2, y: tl.y-marginY/2});
        return backSprite;
    },

    roundedRect({
        x=0, y=0, width, height,
        radius=12, color=0x222222, alpha=1, renderer
    }) {
        if (color == null)
            alpha = 0;

        let sprite = new PIXI.Sprite();
        sprite.draw = ({width, height, color}) => {
            let g = new PIXI.Graphics();
            g.clear();
            g.beginFill(color, alpha);
            g.drawRoundedRect(x, y,
                width, height, radius);
            g.endFill();

            if (!renderer)
                renderer = G.renderer;

            let rt = PIXI.RenderTexture.create(width, height);
            renderer.render(g, rt);
            sprite.texture = rt;
        }
        sprite.draw({width, height, color});

        return new Proxy(sprite, {
            set(_, name, val) {
                let modified = false;
                if (name == "color") {
                    color = val;
                    modified = true;
                } else if (name == "width") {
                    width = val;
                    modified = true;
                } else if (name == "height") {
                    height = val;
                    modified = true;
                } else {
                    sprite[name] = val;
                }
                if (modified)
                    sprite.draw({width, height, color});

                return true;
            },
        });
    },

    intersects(sprite1, sprite2) {
        let r1 = sprite2.getBounds();
        let r2 = sprite2.getBounds();
        let {width: w, height: h} = r2;
        return r1.contains(r2.x,   r2.y)
            || r1.contains(r2.x+w, r2.y+h)
            || r1.contains(r2.x+w, r2.y)
            || r1.contains(r2.x+w, r2.y+h);
    },
}

module.exports = M;
