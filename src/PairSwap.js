
let Waypoint = require("src/Waypoint");
let Util = require("src/Util");
let Vec = require("src/Vec");
let Grid = require("src/Grid");
let Block = require("src/Block");
let Keyboard = require("src/Keyboard");
let Actions = require("src/Actions");
let PIXI = require("pixi.js");

let M = {
    create({
        algebra,
        rows=4,
        cols=6,
        tileSize,
        tileSpace,
        tileMap,
        x, y,
        speed=900,
        stretch=.8,
        interactive,

        onGameOver=()=>{},
    } = {}) {
        let grid = Grid.new({
            x, y, rows, cols, tileSize, tileSpace, tileMap,
            speed, stretch, interactive,
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
        };

        return self;
    },

    init(self) {
        let srcTile = null;
        let destTile = null;

        self.grid.onTileDown = ({x, y}) => {
            srcTile = self.grid.tileAt({x, y});
            srcTile.tint = 0xff0000;
        }
        self.grid.onTileClick = ({x, y}) => {
            if (srcTile)
                srcTile.tint = 0xffffff;
            if (destTile)
                destTile.tint = 0xffffff;
        }
        self.grid.onTileUp = self.grid.onTileClick;

        self.grid.onTileDragging = (pos, pos_) => {
            let dir = Vec.new(pos_).sub(pos).norm();
            if (dir.x != 0 && dir.y != 0 || dir.len() == 0) {
                //prevent horizontal movement
                return;
            }
            console.log(dir);
            let p = Vec.new(pos).add(dir);
            if (destTile)
                destTile.tint = 0xffffff;
            destTile = self.grid.tileAt(p);
            destTile.tint = 0xff0000;
        },
        self.grid.onTileDrag = (pos, __) => {
            if (srcTile)
                srcTile.tint = 0xffffff;
            if (destTile)
                destTile.tint = 0xffffff;

            let pos_ = self.grid.getTilePos(destTile);

            let {grid} = self;
            let sprite = grid.spriteAt(pos);
            let sprite_ = grid.spriteAt(pos_);
            if (!sprite || !sprite_) {
                //console.log("no sprite at", x, y, !!sprite, "|", x_, y_, !!sprite_);
                return;
            }
            grid.move({src: pos, dest: pos_, force: true})
                .then(_=> {
                    let {algebra} = self;
                    let sprite__ = algebra.applySprites(sprite, sprite_);
                    if (sprite__) {
                        grid.removeSprite(pos);
                        grid.removeSprite(pos_);
                        sprite.destroy();
                        sprite_.destroy();
                        grid.setSprite({sprite: sprite__, x: pos_.x, y: pos_.y});
                        console.log(sprite__);
                    } else {
                        grid.move({src: pos, dest: pos, force: true})
                    }
                });
        }

        //self.grid.hightlightTiles([
        //        {x: 0, y:0},
        //        {x: 1, y:0},
        //        {x: 0, y:1},
        //], 0xff0000);
        //self.grid.hightlightRange({x: 0, y: 2}, {x: 3, y: 2});
    },

    checkTiles(self, pos) {
        let {grid} = self;
        let sprite = self.grid.spriteAt(pos); 
        if (!sprite)
            return;
        let row = grid.getRow(pos.y, false);
        let col = grid.getColumn(pos.x, false);

        grid.clearHighlights(row);
        grid.clearHighlights(col);

        let alg = self.algebra;
        let elem = alg.getElem(sprite);
        row = row.filter(pos_ => {
            let sprite_ = grid.spriteAt(pos_);
            //return elem == alg.getElem(sprite_) && sprite != sprite_;
            return elem == alg.getElem(sprite_);

        });
        col = col.filter(pos_ => {
            let sprite_ = grid.spriteAt(pos_);
            return elem == alg.getElem(sprite_);

        });
        console.log(elem, row);
        if (row.length > 1)
            self.grid.hightlightTiles(row, 0xff0000); 
        if (col.length > 1)
            self.grid.hightlightTiles(col, 0xff0000); 
    },

    newGame(self) {
        self.grid.clearSprites();
        M.start(self);
    },

    start(self) {
        M.init(self);
        //M.listenKeys(self);
        //self.actions.start();
        let {rows, cols} = self.grid;
        self.randomize(rows*cols*3/4);
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

    randomize(self, count) {
        let {algebra, grid} = self;
        let filled = {};
        for (let n = 0; n < count; n++) {
            let elem = algebra.randomElement();
            let sprite = algebra.createSprite(elem);
            let [_, i] = Util.randomSelect(grid.tiles, filled);
            filled[i] = true;
            filled[elem] = true;
            let {x, y} = grid.toXY(i);
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
