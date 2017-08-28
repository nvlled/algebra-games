let PixiUtil = require("src/PixiUtil");
let Util = require("src/Util");
let EasingFn = require("src/EasingFn");
let Vec = require("src/Vec");
let Interpol = require("src/Interpol");
let Anima = require("src/Anima");

let QUEUE = Symbol();
let TICKER = Symbol();
let STEP = Symbol();
let EASE = Symbol();

let Waypoint = {
    add(sprite, opts) {
        if (!sprite[QUEUE])
            sprite[QUEUE] = [];
        let {pos} = opts;
        let marker
        if (sprite.parent) {
            marker = PixiUtil.point(sprite.parent, pos.x, pos.y);
        }
        sprite[QUEUE].push({pos, marker, opts});
    },
    
    clear(sprite) {
        sprite[QUEUE] && sprite[QUEUE].slice(0);
    },

    start(sprite) {
        if (sprite[TICKER])
            return;
        let ticker = new PIXI.ticker.Ticker();
        sprite[TICKER] = ticker;

        ticker.start();
        let loop = function() {
            let queue = sprite[QUEUE];
            if (queue.length == 0) {
                sprite[TICKER] = null;
                ticker.stop();
                return;
            }

            let {pos, marker, opts} = queue.shift();
            Waypoint
                .move(sprite, opts)
                .then(function() {
                    sprite.parent.removeChild(marker);
                    loop();
                });
        }
        loop();
    },

    pause(sprite) {
        if (sprite[TICKER])
            sprite[TICKER].stop();
    },

    move(sprite, {
        pos, 
        seconds=0.2, 
        speed=250,
        ticker, 
        easeFn=null,
    }) {
        if (!sprite)
            Promise.resolve();
        easeFn = Util.or(easeFn, sprite[EASE], EasingFn.linear);
        Waypoint.clear(sprite);

        let ownTicker = false;
        if (!ticker) {
            ticker = new PIXI.ticker.Ticker();
            ownTicker = true;
        }

        return Anima.move(sprite, {
            end: pos,
            speed,
            seconds,
            easeFn,
        });
    },

    movePhys(self, {src, dest, }) {
        let __ = Util.extract;
        let {x, y} = src;
        let {x:x_, y:y_} = dest;
        let sprite = Grid.spriteAt(self, {x, y});
        let tileSrc = Grid.tileAt(self, {x, y});
        let tileDst = Grid.tileAt(self, {x:x_, y:y_});
        let tick = new PIXI.ticker.Ticker();

        if (!sprite || !tileDst)
            return;

        sprite.stepSize = 5;
        sprite.cof = 1.0;
        sprite.maxvel = Vec.create(10, 10);

        let lastpos = Grid.getSpritePos(self, {x:x_, y:y_, sprite});
        let prevDelta = -1;
        let prevDelta_ = -1;
        tick.add((e) => {
            let dst = Vec.wrap(Grid.getSpritePos(self, {x:x_, y:y_, sprite}));
            let dir = Vec.new(sprite.position);
            dir.sub(Vec.new(dst));
            dir.norm();
            dir.mul(sprite.stepSize);
            dir.neg();

            Phys.applyForce(sprite, dir);
            Phys.update(sprite);

            let delta = dst.new().sub(sprite.position).len();
            if (delta == prevDelta) {
                tick.stop();
                Grid.setSprite(self, {x:x, y:y, sprite: null});
                Grid.setSprite(self, {x:x_, y:y_, sprite});
            }
            lastpos = Vec.new(sprite.position);
            prevDelta_ = prevDelta;
            prevDelta = delta;
        }, null, 0);
        tick.start();
    },

    moveStraight(sprite, {pos, stepSize=5}) {
        Waypoint.clear(sprite);

        let tick = new PIXI.ticker.Ticker();
        let dir = Vec.copy(pos).sub(sprite.position);
        let dist = dir.len();
        dir.norm().mul(stepSize);

        tick.add(() => {
            Vec.add(sprite.position, dir);
            dist -= stepSize;
            if (dist <= 0) {
                tick.stop();
                sprite.position = pos;
                console.log("done");
            }
        });
        tick.start();
    },
}

module.exports = Waypoint;
