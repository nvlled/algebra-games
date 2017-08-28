let Interpol = require("src/Interpol");
let Vec = require("src/Vec");
var assert = require('assert');

let vec = Vec.from;
describe('Interpol', function() {
    describe('#applyScalar()', function() {
        it('should return values from 0 to 1', function() {
            let intr = Interpol.new(0, 10);
            assert.equal(.5, intr.applyScalar(5));
            assert.equal(0, intr.applyScalar(0));
            assert.equal(1, intr.applyScalar(10));
        });
        it('should work on descending range', function() {
            let intr = Interpol.new(10, 0);
            assert.equal(.5, intr.applyScalar(5));
            assert.equal(1, intr.applyScalar(0));
            assert.equal(0, intr.applyScalar(10));
        });
        it('should work on negative values', function() {
            let intr = Interpol.new(-20, -10);
            assert.equal(.5, intr.applyScalar(-15));
            assert.equal(1, intr.applyScalar(-10));
            assert.equal(0, intr.applyScalar(-20));
            assert.equal(.25, intr.applyScalar(-17.5));
        });
    });
    describe('#mapScalar()', function() {
        it('should map to (100, 200)', function() {
            let intr = Interpol.new(0, 10);
            assert.equal(150, intr.mapScalar(0.5, 100, 200));
            assert.equal(100, intr.mapScalar(0, 100, 200));
            assert.equal(200, intr.mapScalar(1, 100, 200));
        });
    });
});




