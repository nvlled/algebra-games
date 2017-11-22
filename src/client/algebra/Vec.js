
let Util = require("src/client/algebra/Util"); 
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

    create: function(x, y, z) {
        let obj = {};
        obj.x = x || 0;
        obj.y = y || 0;
        obj.z = z || 0;
        obj[Vec.ID] = true;
        return obj;
    },

    copy: function(v) {
        let v_ = {x: v.x, y: v.y, z: v.z || 0};
        if (v[Vec.ID])
            v_ = Vec.wrap(v_);
        return v_;
    },

    init: function(obj) {
        obj = obj || {};
        obj.x = obj.x || 0;
        obj.y = obj.y || 0;
        obj.z = obj.z || 0;
        return obj;
    },
    
    neg: __w(function(v) {
        return Vec.mul(v, -1);
    }),

    idiv: __w(function(v, n) {
        v.x = Math.floor(v.x/n);
        v.y = Math.floor(v.y/n);
        v.z = Math.floor(v.z/n) || 0;
        return v;
    }),

    mul: __w(function(v, n) {
        v.x *= n;
        v.y *= n;
        v.z = (v.z*n) || 0;
        return v;
    }),

    times: __w(function(v, w) {
        v.x *= w.x;
        v.y *= w.y;
        v.z *= w.z || 0;
        return v;
    }),

    len: __w(function(v) {
        return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    }),

    dist: __w(function(v, w) {
        let abs = Math.abs;
        return abs(v.x-w.x) + abs(v.y-w.y);
    }),

    norm: __w(function(v) {
        let n = Vec.len(v);
        if (n == 0)
            return v;
        Vec.mul(v, 1/n);
        return v;
    }),

    add: __w(function(v, w) {
        v.x += w.x || 0;
        v.y += w.y || 0;
        v.z += w.z || 0;
        return v;
    }),

    sub: __w(function(v, w) {
        v.x -= w.x || 0;
        v.y -= w.y || 0;
        v.z -= w.z || 0;
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

        if (v.z > max.z)
            v.z = max.z;
        else if (v.z < min.z)
            v.z = min.z;

        return  v;
    }),

    truncate: __w(function(v, digits=3) {
        let n = Math.pow(10, digits);
        Vec.mul(v, n);
        v.x = Math.floor(v.x);
        v.y = Math.floor(v.y);
        v.z = Math.floor(v.z || 0);
        Vec.mul(v, 1/n);
        return v;
    }),

    dot(v, w) {
        let {x:a, y:c, z:e} = v;
        let {x:b, y:d, z:f} = w;
        return a*b + c*d + ((e*f) || 0);
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

    toString(self, withZ=false) {
        let {x, y, z} = self;
        if (withZ)
            return `Vec(${x}, ${y}, ${z})`;
        return `Vec(${x}, ${y})`;
    },

    valueOf(self) {
        let {x,y,z} = self
        if (z != null)
            return [x,y,z];
        return [x,y];
    },

    equals(v, w) {
        let {x, y, z} = v;
        let {x: x_, y: y_, z: z_} = w;
        let f = Math.floor;
        if (w.z == null)
            return f(x) == f(x_) && f(y) == f(y_);
        return f(x) == f(x_) && f(y) == f(y_) && f(z) == f(z_);
    },

    lessThan(v, w) {
        let {x, y} = v;
        let {x: x_, y: y_, z: z_} = w;
        let f = Math.floor;
        return f(x) < f(x_) && f(y) < f(y_) && f(z) < f(z_);
    },

    greaterThan(v, w) {
        return Vec.compare(v, w, Vec.CMP_GT);
    },

    compare(v, w, op=Vec.CMP_EQ) {
        let {x, y} = v;
        let {x: x_, y: y_, z: z_} = w;
        let f = Math.floor;
        return op(f(x), f(x_)) &&
               op(f(y), f(y_)) &&
               op(f(z), f(z_));
    },

    up(v) { return Vec.new(v).add({x:    0, y: -1}) },
    left(v) { return Vec.new(v).add({x: -1, y:  0}) },
    down(v) { return Vec.new(v).add({x:  0, y:  1}) },
    right(v) { return Vec.new(v).add({x: 1, y:  0}) },

    range(v, w, step=1) {
        let points = [];
        let sx = Math.min(v.x, w.x);
        let sy = Math.min(v.y, w.y);
        let ex = Math.max(v.x, w.x);
        let ey = Math.max(v.y, w.y);
        for (let y = sy; y <= ey; y+=step) {
            for (let x = sx; x <= ex; x+=step) {
                points.push({x, y});
            }
        }
        return points;
    }, 

    random(withZ=false) {
        while (true) {
            let [x] = Util.randomSelect([1, 0, -1]);
            let [y] = Util.randomSelect([-1, 0, 1]);
            let [z] = Util.randomSelect([1, 0, -1]);
            if (withZ) {
                if (x == 0 && y == 0 && z == 0)
                    continue;
                return Vec.new({x, y, z});
            } else {
                if (x == 0 && y == 0)
                    continue;
                return Vec.new({x, y});
            }
        }
    },

    isZero(v) {
        return v.x == 0 && v.y == 0 && v.z == 0;
    },

    isVertical(v)   { return v.x == 0 && v.y != 0; },
    isHorizontal(v) { return v.x != 0 && v.y == 0; },
    isOrthogonal(v) {
        return Vec.isVertical(v) || Vec.isHorizontal(v);
    },

    // TODO: Make Vec a constructor

    // Vec.array([[1,2], [3,4]]) == [Vec(1,2), Vec(3,4)]
    array: function(...args) {
        return args.map(a => Vec.create(...a));
    },

    from(x, y, z=0) {
        return Vec.new({x, y, z});
    },

    //Vec.new(v, function(v) {
    //  // v is taken from the object pool
    //});

    //wrap: function(obj) {
    //    return Util.wrap(obj, Vec.Proto);
    //},
}
Vec.Proto = Util.prototypify(Vec);
Vec.CMP_EQ = (a, b) => a == b;
Vec.CMP_LT = (a, b) => a < b;
Vec.CMP_LE = (a, b) => a <= b;
Vec.CMP_GT = (a, b) => a > b;
Vec.CMP_GE = (a, b) => a >= b;

module.exports = Vec;



