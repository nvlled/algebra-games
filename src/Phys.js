let Vec = require("src/Vec");
let Util = require("src/Util");

let Phys = {
    G: 100,

    init: function(obj) {
        obj.position = Vec.init(obj.position);
        obj.vel = obj.vel || Vec.create(0, 0);
        obj.acl = obj.acl || Vec.create(0, 0);
        obj.cof = obj.cof || 0;
        obj.mass = obj.mass || 1;
        obj.stepSize = obj.stepSize || 1;
        obj.forces = obj.forces || [];
        obj.maxvel = Vec.create(10, 10);
        return obj;

    //cat.stepSize = 2;
    //cat.cof = 0.8;
    //cat.anchor.set(0.5);
    //cat.maxvel = Vec.create(10, 10);
    //cat.x = renderer.width/2/zoom;
    //cat.y = renderer.height/2/zoom;
    },

    update: function(obj, phys) {
        if (!phys)
            phys = obj;
        let apply = this.applyForce;
        let friction = Vec.wrap(Vec.copy(phys.vel));
        friction.norm().neg().mul(phys.cof);

        apply(phys, friction);
        phys.forces.forEach(function(force) {
            apply(phys, force);
        });

        //vel.add(obj.acl).clamp(obj.maxvel).mul(1000).mul(1/1000);
        Vec.add(phys.vel, phys.acl);
        Vec.clamp(phys.vel, phys.maxvel);

        // !!!!!!!!!!!!
        if (Vec.len(phys.vel) < phys.cof)
            Vec.mul(phys.vel, 0);
        // !!!!!!!!!!!!

        //console.log(phys.vel.x);
        Vec.add(obj.position, phys.vel);
        Vec.mul(phys.acl, 0);
    },
    attractTo: function(obj, attractor) {
        let dir = Vec.wrap(Vec.copy(attractor.position));

        dir = dir.sub(obj.position);
        let dist = dir.len();
        //console.log("dist", dist);
        let mag = (Phys.G * obj.mass * attractor.mass) / Math.pow(dist, 2);
        console.log(mag);
        return dir.norm().mul(mag);
    },

    applyForce: function(obj, force) {
        Vec.add(obj.acl, force);
    },

    addForce: function(obj, force) {
        obj.forces.push(force);
    },
    removeForce: function(force) {
        let i = obj.forces.indexOf(force);
        if (i >= 0)
            obj.forces.splice(i, 1);
    },
}

module.exports = Phys;
