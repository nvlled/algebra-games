let Interpol = require("src/Interpol");
let Vec = require("src/Vec");
let EasingFn = require("src/EasingFn");
let Util = require("src/Util");

let {sqrt, pow} = Math;
let dist = (a, b) => sqrt(pow(a-b, 2))
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

    scale(sprite, args) {
        return M.vecLerp(sprite, "scale", args);
    },

    rotate(sprite, args) {
        return M.scaLerp(sprite, "rotation", args);
    },

    fade(sprite, args) {
        return M.scaLerp(sprite, "alpha", args);
    },

    squeezeIn(sprite, args) {
        args.end = Vec.new({x: 0.1, y: sprite.scale.y});
        return M.vecLerp(sprite, "scale", args);
    },
    squeezeOut(sprite, args) {
        args.end = Vec.new({x: sprite.scale.y, y: sprite.scale.y});
        return M.vecLerp(sprite, "scale", args);
    },


    vecLerp(sprite, prop, {
        start, end, 
        seconds,
        speed,
        easeFn=EasingFn.linear,
        fn=O=>O,
    }) {
        let d = dist(start, end);

        if (!start)
            start = Vec.new(sprite[prop]);

        if (speed == null)
            speed = Math.abs(Math.log(d)/2)*0.1;
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
            sprite[prop] = y;
        }).then(_=> sprite[prop] = fn(end))
    },

    scaLerp(sprite, prop, {
        start, end, 
        seconds,
        speed,
        easeFn=EasingFn.linear,
    }) {
        let d = dist(start, end);

        if (!start)
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
            sprite[prop] = intr.mapScalar(easeFn(t), start, end);
        });
    },
}
module.exports = M;
