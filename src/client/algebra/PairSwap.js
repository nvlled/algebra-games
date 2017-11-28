
let Waypoint = require("src/client/algebra/Waypoint");
let Anima = require("src/client/algebra/Anima");
let Util = require("src/client/algebra/Util");
let Vec = require("src/client/algebra/Vec");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let Actions = require("src/client/algebra/Actions");
let EasingFn = require("src/client/algebra/EasingFn");
let PIXI = require("src/client/pixi");
let Algebra = require("src/client/algebra/Algebra");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let GraphicTable = require("src/client/algebra/GraphicTable");
let Layout = require("src/client/algebra/Layout");
let SetUtil = require("src/client/algebra/SetUtil");
let PixiUtil = require("src/client/algebra/PixiUtil");

let CoinSprites = require("src/client/algebra/CoinSprites");
let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("ground_04.png"),
    background: Backgrounds.dir+"/dark background.png",
}

//let algebra = Algebra.new({
//    identity: 'e',
//    table: [
//        ["a", "a", "e"],
//        ["b", "b", "a"],
//        ["c", "c", "b"],
//        ["a", "c", "b"],
//        ["c", "b", "c"],
//        ["a", "b", "b"],
//    ],
//});

let algebra = Algebra.new({
    table: [
        ["a", "a", "a", "a"],
        ["b", "b", "b", "b"],
        ["c", "c", "c", "c"],
        ["d", "d", "d", "d"],
        ["e", "e", "e", "e"],
        ["f", "f", "f", "e"],
        ["g", "g", "g", "e"],
    ],
});

let M = {
    create({
        gameStage,
        resources,
        rows=8,
        cols=8,
        tileSize=40,
        tileSpace,
        x, y,
        speed=200,
        stretch=.8,

        onGameOver=()=>{},
    } = {}) {
        gameStage.setBackground(images.background);

        //let CoinSprites = require("src/client/algebra/CoinSprites").new();
        //let ctors = CoinSprites.getConstructors(resources);

        let Rsrc = require("src/client/algebra/Rsrc");
        let sprites = Rsrc.konett();
        Util.shuffle(sprites);

        console.log(algebra.elems);
        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                {},
                Util.joinKeyval(algebra.elems, sprites),
                //{
                //    a: sprites[2],
                //    b: sprites[1],
                //    c: sprites[0],
                //    equals: resources["equals"].texture,
                //    [algebra.identity]:  resources["blob"].texture,
                //}
            )
        });

        let tileMap = _ => PIXI.Texture.from(images.tile);

        let self = {
            gameStage,
            resources,
            gridArgs: {
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                speed, stretch, interactive: true,
                wrapDrag: false,
            },
            algebra: galge,
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
        if (self.initialized)
            return;
        self.initialized = true;
    },

    handleInput(self) {
        let srcTile = null;
        let destTile = null;

        self.grid.onTileDown = ({x, y}) => {
            srcTile = self.grid.tileAt({x, y});
            srcTile.tint = 0xff0000;
        }
        self.grid.onTileClick = (pos) => {
            if (!pos)
                return;
            let {x, y} = pos;
            if (srcTile)
                srcTile.tint = 0xffffff;
            if (destTile)
                destTile.tint = 0xffffff;
        }

        self.grid.onTileDragging = (pos, pos_, dir) => {
            if (!dir)
                return;
            if (Vec.isZero(dir))
                return;

            if (destTile)
                destTile.tint = 0xffffff;

            destTile = self.grid.tileAt(pos_);
            if (destTile)
                destTile.tint = 0xff0000;
        },

        self.grid.onTileDrag = async (pos, pos_, dir, wrapped) => {
            if (srcTile)
                srcTile.tint = 0xffffff;
            if (destTile)
                destTile.tint = 0xffffff;

            if (!dir)
                return;

            if (!Vec.isOrthogonal(dir))
                return;
            if (!wrapped && Vec.dist(pos, pos_) != 1)
                return;

            let {grid} = self;
            let sprite = grid.spriteAt(pos);
            let sprite_ = grid.spriteAt(pos_);
            if (!sprite || !sprite_) {
                return;
            }

            if (sprite.setState)
                sprite.setState(Util.stateName(dir));

            grid.move({src: pos_, dest: pos, force: true, apply: true});
            await grid.move({src: pos, dest: pos_, force: true, apply: true});

            let {algebra} = self;
            let size = algebra.getMaxArgLen();
            let exclude = new Set();

            let table = [];

            for (let p of [pos, pos_]) {
                if (!p)
                    continue;
                if (exclude.has(p))
                    continue;
                let params = await M.findCandidateParameters(self, {pos: p, size, exclude});
                if (params.length > 0) {
                    SetUtil.addAll(exclude, params);
                    table = table.concat(params);
                }
            }

            let promises = [];
            if (table.length == 0) {
                grid.move({src: pos_, dest: pos, force: true, apply: true});
                await grid.move({src: pos, dest: pos_, force: true, apply: true});
            } else {
                for (let row of table) {
                    promises = promises.concat(row.map(s => {
                        grid.removeSprite(s);
                        return Anima.squeezeIn(s)
                    }));
                }
                await Promise.all(promises);
                if (dir.x != 0) 
                    await grid.dropHorizontal({dir: dir.x});
                else
                    await grid.dropVertical({dir: dir.y});

                M.fillEmptyFiles(self);
            }

        }
    },
    
    fillEmptyFiles(self) {
        let {grid, algebra} = self;
        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.cols; x++) {
                if (!grid.isOccupied({x, y})) {
                    let s = algebra.randomSprite();
                    grid.setSprite({sprite: s, x, y});
                    Anima.fade(s, {start: 0, end: 1});
                }
            }
        }
    },

    async findCandidateParameters(self, {pos, size, matchSize=true, exclude=[]}) {
        let excludeSet = exclude instanceof Set ? exclude : new Set(exclude);
        let shouldInclude = x => !excludeSet.has(x);

        let {grid, algebra} = self;

        let result = [];
        for (let n = 0; n < size; n++) {
            let sprites = [];
            for (let x = pos.x-n; x < pos.x+size-n; x++) {
                let sprite = grid.spriteAt({x, y: pos.y});
                if (sprite && shouldInclude(sprite))
                    sprites.push(sprite);
            }
            if (!matchSize || sprites.length == size) {
                //PixiUtil.tintAll(sprites, 0xff0000);
                //await Util.sleep(100);
                //PixiUtil.tintAll(sprites);

                if (algebra.applySprites(...sprites)) {
                    result.push(sprites);
                    return result;
                    //return sprites;
                }
            }
        }
        for (let n = 0; n < size; n++) {
            let sprites = [];
            for (let y = pos.y-n; y < pos.y+size-n; y++) {
                let sprite = grid.spriteAt({y, x: pos.x});
                if (sprite && shouldInclude(sprite))
                    sprites.push(sprite);
            }
            if (!matchSize || sprites.length == size) {
                //PixiUtil.tintAll(sprites, 0xff0000);
                //await Util.sleep(500);
                //PixiUtil.tintAll(sprites);

                if (algebra.applySprites(...sprites)) {
                    result.push(sprites);
                    break;
                    //return sprites;
                }
            }
        }
        return result;
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
        if (row.length > 1)
            self.grid.hightlightTiles(row, 0xff0000); 
        if (col.length > 1)
            self.grid.hightlightTiles(col, 0xff0000); 
    },

    newGame(self) {
        let grid = self.grid = Grid.new(self.gridArgs);
        let {rows, cols} = self.grid;
        let {gameStage} = self;
        grid.setInteractive();
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);

        M.handleInput(self);
        M.randomize(self, rows*cols);
        M.createPlayMenu(self);
        self.actions.start();

        let table = self.table = GraphicTable.new(self.algebra, {
            hideLastCol: true,
            tileSize: 25,
            tileSpace: 0.1,
            stretch: 0.8,
            tileMap: function(x, y, id) {
                return null;
            },
        });
        self.gameStage.add(table.grid);
        Layout.leftOf({align: "right"}, self.grid, table.grid);
    },

    start(self) {
        M.init(self);
        M.createMainMenu(self);
    },

    stop(self) {
        M.unlistenKeys(self);
        if (self.grid)
            self.grid.destroy({children: true});
        self.actions.stop();
        if (self.table)
            self.table.grid.destroy({children: true});
    },

    createMainMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "Pairswap",
            showBg: false,
            textStyle: {
                fill: 0xaaaa22,
                fontSize: 110,
            },
        }, {
            "New Game": ()=>{
                gameStage.showMenuBar();
                M.newGame(self);
            },
            "Help/Instructions": ()=>{
            },
            "Exit": ()=>{
                gameStage.exitModule();
            },
        });
    },

    createPlayMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            hide: true,
            title: "paused",
            showBg: false,
            textStyle: {
                fill: 0x990000,
                fontSize: 50,
            },
            onShow: ()=> {
                M.pause(self);
            },
            onHide: ()=> {
                M.resume(self);
            },
        }, {
            "Resume": ()=>{
                gameStage.hideMenu();
            },
            "Quit": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    resume(self) {
        M.listenKeys(self);
    },
    pause(self) {
        M.unlistenKeys(self);
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
            let elem = algebra.randomElement(false);
            let sprite = algebra.createSprite(elem);
            let [_, i] = Util.randomSelect(grid.tiles, filled);
            filled[i] = true;
            filled[elem] = true;
            let {x, y} = grid.toXY(i);
            grid.setSprite({x, y, sprite});
        }
    },

    listenKeys(self) {
        for (let key of Object.values(self.keys)) {
            key.listen();
        }
    },
    unlistenKeys(self) {
        for (let key of Object.values(self.keys)) {
            key.unlisten();
        }
    },

}
M.new = Util.constructor(M);
module.exports = M;

