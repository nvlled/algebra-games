let Util = require("src/Util");
let Grid = require("src/Grid");
let Block = require("src/Block");
let Keyboard = require("src/Keyboard");
let PIXI = require("pixi.js");

let shapes = {
    L: {
        cols: 3,
        data: [
            1, 1, 1,
            1, 0, 0,
        ],
    },
    J: {
        cols: 3,
        data: [
            1, 1, 1,
            0, 0, 1,
        ],
    },
    O: {
        cols: 2,
        noRotate: true,
        data: [
            1, 1,
            1, 1,
        ],
    },
    I: {
        cols: 4,
        data: [ 1, 1, 1, 1 ],
    },
    T: {
        cols: 3,
        data: [
            1, 1, 1,
            0, 1, 0,
        ],
    },
};

let maxRows = (function() {
    let row = 0;
    for (let [_, shape] of Object.entries(shapes)) {
        row = Math.max(row, shape.data.length/shape.cols);
    }
    return row;
})();

let M = {
    create({
        algebra,
        rows,
        cols,
        tileSize,
        tileSpace,
        alpha,
        tileMap,
        x, y,
    } = {}) {
        let grid = Grid.new({
            x, y, rows, cols, tileSize, tileSpace, tileMap,
            alpha,
        });
        
        let self = {
            grid,
            algebra,
            keys: {
                left: Keyboard(37),
                up: Keyboard(38),
                right: Keyboard(39),
                down: Keyboard(40),
            },
            ticker: new PIXI.ticker.Ticker(),
            actions: [],
            initialized: false,
            descendSpeed: 900,
            releasing: false,
            running: false,
            timerId: null,
        };

        return self;
    },

    init(self) {
        self.keys.left.press  = e=>M.moveLeft(self);
        self.keys.right.press = e=>M.moveRight(self);
        self.keys.up.press    = e=>M.rotate(self);
        self.keys.down.press  = e=>M.release(self);

        // TODO: add stop for loop
        let loop = async function() {
            let action = self.actions.shift();
            if (action && !self.releaseAction) {
                await action();
            }
            requestAnimationFrame(loop);
        }
        loop();
        // note: ticker doesn't actually work with async
        // TODO: lower ticker's framerate
        //self.ticker.add(self.loop);
    },

    startDescension(self) {
        let loop = async function() {
            if (self.releaseAction) {
                await self.releaseAction;
                //await M.shift(self);
                //M.newBlock(self);
                self.actions.splice(0);
                self.releaseAction = null;
            } 

            let points = self.currentBlock.points;
            await M.moveDown(self);
            if (self.currentBlock.points == points) {
                await M.shift(self);
                M.newBlock(self);
            }

            if (self.running) {
                setInterval(loop, self.descendSpeed);
            }
        } 
        setInterval(loop, self.descendSpeed);
    },
    stopDescension(self) {
    },

    async start(self) {
        if (!self.initialized) {
            M.init(self);
        }
        running = true;
        M.listenKeys(self);

        M.clear(self);
        M.randomize(self, 30);
        await M.shift(self);
        M.newBlock(self);

        M.startDescension(self);
        //self.ticker.start();
    },

    stop(self) {
        M.unlistenKeys(self);
        //self.ticker.stop();
    },

    clear(self) {
        self.grid.clearSprites();
    },

    randomize(self, count) {
        let {algebra, grid} = self;
        let filled = {};
        for (let n = 0; n < count; n++) {
            let elem = algebra.randomElement(false);
            let sprite = algebra.createSprite(elem);
            let [_, i] = Util.randomSelect(grid.tiles, filled);
            filled[i] = true;
            filled[elem] = true;
            let {x, y} = grid.toXY(i);
            grid.setSprite({x, y, sprite});
        }
    },

    shift(self) {
        let woah = null;
        M.queueAction(self, 
            async function() {
                let p = self.grid.dropVertical();
                return p.then(_=> woah());
        });
        return new Promise(resolve => {
            woah = resolve;
        });
    },

    newBlock(self, shapeName) {
        if (!shapeName) {
            let names = Object.keys(shapes);
            shapeName = Util.randomSelect(names)[0];
        }
        self.currentBlock = M.createBlock(self, shapeName);
        M.insertBlock(self, self.currentBlock);
    },

    createBlock(self, shapeName) {
        let shape = shapes[shapeName];
        if (!shape)
            throw "unknown shape: " + shapeName;
        
        let {cols, data, noRotate, pivot} = shape;
        let block = Block.create({
            cols, 
            noRotate,
            rows: 2,
            pivot,
            data: data.map(x => {
                if (x == 1) {
                    let {algebra} = self;
                    let elem = algebra.randomElement(false);
                    return algebra.createSprite(elem);
                }
                return null;
            }),
        });
        return block;
    },

    randomBlock(self) {
        let names = Object.keys(shapes);
        let name = Util.randomSelect(names)[0];
        return M.createBlock(self, name);
    },

    insertBlock(self, block, pos) {
        if (!pos) {
            pos = {
                x: Math.floor((self.grid.cols-block.cols)/2),
                y: 2,
            }
        }
        self.grid.insertBlock(block, pos);
    },

    moveBlock(self, block, dir) {
        return self.grid.moveBlock({block, dir});
    },

    moveLeft(self) {
        if (!self.currentBlock || self.releaseAction)
            return;
        M.queueAction(self, 
            () => M.moveBlock(self, self.currentBlock, {x: -1, y: 0}));
    },
    moveRight(self) {
        if (!self.currentBlock || self.releaseAction)
            return;
        M.queueAction(self, 
            () => M.moveBlock(self, self.currentBlock, {x: 1, y: 0}));
    },

    search(self, points) {
        let {algebra} = self;
        let blocks = [];
        let getGroupOf = (pos, dir, n) => {
            for (let x = 0; x < n; x++) {
                let block = [];
                for (let a = 0; a < n; a++) {
                    let p = pos.new().add(dir.new().mul(a));
                    let sprite = self.grid.spriteAt(p);
                    if (sprite)
                        block.push(p);
                }
                if (block.length == n)
                    blocks.push(block);
            }
            return blocks;
        }
        for (let p of points) {
        }
    },

    // I bid goodluck to my future self for reading this code
    moveDown(self) {
        if (!self.currentBlock || self.releaseAction)
            return Promise.reject();
        let woah = null;
        M.queueAction(self, 
            async function() {
                let p = M.moveBlock(self, self.currentBlock, {x: 0, y: 1});
                return p.then(_=> woah());
        });
        return new Promise(resolve => {
            woah = resolve;
        });
    },

    async release(self) {
        //if (!self.currentBlock || self.releaseAction)
        //    return Promise.reject();
        //self.releaseAction = M.releaseBlock(self, self.currentBlock);
        //await self.releaseAction;
        //return Promise.resolve();
        let woah = null;
        M.queueAction(self, 
            async function() {
                let p = M.releaseBlock(self, self.currentBlock);
                self.releaseAction = p;
                //p.then(_=> woah());
        });
        return new Promise(resolve => {
            woah = resolve;
        });
    },

    rotate(self) {
        M.queueAction(self, 
            () => M.rotateBlock(self, self.currentBlock));
    },
    async releaseBlock(self, block) {
        let moved = true;
        while (moved) {
            moved = await self.grid.moveBlock({block, dir: {x: 0, y: 1}});
        }
        return Promise.resolve();
    },

    rotateBlock(self, block) {
        return self.grid.rotateBlock({block});
    },

    listenKeys(self) {
        for (let key of Object.values(self.keys)) {
            key.listen();
        }
    },
    unlistenKeys(self) {
        for (let key of self.keys) {
            key.unlisten();
        }
    },

    queueAction(self, action) {
        self.actions.push(action);
    },

    move(self) {
    },

    end(self) {
    },
}
M.new = Util.constructor(M);

module.exports = M;


