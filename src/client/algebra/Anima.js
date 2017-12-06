let Interpol = require("src/client/algebra/Interpol");
let Vec = require("src/client/algebra/Vec");
let EasingFn = require("src/client/algebra/EasingFn");
let Util = require("src/client/algebra/Util");

let {sqrt, pow} = Math;
let dist = (a, b) => sqrt(pow(a-b, 2));
let distVec = (a, b) => Vec.dist(a, b);

let M = {
    create() {
    },

    color(sprite, {
        start, end,
        seconds,
        speed,
        easeFn,
    }) {
        return M.vecLerp(sprite, "tint", {
            start, end, seconds, speed,
            fn: v => {
                let fsck = Math.floor;
                return fsck(v.x)*0x10000 + fsck(v.y)*0x100 + fsck(v.z);
            },
        });
    },

    boom(sprite, args) {
        let seconds = 0.5;
        let n = 100+Math.random()*100;
        let m = 10+Math.random()*10;
        M.rotate(sprite, {end: 25+Math.random()*25, seconds});
        M.move(sprite, {end: Vec.random().mul(n),
                        seconds, easeFn: EasingFn.outQuint});
        return Promise.all([
            M.scale(sprite, {end: Vec.new({x: m, y: m}), seconds}),
            M.fade(sprite, {end: 0, seconds: seconds*2}),
        ]);
    },

    async fadeLift(sprite, args={}) {
        M.moveBy(sprite, {
            end: {
                y:  args.y || -sprite.height/2,
            },
            seconds: args.seconds || 0.7
        });
        await M.fade(sprite, {end: 0, seconds: args.seconds});
    },

    async fadeAway(sprite, args) {
        let n = sprite.height;
        M.moveBy(sprite, {end: {x: n/2, y: -n, seconds: 1.3}});
        await M.fade(sprite, {end: 0});
    },

    slideIn(sprite, args={}) {
        let cwidth = sprite.width*2;
        let cheight = sprite.width*2;
        if (sprite.parent) {
            cwidth = sprite.parent.width;
            cheight = sprite.parent.height;
        };

        args.start = args.start || {
            y: -1,
        };
        let start = Util.extractKeys(sprite, "x", "y");

        if (args.start.x < 0)
            start.x = -sprite.width;
        else if (args.start.x > 0)
            start.x = cwidth+sprite.width;

        if (args.start.y < 0)
            start.y = -sprite.height;
        else if (args.start.y > 0)
            start.y = cheight+sprite.height;

        let end = Util.extractKeys(sprite, "x", "y");

        M._setEndStart(sprite, args);
        if (args.fade)
            M.fade(sprite, {start: 0, end: 1, seconds: args.seconds});
        return M.move(sprite, Object.assign(
            args,
            {
                start,
                end,
            }
        ));
    },

    slideOut(sprite, args={}) {
        let cwidth = sprite.width*2;
        let cheight = sprite.width*2;
        if (sprite.parent) {
            cwidth = sprite.parent.width;
            cheight = sprite.parent.height;
        };

        args.end = args.end || { x: 1 };
        let end = Util.extractKeys(sprite, "x", "y");

        if (args.end.x < 0)
            end.x = -sprite.width;
        else if (args.end.x > 0)
            end.x = cwidth+sprite.width;

        if (args.end.y < 0)
            end.y = -sprite.height;
        else if (args.end.y > 0)
            end.y = cheight+sprite.height;

        let start = Util.extractKeys(sprite, "x", "y");

        M._setEndStart(sprite, args);
        if (args.fade)
            M.fade(sprite, {end: 0, seconds: args.seconds});
        return M.move(sprite, Object.assign(
            args,
            {
                start,
                end,
            }
        ));
    },

    async teleport(sprite, args) {
        let {speed, seconds} = args;
        await M.fade(sprite, {start: 1, end: 0, seconds, speed});
        sprite.x = args.end.x;
        sprite.y = args.end.y;
        await M.fade(sprite, {start: 0, end: 1, seconds, speed});
    },

    move(sprite, args) {
        M._setEndStart(sprite, args);
        return M.vecLerp(sprite, "position", args);
    },

    moveBy(sprite, args) {
        let pos = sprite.position;
        args.end = {
            x: pos.x + args.end.x || sprite.x,
            y: pos.y + args.end.y || sprite.y,
        }
        M.move(sprite, args);
    },

    scale(sprite, args) {
        M._setEndStart(sprite, args);
        return M.vecLerp(sprite, "scale", args);
    },

    scaleBy(sprite, args) {
        let scale = sprite.scale;
        let end = args.end;
        if (typeof end == "number")
            end = {x: end, y: end};

        args.end = {
            x: scale.x + end.x || sprite.x,
            y: scale.y + end.y || sprite.y,
        }
        return M.scale(sprite, args);
    },

    rotate(sprite, args) {
        return M.scaLerp(sprite, "rotation", args);
    },

    fade(sprite, args) {
        return M.scaLerp(sprite, "alpha", args);
    },

    squeezeIn(sprite, args = {}) {
        args.end = Vec.new({x: 0.00, y: sprite.scale.y});
        return M.vecLerp(sprite, "scale", args);
    },

    squeezeOut(sprite, args = {}) {
        args.end = Vec.new({x: sprite.scale.y, y: sprite.scale.y});
        return M.vecLerp(sprite, "scale", args);
    },

    async shake(sprite, args={}) {
        let startRot = args.start;
        if (startRot == null)
            startRot = sprite.rotation;
        let seconds = args.seconds || 0.5;
        let end = args.end || 0.2;
        await Util.runForMillis(seconds*1000, async () => {
            await M.rotate(sprite, {end: end, seconds: 0.1});
            await M.rotate(sprite, {end: startRot, seconds: 0.1});
        });
        sprite.rotation = startRot;
        return Promise.resolve();
    },

    async vibrate(sprite, args={}) {
        let end = args.end;
        if (typeof end == "number") {
            args.end = {x: end, y: end};
        } else if (end == null){
            end = 1.2;
        }

        let scale = {
            x: sprite.scale.x,
            y: sprite.scale.y,
        }
        let seconds = args.seconds || 1;
        await Util.runForMillis(seconds*1000, async () => {
            await M.scale(sprite, {end: end, seconds: 0.1});
            await M.scale(sprite, {end: scale, seconds: 0.1});
        });
        sprite.scale = scale;
        return Promise.resolve();
    },

    _setEndStart(sprite, args) {
        if (typeof args.start == "number")
            args.start = {x: args.start, y: args.start};
        if (typeof args.end == "number")
            args.end = {x: args.end, y: args.end};
    },

    vecLerp(sprite, prop, {
        start, end,
        seconds,
        speed,
        easeFn=EasingFn.linear,
        fn=O=>O,
    }) {
        if (!sprite || sprite._destroyed)
            return Promise.resolve();
        if (!start) {
            start = Vec.new(sprite[prop]);
            if (end.x == null) end.x = start.x;
            if (end.y == null) end.y = start.y;
        } else if (!end) {
            end = Vec.new(sprite[prop]);
            if (start.x == null) start.x = end.x;
            if (start.y == null) start.y = end.y;
        }

        let d = distVec(start, end);

        if (speed == null)
            speed = Math.abs(Math.log(d)/2)*200;
        if (seconds == null)
            seconds = d/speed;
        if (end == null)
            [start, end] = [sprite[prop], start];

        let millis = seconds*1000;

        sprite[prop] = fn(start);

        let intr = Interpol.new(0, millis);

        return Util.doWhile((_, elapsed) => elapsed < millis, (_, elapsed) => {
            let t = intr.applyScalar(elapsed);
            let x = intr.map(easeFn(t), start, end);
            let y = fn(x);
            if (!sprite._destroyed)
                sprite[prop] = y;
        }).then(_=> {
            if (!sprite._destroyed)
                sprite[prop] = fn(end);
        });
    },

    scaLerp(sprite, prop, {
        start, end,
        seconds=0.5,
        speed,
        easeFn=EasingFn.linear,
    }) {
        if (!sprite || sprite._destroyed)
            return Promise.resolve();
        let d = dist(start, end);

        if (start == null)
            start = sprite[prop];

        if (speed == null)
            speed = Math.abs(Math.log(d)/2)*0.1;
        if (seconds == null)
            seconds = d/speed;
        if (end == null)
            [start, end] = [sprite[prop], start];

        let millis = seconds*1000;

        sprite[prop] = start;
        let intr = Interpol.new(0, millis);

        return Util.doWhile((_, elapsed) => elapsed < millis, (_, elapsed) => {
            let t = intr.applyScalar(elapsed);
            if (!sprite._destroyed)
                sprite[prop] = intr.mapScalar(easeFn(t), start, end);
        }).then(_=> sprite[prop] = end);
    },
}

module.exports = M;
