
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
let Layout = require("src/client/algebra/Layout");

let CoinSprites = require("src/client/algebra/CoinSprites");
let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("ground_05.png"),
    background: Backgrounds.dir+"/dark background.png",
}

let algebra = Algebra.new({
    identity: 'e',
    table: [
        ["a", "a", "e"],
        ["b", "b", "a"],
        ["c", "c", "b"],
        ["a", "c", "b"],
        ["c", "b", "c"],
        ["a", "b", "b"],
    ],
});

let M = {
    create({
        gameStage,
        resources,
        rows=5,
        cols=6,
        tileSize=80,
        tileSpace,
        x, y,
        speed=200,
        stretch=.8,

        onGameOver=()=>{},
    } = {}) {
        gameStage.setBackground(images.background);

        let CoinSprites = require("src/client/algebra/CoinSprites").new();
        let ctors = CoinSprites.getConstructors(resources);

        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                {
                    a: ctors[2],
                    b: ctors[1],
                    c: ctors[0],
                    equals: resources["equals"].texture,
                    [algebra.identity]:  resources["blob"].texture,
                }
            )
        });

        let tileMap = _ => PIXI.Texture.from(images.tile);

        let self = {
            gameStage,
            resources,
            gridArgs: {
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                speed, stretch, interactive: true,
                wrapDrag: true,
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
            //dir = Vec.new(pos_).sub(pos).norm();
            //if (dir.x != 0 && dir.y != 0 || dir.len() == 0) {
            //    //prevent horizontal movement
            //    return;
            //}

            if (!dir)
                return;
            if (Vec.isZero(dir))
                return;

            if (destTile)
                destTile.tint = 0xffffff;

            //let p = Vec.new(pos).add(dir);
            //destTile = self.grid.tileAt(p);
            destTile = self.grid.tileAt(pos_);
            if (destTile)
                destTile.tint = 0xff0000;


            //let {rows, cols} = self;
            //if (x >= cols)
            //    x = 0;
            //else if (x < 0)
            //    x = cols-1;
            //if (y >= rows)
            //    y = 0;
            //else if (y< 0)
            //    y = rows-1;
        },
        //self.grid.onTileOut = (pos, __) => {
        //    if (srcTile)
        //        srcTile.tint = 0xffffff;
        //    if (destTile)
        //        destTile.tint = 0xffffff;
        //},
        self.grid.onTileDrag = (pos, pos_, dir, wrapped) => {
            if (srcTile)
                srcTile.tint = 0xffffff;
            if (destTile)
                destTile.tint = 0xffffff;

            if (!dir)
                return;

            //pos_ = Vec.new(pos).add(dir);

            if (!Vec.isOrthogonal(dir))
                return;
            console.log(wrapped, dir.len())
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

            grid.move({src: pos, dest: pos_, force: true})
                .then(_=> {
                    let {algebra} = self;
                    let sprite__ = algebra.applySprites(sprite, sprite_);
                    if (sprite__) {
                        grid.removeSprite(pos);
                        grid.removeSprite(pos_);
                        if (algebra.getElem(sprite__) == algebra.algebra.identity) {
                            for (let s of [sprite, sprite_]) {
                                Anima.boom(s);
                            }
                        } else {
                            sprite.destroy();
                            sprite_.destroy();
                            grid.setSprite({sprite: sprite__, x: pos_.x, y: pos_.y});
                        }
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
        self.randomize(rows*cols);
        M.createPlayMenu(self);
        self.actions.start();
    },

    start(self) {
        M.init(self);
        M.createMainMenu(self);
    },

    stop(self) {
        M.unlistenKeys(self);
        if (self.grid)
            self.grid.destroy(false);
        self.actions.stop();
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

