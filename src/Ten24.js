
let Actions = require("src/Actions");
let Waypoint = require("src/Waypoint");
let Util = require("src/Util");
let Vec = require("src/Vec");
let Grid = require("src/Grid");
let Block = require("src/Block");
let Keyboard = require("src/Keyboard");
let PIXI = require("pixi.js");

let M = {
    create({
        algebra,
        rows,
        cols,
        tileSize,
        tileSpace,
        tileMap,
        x, y,
        speed=900,
        stretch,
        onGameOver=()=>{},
    } = {}) {
        let grid = Grid.new({
            x, y, rows, cols, tileSize, tileSpace, tileMap,
            speed, stretch,
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
            releasing: false,
            running: false,
            timerId: null,
            lastDir: {x: 0, y: 0},
            actions: Actions.new({throttle: 350}),
        };

        return self;
    },

    init(self) {
        if (self.initialized)
            return;

        let {up, down, left, right} = self.keys;
        up.press    = () => M.moveUp(self);
        down.press  = () => M.moveDown(self);
        left.press  = () => M.moveLeft(self);
        right.press = () => M.moveRight(self);
        self.initialized = true;

        // TODO: should combine all combinable elements,
        // not just the ones that moved
        
        self.actions.onPerform = async function(_) {
            //let points = self.grid.gameArray.data;

            //if (!points)
                //return;
            let promises = [];
            let {cols, rows} = self.grid;
            let spriteset = new WeakSet();
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    let p = Vec.new({x, y});
                    let p_ = Vec.new(p).add(self.lastDir);

                    let sprite1 = self.grid.spriteAt(p);
                    let sprite2 = self.grid.spriteAt(p_);

                    if (!sprite1 || !sprite2 || 
                            spriteset.has(sprite1) ||
                            spriteset.has(sprite2)) {
                        continue
                    }

                    //spriteset.add(sprite2);

                    let sprite3 = self.algebra.applySprites(sprite1, sprite2);
                    if (!sprite3) 
                        continue;

                    //promises.push(self.grid.move({src: p, dest: p_, force: true})
                    await self.grid.move({src: p, dest: p_, force: true})
                            .then(_=> {
                                self.grid.removeSprite(p_);
                                self.grid.removeSprite(p);
                                sprite1.destroy();
                                sprite2.destroy();
                                self.grid.setSprite({sprite: sprite3, x: p_.x, y: p_.y});
                            //}));
                            });
                }
            }
            console.log(self.grid);
            if (self.grid.isFull()) {
                onGameOver();
            }
            M.randomize(self);
            return Promise.all(promises);
        }
    },

    newGame(self) {
        self.grid.clearSprites();
        M.start(self);
    },

    start(self) {
        M.init(self);
        M.listenKeys(self);
        self.actions.start();
        self.randomize(5);
    },

    stop(self) {
        M.unlistenKeys(self);
        self.actions.stop();
    },

    moveUp(self) {
        self.lastDir = {x: 0, y: -1};
        return self.actions.add(_=> self.grid.dropVertical({dir: -1}));
    },

    moveLeft(self) {
        self.lastDir = {x: -1, y: 0};
        return self.actions.add(_=> self.grid.dropHorizontal({dir: -1}));
    },

    moveRight(self) {
        self.lastDir = {x:  1, y: 0};
        return self.actions.add(_=> self.grid.dropHorizontal({dir: 1}));
    },

    moveDown(self) {
        self.lastDir = {x: 0, y:  1};
        return self.actions.add(_=> self.grid.dropVertical({dir: 1}));
    },

    randomize(self, count=2) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 128;
        let n;
        for (n = 0; n < count; n++) {
            let elem = algebra.randomElement();
            let sprite = algebra.createSprite(elem);
            let [_, i] = Util.randomSelect(grid.tiles, filled, false);
            if (i == null)
                return false;

            filled[i] = true;
            filled[elem] = true;
            let {x, y} = grid.toXY(i);
            if (self.grid.hasSprite({x, y})) {
                n--;
                retries--;
                if (retries <= 0)
                    break;
            } else {
                grid.setSprite({x, y, sprite});
            }
        }
        return n == count;
    },

    combineElements(self) {
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

}
M.new = Util.constructor(M);
module.exports = M;
