let Util = require("src/client/algebra/Util");

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
            lastAdd: null,
            onPerform: () => { },
            blocked: false,
        }
    },

    elapsed(self, action) {
        return +new Date - self.lastAdd;
    },

    add(self, action, immediate=false) {
        if (self.blocked) {
            return Promise.resolve();
        }

        let elapsed = M.elapsed(self);
        let throttle = self.throttle;
        if (!immediate) {
            if (self.lastAdd != null && elapsed < throttle) {
                return;
            }
            if (self.actions.length >= self.bufferSize) {
                return;
            }
        }

        let resolve = null;
        let promise = new Promise(resolve_ => {
            resolve = resolve_;
        });

        if (immediate)
            self.actions.unshift([action, resolve]);
        else
            self.actions.push([action, resolve]);

        self.lastAdd = +new Date;
        return promise;
    },

    block(self, t=true) {
        self.blocked = t;
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
                    resolve(val);
                }
            }
            if (self.running)
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
