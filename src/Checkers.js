
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
        };

        return self;
    },

    init(self) {
        self.grid.onTileClick = ({x, y}) => {
            let {grid} = self;
            if (self.fixed[grid.gameArray.index({x, y})])
                return;

            let prevSprite = self.grid.spriteAt({x, y});
            let alg = self.algebra;
            let elem = null;
            if (prevSprite) {
                prevSprite.destroy();
                self.grid.removeSprite({x, y});
                let elem = alg.getElem(prevSprite);
                elem = Util.nextItem(alg.getElems(), elem);

                if (elem) {
                    let sprite = self.algebra.createSprite(elem);
                    self.grid.setSprite({sprite, x, y});
                }
                M.checkTiles(self, {x, y});
            } else {
                let sprite = self.algebra.createSprite(alg.getElems()[0]);
                self.grid.setSprite({sprite, x, y});
                M.checkTiles(self, {x, y});
            }

        }

        //self.grid.hightlightTiles([
        //        {x: 0, y:0},
        //        {x: 1, y:0},
        //        {x: 0, y:1},
        //], 0xff0000);
        //self.grid.hightlightRange({x: 0, y: 2}, {x: 3, y: 2});
    },

    // TODO:
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
            //return elem == alg.getElem(sprite_) && sprite != sprite_;
            return elem == alg.getElem(sprite_);

        });
        col = col.filter(pos_ => {
            let sprite_ = grid.spriteAt(pos_);
            return elem == alg.getElem(sprite_);

        });
        console.log(elem, row);
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
        //M.listenKeys(self);
        //self.actions.start();
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

    randomize(self) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 128;


        let elems = algebra.getElems();
        Util.remove(elems, algebra.algebra.identity);
        Util.shuffle(elems);
        let count = elems.length;

        self.fixed = {};
        for (n = 0; n < count; n++) {

            let elem = elems[n];

            let [_, i] = Util.randomSelect(grid.tiles, filled, false);
            if (i == null)
                return false;

            filled[i] = true;
            filled[elem] = true;
            self.fixed[i] = true;
            let {x, y} = grid.toXY(i);
            if (self.grid.hasSprite({x, y})) {
                n--;
                retries--;
                if (retries <= 0)
                    break;
            } else {
                let sprite = algebra.createSprite(elem);
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
