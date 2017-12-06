let PIXI = require("src/client/pixi");
let Anima = require("src/client/algebra/Anima");
let PixiUtil = require("src/client/algebra/PixiUtil");
let EasingFn = require("src/client/algebra/EasingFn");

// row({}, ...[x,y,z])
// row(x, y, z)
let M = {
    center(opts, sprite) {
        return M.centerOf(opts, sprite.parent, sprite);
    },

    centerOf(opts, sprite1, sprite2) {
        let {
            x=null, y=null,
            margin=0,
            marginX=margin,
            marginY=margin,
            centerX=true,
            centerY=true,
            container,
            width,
            height,
            animate=false,
            anima={
                seconds: 0.9,
                easeFn: EasingFn.outCubic,
            },
        } = opts;

        if (width == null)
            width = sprite1.width;
        if (height == null)
            height = sprite1.height;

        if (x == null) {
            x = (width-sprite2.width)/2;
            if (sprite2.parent != sprite1)
            x += sprite1.x;
        }
        if (y == null) {
            y = (height-sprite2.height)/2;
            if (sprite2.parent != sprite1)
            y += sprite1.y;
        }

        if (sprite2.parent != sprite1) {
            x += sprite1.x;
        }

        if (animate) {
            if (!centerX)
                x = null;
            if (!centerY)
                y = null;
            return Anima.move(sprite2,
                Object.assign({end: {x, y}}, anima));
        }

        if (centerX)
            sprite2.x = x+marginX;
        if (centerY)
            sprite2.y = y+marginY;
        return Promise.resolve();
    },

    belowOf(args, sprite1, sprite2) {
        let {
            margin=5,
            marginX=margin,
            marginY=margin,
            center=false,
            align,// left,right,center
            container,
            width=0,
            inside=false,
        } = args;
        sprite1.parent.addChild(sprite2);
        sprite2.y = sprite1.y+sprite1.height+marginY;
        sprite2.x = sprite1.x;
        if (center || align == "center")
            sprite2.x += sprite1.width/2 - sprite2.width/2;
        else if (align == "right")
            sprite2.x += sprite1.width - sprite2.width;
        if (inside)
            sprite2.y -= sprite2.height;
    },

    aboveOf(args, sprite1, sprite2) {
        let {
            margin=5,
            marginX=margin,
            marginY=margin,
            center=true,
            container,
            width=0,
        } = args;
        sprite1.parent.addChild(sprite2);
        sprite2.y = sprite1.y-sprite2.height-marginY;
        sprite2.x = sprite1.x;
    },

    leftOf(args, sprite1, sprite2) {
        let {
            margin=1,
            marginX=margin,
            marginY=margin,
            container,
            width=0,
            align="left",
        } = args;
        sprite1.parent.addChild(sprite2);
        sprite2.x = sprite1.x-sprite2.width-marginX;
        sprite2.y = sprite1.y+marginY;
        if (align == "center")
            sprite2.y += sprite1.height/2 - sprite2.height/2;
        else if (align == "right")
            sprite2.y += sprite1.height - sprite2.height;
    },

    rightOf(args, sprite1, sprite2) {
        let {
            margin=1,
            marginX=margin,
            marginY=margin,
            container,
            width=0,
            align="left",
        } = args;
        sprite1.parent.addChild(sprite2);
        sprite2.x = sprite1.x+sprite1.width+marginX;
        sprite2.y = sprite1.y+marginY;
        if (align == "center")
            sprite2.y += sprite1.height/2 - sprite2.height/2;
        else if (align == "right")
            sprite2.y += sprite1.height - sprite2.height;
    },

    col(args, ...sprites) {
        let {
            x=0, y=0,
            margin=5,
            marginX=margin,
            marginY=margin,
            padding=0,
            align="left",
            center=true,
            stretch=true,
            container,
            height,
            width,
            color=null,
            alpha=0.5,
        } = args;
        y = y+marginY/2;

        let maxw = width;
        let maxh = height;

        if (maxw == null) {
            maxw = width = 0;
        }
        if (maxh == null) {
            maxh = height = 0;
        }
        for (let s of sprites) {
            maxw = Math.max(maxw, s.width);
            maxh = Math.max(maxh, s.height);
        }

        let totalh = 0;
        let totalw = 0;
        for (let s of sprites) {
            totalh += s.height+marginY;
        }
        totalw += maxw + marginX;

        if (!container) {
            container = PixiUtil.roundedRect({
                color,
                alpha,
                width: totalw+padding,
                height: totalh+padding,
            });
        }

        for (let s of sprites) {
            container.addChild(s);
            s.x = x+marginX/2 + padding/2;
            s.y = y + padding/2;
            if (stretch) {
                s.width = maxw;
                if (height != null && height != 0)
                s.height = maxh;
            } else {
                if (width > 0)
                    s.width = width;
                if (height > 0)
                    s.height = height;
            }
            if (center)
                s.x += maxw/2 - s.width/2;
            if (align == "right")
                s.x = totalw - maxw;

            y += s.height+marginY;
        }

        return container;
    },

    row(args, ...sprites) {
        let {
            x=0, y=0,
            margin=5,
            marginX=margin,
            marginY=margin,
            align="left",
            center=true,
            stretch=false,
            container,
            height,
            width,
            color=null,
            alpha=0.5,
        } = args;
        x = x+marginX/2;

        let maxw = width;
        let maxh = height;

        if (maxw == null) {
            maxw = width = 0;
        }
        if (maxh == null) {
            maxh = height = 0;
        }
        for (let s of sprites) {
            maxw = Math.max(maxw, s.width);
            maxh = Math.max(maxh, s.height);
        }

        let totalh = 0;
        let totalw = 0;
        for (let s of sprites) {
            totalw += s.width+marginX;
        }
        totalh = maxh + marginY;

        if (!container) {
            container = PixiUtil.roundedRect({
                color,
                alpha,
                width: totalw,
                height: totalh,
            });
        }

        for (let s of sprites) {
            container.addChild(s);
            s.y = y+marginY/2;
            s.x = x;
            if (stretch) {
                s.height = maxh;
                if (width != null && width != 0)
                    s.width = totalw;
            }
            if (center)
                s.y += maxh/2 - s.height/2;
            if (align == "right")
                s.y = totalh - maxh;

            x += s.width+marginX;
        }

        return container;
    },

    table(args, ...sprites) {
        let {
            x=0,y=0,
            margin=5,
            marginX=margin,
            marginY=margin,
            //center=true,
            square=false,
            container,
            cols=1,
            rows=sprites.length/cols,
            width=0,
            height=0,
            color=null,
            alpha=0.5,
        } = args;

        let size = sprites.reduce((msize, s) => {
            return {
                w: Math.max(msize.w, s.width),
                h: Math.max(msize.h, s.height),
            }
        }, {w: width, h: height});

        if (square) {
            let n = Math.max(size.w, size.h);
            size.w = n;
            size.h = n;
        }

        let len = sprites.length;
        let totalSize = [0, 0];
        for (let n = 0; n < len; n++) {
            let sprite = sprites[n];
            let i = Math.floor(n/cols);
            let j = Math.floor(n%cols);
            let x = marginX/2 + j*(size.w+marginX);
            let y = marginY/2 + i*(size.h+marginY);
            sprite.x = x;
            sprite.y = y;
            sprite.width = size.w;
            sprite.height = size.h;
            totalSize[0] += size.w+marginX;
            totalSize[1] += size.h+marginY;
        }

        if (!container) {
            container = PixiUtil.roundedRect({
                color,
                alpha,
                width: (size.w+marginX)*cols + marginX,
                height: (size.h+marginY)*Math.ceil(rows) + marginY,
            });
        }
        for (let s of sprites)
            container.addChild(s);

        return container;
    },
}
module.exports = M;
