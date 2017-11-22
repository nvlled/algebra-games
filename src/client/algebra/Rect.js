let Vec = require("src/client/algebra/Vec");
let Util = require("src/client/algebra/Util");

let Rect = {
    wrap(obj) {
        return Util.wrap(obj, Rect);
    },
    set left(x) {
        let a = this.anchor || {x: 0, y: 0};
        this.x = x + a.x*this.width;
    },
    set right(x) {
        this.x += x - this.right
    },
    set up(y) {
        let a = this.anchor || {x: 0, y: 0};
        this.y = y + a.y*this.height;
    },
    set down(y) {
        this.y += y - this.down
    },

    get left() {
        let a = this.anchor || {x: 0, y: 0};
        return this.x - a.x*this.width;
    },
    get right() {
        return this.left + this.width;
    },
    get up() {
        let a = this.anchor || {x: 0, y: 0};
        return this.y - a.y*this.height;
    },
    get down() {
        return this.up + this.height;
    },

    leftUp() {
        return vec.create(this.left, this.up);
    },

    rightDown() {
        return vec.create(this.right, this.down);
    },

    contains(r1) {
        let r2 = this;
        return r1.left >= r2.left &&
            r1.right <= r2.right &&
            r1.up >= r2.up && 
            r1.down <= r2.down;
    },
}

module.exports = Rect;
