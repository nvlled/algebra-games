let Util = require("src/Util");

let M = {
    create({
        throttle=700,
        bufferSize=20,
    } = {}) {
        return {
            bufferSize,
            throttle, 
            running: false,
            actions: [],
            lastAdd: +new Date,
            onPerform: () => { },
        }
    },

    elapsed(self, action) {
        return +new Date - self.lastAdd;
    },

    add(self, action) {
        let elapsed = M.elapsed(self);
        let throttle = self.throttle;
        if (elapsed < throttle) {
            return;
        }
        if (self.actions.length >= self.bufferSize) {
            return;
        }
        let resolve = null;
        let promise = new Promise(resolve_ => {
            resolve = resolve_;
        });
        self.actions.push([action, resolve]);
        self.lastAdd = +new Date;
        return promise;
    },

    start(self) {
        if (self.running)
            return;
        self.running = true;

        let loop = async function() {
            if (!self.running)
                return;
            let pair = self.actions.shift();
            if (pair) {
                let [action, resolve] = pair;
                if (action) {
                    let val = await action();
                    await self.onPerform(val);
                    resolve();
                }
            }
            requestAnimationFrame(loop);
        }
        loop();
    },

    stop(self) {
        self.running = false;
    },

    clear(self) {
        self.actions.slice(0);
    },
}
M.new = Util.constructor(M);
module.exports = M;
