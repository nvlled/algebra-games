let PixiUtil = require("src/PixiUtil");
let Util = require("src/Util");
let EasingFn = require("src/EasingFn");
let Vec = require("src/Vec");
let Interpol = require("src/Interpol");

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

    //start(sprite) {
    //    if (sprite[TICKER])
    //        return;
    //    let tick = new PIXI.ticker.Ticker();
    //    sprite[TICKER] = tick;

    //    let queue = sprite[QUEUE];
    //    if (queue.length == 0)
    //        return;

    //    function stuffs() {
    //        let stepSize = sprite[STEP];
    //        let [destPos, size, marker, easeFn] = queue.shift();
    //        if (size)
    //            stepSize = size;
    //        let dir = Vec.new(destPos).sub(sprite.position);
    //        let dist = dir.len();
    //        //dir.norm().mul(stepSize);
    //        dir.norm();
    //        return [dir, dist, destPos, stepSize, marker, easeFn];
    //    }

    //    let [dir, dist, destPos, stepSize, marker, easeFn] = stuffs();

    //    let time = 0;
    //    tick.add(dt => {
    //        time += dt/10;

    //        let v = dir.new().mul(easeFn(time));
    //        console.log(dir.dot(destPos));
    //        Vec.add(sprite.position, v);

    //        //dist -= v.len();
    //        dist = Vec.new(sprite.position).sub(destPos).len();
    //        if (dist <= 0) {
    //            sprite.parent.removeChild(marker);
    //            //sprite.position = destPos;
    //            if (queue.length == 0) {
    //                sprite[TICKER] = null;
    //                tick.stop()
    //            } else {
    //                [dir, dist, destPos, stepSize, marker, easeFn] = stuffs();
    //            }
    //        }
    //    });
    //    tick.start();
    //},

    pause(sprite) {
        if (sprite[TICKER])
            sprite[TICKER].stop();
    },

    // !!!!!!!!!!!
    // TODO: use Anima
    move(sprite, {
        pos, 
        seconds=null, 
        speed=250,// pixels per second
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

        //let stepSize = 3;
        let dir = Vec.new(pos).sub(sprite.position);
        let dist = dir.len();

        if (seconds == null)
            seconds = dist/speed;

        let elapsed = 0;
        let spritePos = Vec.new(sprite.position);

        let interpol = Interpol.new(0, seconds);

        let promise = new Promise(function(resolve, reject) {
            let loop  = _=> {
                elapsed += ticker.elapsedMS/1000;
                //let t = elapsed/seconds;
                let t = interpol.applyScalar(elapsed);
                //console.log(t, interpol(elapsed), "|", elapsed, seconds);
                let x = easeFn(t);

                let pos_ = spritePos.new().add(dir.new().mul(x));
                sprite.position = pos_;

                if (t >= 1 || !interpol.inrangeScalar(elapsed)) {
                    ticker.remove(loop);
                    if (ownTicker)
                        ticker.stop();
                    sprite.position = pos;
                    resolve();
                }
            }
            ticker.add(loop);
            if (ownTicker)
                ticker.start();
        });
        return promise;
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
            //v.x = sprite.x;
            //v.y = sprite.y;

            //let delta = Vec.len(Vec.sub(dst, sprite.position));
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
