let Util = require("src/Util"); 
let Vec = require("src/Vec");
let {sqrt, pow} = Math;

let distScalar = (a, b) => sqrt(pow(a-b, 2));
let distVector = (a, b) => Vec.new(a).sub(b).len();

let sign = n => n==0 ? 0 : Math.sqrt(n*n)/n;

let M = {
    create(a, b) {
        return {a, b};
    },

    applyScalar(self, x) {
        let {a, b} = self;
        let d = distScalar(a,b);
        return (d-(distScalar(x, b)))/d;
    },

    mapScalar(self, t, a, b) {
        //let t = M.applyScalar(self, x);
        return a + distScalar(a,b) * t * sign(b-a);
    },

    inrangeScalar(self, x) {
        return x >= self.a && x <= self.b;
    },

    /////////////////////////////////

    apply(self, x) {
        let {a, b} = self;
        let d = distVector(a, b);
        return (d-(distVector(x, b)))/d;
    },

    map(self, t, a, b) {
        //let t = M.apply(self, x);
        //let d = distVector(a,b);
        let v = Vec.new(b).sub(a);
        return Vec.new(a).add(v.mul(t));
        //return Vec.new(a).add(v.mul(t*d));
    },

    inrange(self, x) {
        let {a, b} = self;
        let {CMP_GE, CMP_LE} = Vec;
        return Vec.compare(x, a, CMP_GE) && 
               Vec.compare(x, b, CMP_LE);
    },

}
M.new = Util.constructor(M);

module.exports = M;
