
let Util = require("src/Util"); 
let {compose} = Util;

let {
    markWrap: __w
} = Util;

let Vec = {
    ID: Symbol("Vec"),
    wrap(obj) {
        if (obj[Vec.ID])
            return obj;
        return Util.wrap(obj, Vec.Proto);
    },
    //new: function(...args) {
    //    return Vec.wrap(Vec.create(...args));
    //    //let {wrap, create} = Vec;
    //    //return compose(create, wrap)(...args);
    //},
    new: function(v) {
        return Vec.wrap(Vec.copy(v));
        //let {wrap, copy} = Vec;
        //return compose(copy, wrap)(v);
    },
    create: function(x, y) {
        let obj = {};
        obj.x = x || 0;
        obj.y = y || 0;
        obj[Vec.ID] = true;
        return obj;
    },
    copy: function(v) {
        let v_ = {x: v.x, y: v.y};
        if (v[Vec.ID])
            v_ = Vec.wrap(v_);
        return v_;
    },
    init: function(obj) {
        obj = obj || {};
        obj.x = obj.x || 0;
        obj.y = obj.y || 0;
        return obj;
    },
    neg: __w(function(v) {
        return Vec.mul(v, -1);
    }),
    mul: __w(function(v, n) {
        v.x *= n;
        v.y *= n;
        return v;
    }),
    times: __w(function(v, w) {
        v.x *= w.x;
        v.y *= w.y;
        return v;
    }),
    len: __w(function(v) {
        return Math.sqrt(v.x*v.x + v.y*v.y);
    }),
    norm: __w(function(v) {
        let n = Vec.len(v);
        if (n == 0)
            return v;
        Vec.mul(v, 1/n);
        return v;
    }),
    add: __w(function(v, w) {
        v.x += w.x;
        v.y += w.y;
        return v;
    }),
    sub: __w(function(v, w) {
        v.x -= w.x;
        v.y -= w.y;
        return v;
    }),
    clamp: __w(function(v, max, min) {
        let {copy, neg} = Vec;
        if (!min)
            min = neg(copy(max));

        if (v.x > max.x)
            v.x = max.x;
        else if (v.x < min.x)
            v.x = min.x;

        if (v.y > max.y)
            v.y = max.y;
        else if (v.y < min.y)
            v.y = min.y;

        return  v;
    }),

    truncate: __w(function(v, digits=3) {
        let n = Math.pow(10, digits);
        Vec.mul(v, n);
        v.x = Math.floor(v.x);
        v.y = Math.floor(v.y);
        Vec.mul(v, 1/n);
        return v;
    }),

    dot(v, w) {
        let {x:a, y:c} = v;
        let {x:b, y:d} = w;
        return a*b + c*d;
    },

    rotateRight(v) {
        let {x, y} = v;
        //v.x = -y;
        //v.y = x;
        v.x = -y;
        v.y = x;
        return v;
    },

    rotateLeft(v) {
        let {x, y} = v;
        //v.x = -y;
        //v.y = x;
        v.x = y;
        v.y = -x;
        return v;
    },

    swap(v) {
        let {x, y} = v;
        v.x = y;
        v.y = x;
        return v;
    },

    toString(self) {
        let {x, y} = self;
        return `Vec(${x}, ${y})`;
    },

    equals(v, w) {
        let {x, y} = v;
        let {x: x_, y: y_} = w;
        let f = Math.floor;
        return f(x) == f(x_) && f(y) == f(y_);
    },

    lessThan(v, w) {
        let {x, y} = v;
        let {x: x_, y: y_} = w;
        let f = Math.floor;
        return f(x) < f(x_) && f(y) < f(y_);
    },

    random() {
        while (true) {
            let [x] = Util.randomSelect([1, 0, -1]);
            let [y] = Util.randomSelect([1, 0, -1]);
            if (x == 0 && y == 0)
                continue;
            return Vec.new({x, y});
        }
    },

    // TODO: Make Vec a constructor

    // Vec.array([[1,2], [3,4]]) == [Vec(1,2), Vec(3,4)]
    array: function(...args) {
        return args.map(a => Vec.create(...a));
    },

    //Vec.new(v, function(v) {
    //  // v is taken from the object pool
    //});

    //wrap: function(obj) {
    //    return Util.wrap(obj, Vec.Proto);
    //},
}
Vec.Proto = Util.prototypify(Vec);

module.exports = Vec;


