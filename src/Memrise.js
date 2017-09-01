
let Actions = require("src/Actions");
let Anima = require("src/Anima");
let Waypoint = require("src/Waypoint");
let Util = require("src/Util");
let Vec = require("src/Vec");
let Grid = require("src/Grid");
let Block = require("src/Block");
let Keyboard = require("src/Keyboard");
let EasingFn = require("src/EasingFn");
let PIXI = require("pixi.js");
let GridTiles = require("src/GridTiles");

let M = {
    create({
        algebra,
        rows=6,
        cols=4,
        tileSize,
        tileSpace,
        tileMap,
        x, y,
        speed=900,
        stretch=.8,
        interactive,
        alpha,

        onGameOver=()=>{},
    } = {}) {
        let grid = Grid.new({
            x, y, rows, cols, tileSize, tileSpace, tileMap,
            speed, stretch, interactive, alpha,
        });
        grid.setInteractive();
        
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
            initialized: false,
            releasing: false,
            running: false,
            timerId: null,
            lastDir: {x: 0, y: 0},
            actions: Actions.new({throttle: 350}),
            fixed: {},
            backTile: grid.tiles[0].texture,
            frontTile: GridTiles.randomTexture(PIXI.loader.resources),
        };

        return self;
    },

    async init(self) {
        if (self.initialized)
            return;
        self.initialized = true;
        let paramCount = 2;
        let shownTiles = [];
        let indices = {};
        let swipeSpeed = 0.2;

        let showTile = async pos => {
            let {grid} = self;
            let tile = grid.tileAt(pos);
            let sprite = grid.spriteAt(pos);

            let i = grid.indexOf(pos);
            if (indices[i])
                return;

            if (!sprite)
                return;
            if (shownTiles.some(p => Vec.equals(p, pos)))
                return;
            shownTiles.push(pos);

            Anima.squeezeIn(tile,{ seconds: swipeSpeed, });
            await Anima.squeezeIn(sprite,{ seconds: swipeSpeed, });

            let sx = tile.scale.x;
            let alpha = tile.alpha;

            sprite.visible = true;
            tile.texture = self.frontTile;
            tile.scale.x = sx;
            tile.alpha = alpha;

            Anima.squeezeOut(tile,{ seconds: swipeSpeed, });
            await Anima.squeezeOut(sprite,{ seconds: swipeSpeed, });
            return Promise.resolve();
        }
        let hideTile = async pos => {
            let {grid} = self;
            let tile = grid.tileAt(pos);
            let sprite = grid.spriteAt(pos);
            if (!sprite)
                return;
            Anima.squeezeIn(tile, { seconds: swipeSpeed, });
            await Anima.squeezeIn(sprite,{ seconds: swipeSpeed, });

            let sx = tile.scale.x;
            let alpha = tile.alpha;

            sprite.visible = false;
            tile.texture = self.backTile;
            tile.scale.x = sx;
            tile.alpha = alpha;

            Anima.squeezeOut(tile,{ seconds: swipeSpeed, });
            await Anima.squeezeOut(sprite,{ seconds: swipeSpeed, });
            return Promise.resolve();
        }

        let checking = false;
        self.grid.onTileClick = async (pos) => {
            let {grid, algebra} = self;
            if (shownTiles.length == paramCount || checking) 
                return;

            await showTile(pos);
            if (shownTiles.length == paramCount && !checking) {
                checking = true;
                let params = shownTiles.map(pos => algebra.getElem(grid.spriteAt(pos)));
                let z = algebra.apply(...params);

                await Util.sleep(700);
                if (z == null) {
                    await Promise.all(shownTiles.map(pos => hideTile(pos)));
                } else {
                    shownTiles.forEach(pos => {
                        grid.tileAt(pos).alpha = 0.2;
                        indices[grid.indexOf(pos)] = true;
                    });
                }
                shownTiles.splice(0);
                checking = false;
            }
        }

    },

    checkTiles(self, pos) {
        let {grid} = self;

        let row = grid.getRow(pos.y, false);
        let col = grid.getColumn(pos.x, false);

        let sprite = self.grid.spriteAt(pos); 
        if (!sprite)
            return;

        grid.clearHighlights(row);
        grid.clearHighlights(col);

        let alg = self.algebra;
        let elem = alg.getElem(sprite);
        row = row.filter(pos_ => {
            let sprite_ = grid.spriteAt(pos_);
            return elem == alg.getElem(sprite_);

        });
        col = col.filter(pos_ => {
            let sprite_ = grid.spriteAt(pos_);
            return elem == alg.getElem(sprite_);

        });
        if (row.length > 1)
            self.grid.hightlightTiles(row, 0xff8888); 
        if (col.length > 1)
            self.grid.hightlightTiles(col, 0xff8888); 
    },

    newGame(self) {
        self.grid.clearSprites();
        M.start(self);
    },

    start(self) {
        M.init(self);
        self.randomize();
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

    randomize(self) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 128;

        let count = grid.rows*grid.cols;

        self.fixed = {};
        for (let n = 0; n < count; n++) {
            let sprite = algebra.randomSprite(false);
            let {x, y} = grid.toXY(n);
            sprite.visible = false;
            grid.setSprite({x, y, sprite});
        }
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
