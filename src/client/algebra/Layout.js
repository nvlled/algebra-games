let PIXI = require("src/client/pixi");
let Anima = require("src/client/algebra/Anima");
let EasingFn = require("src/client/algebra/EasingFn");

// row({}, ...[x,y,z])
// row(x, y, z)
let M = {
    center(opts, sprite) {
        return M.centerOf(opts, sprite.parent, sprite);
    },

    centerOf(opts, sprite1, sprite2) {
        //let opts, sprite1, sprite2 = null;
        //if (args.length >= 3) {
        //    [opts,sprite1, sprite2] = args;
        //} else if (args.length == 2) {
        //    [sprite1, sprite2] = args;
        //    opts = {};
        //} else {
        //    [sprite2] = args;
        //    sprite1 = sprite2.parent;
        //    opts = {};
        //}

        let {
            x=null, y=null,
            margin=0,
            marginX=margin,
            marginY=margin,
            center=true,
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

        //x = (width-sprite2.width)/2;
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
            return Anima.move(sprite2, 
                Object.assign({end: {x, y}}, anima));
        }

        sprite2.x = x+marginX;
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

    col(args, ...sprites) {
        let {
            x=0, y=0,
            margin=5,
            marginX=margin,
            marginY=margin,
            align="left",
            center=true,
            stretch=true,
            container,
            height,
            width,
        } = args;
        if (!container)
            container = new PIXI.Container();

        y = y+marginY;
        let maxw = width;

        if (maxw == null) {
            maxw = width = 0;
            for (let s of sprites) {
                maxw = Math.max(maxw, s.width);
            }
        }

        let cwidth = container.width;

        for (let s of sprites) {
            container.addChild(s);
            s.x = x+marginX;
            s.y = y;
            if (stretch) {
                s.width = maxw;
                if (height != null)
                    s.height = height;
            }
            if (center) 
                s.x += maxw/2 - s.width/2;
            if (align == "right")
                s.x = cwidth - maxw;

            y += s.height+marginY;
        }
        return container;
    },

    row(args, ...sprites) {
        let {
            margin=5,
            marginX=margin,
            marginY=margin,
            center=true,
            stretch=true,
            container,
            height,
            width,
        } = args;
        if (!container)
            container = new PIXI.Container();
        let x = marginX;
        let maxh = height;

        if (maxh == null) {
            maxh = height = 0;
            for (let s of sprites) {
                maxh = Math.max(maxh, s.height);
            }
        }

        for (let s of sprites) {
            container.addChild(s);
            s.x = x;
            s.y = marginY;
            if (stretch) {
                s.height = maxh;
                if (width != null)
                    s.width = width;
            }
            if (center) {
                s.y += maxh/2 - s.height/2;
            }

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

        if (!container)
            container = new PIXI.Container();

        let len = sprites.length;
        for (let n = 0; n < len; n++) {
            let sprite = sprites[n];
            let i = Math.floor(n/cols);
            let j = Math.floor(n%cols);
            let x = j*(size.w+marginX);
            let y = i*(size.h+marginY);
            sprite.x = x;
            sprite.y = y;
            sprite.width = size.w;
            sprite.height = size.h;
            container.addChild(sprite);
        }

        return container;
    },
}
module.exports = M;
