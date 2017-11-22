
let Actions = require("src/client/algebra/Actions");
let Anima = require("src/client/algebra/Anima");
let Waypoint = require("src/client/algebra/Waypoint");
let EasingFn = require("src/client/algebra/EasingFn");
let Util = require("src/client/algebra/Util");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Vec = require("src/client/algebra/Vec");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let Algebra = require("src/client/algebra/Algebra");
let Layout = require("src/client/algebra/Layout");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let RotatedArray = require("src/client/algebra/RotatedArray");
let PIXI = require("src/client/pixi");
let GraphicTable = require("src/client/algebra/GraphicTable");

let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("metile.png"),
    background: Backgrounds.fullpath("sunsetintheswamp.png"),
}

let identity = "e";
let algebra = Algebra.new({
    identity,
    table: [
        ["2", "2", "4"],
        ["4", "4", "8"],
        ["8", "8", "16"],
        ["16", "16", "32"],
        ["32", "32", "64"],
        ["64", "64", "128"],
        ["128", "128", identity],
    ],
});

let M = {
    create({
        gameStage,
        resources,
        rows=4,
        cols=4,
        tileSize=60,
        tileSpace,
        x, y,
        speed=200,
        stretch=.7,
    } = {}) {
        gameStage.setBackground(images.background);

        let tileMap = _ => PIXI.Texture.from(images.tile);

        let self = {
            gridArgs: {
                x, y, rows, cols,
                tileSize, tileSpace,
                tileMap, speed,
                stretch,
            },

            gameStage,
            resources,
            keys: {
                left: Keyboard(37),
                up: Keyboard(38),
                right: Keyboard(39),
                down: Keyboard(40),
            },
            ticker: new PIXI.ticker.Ticker(),
            //actions: [],
            initialized: false,
            releasing: false,
            running: false,
            timerId: null,
            lastDir: {x: 0, y: 0},
            actions: Actions.new({throttle: 300, bufferSize: 1}),
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

        console.log(self);
        self.actions.onPerform = async () => {
            await M.combineElements(self);
        }
    },

    //async onPerfom(_) {
    //    let promises = [];
    //    let {cols, rows} = self.grid;

    //    // case: when there three same elements in a line,
    //    // the elements near the direction blah takes priority

    //    // since this occurs quite a lot, I think it 
    //    // helps to write a tool that abstracts an array
    //    // that lets me efficiently transpose it around
    //    // then index it in the right order in relation to a vector
    //    // or somthing like that

    //    let spriteset = new WeakSet(); // strange, I didn't put stuff in this one
    //    for (let y = 0; y < rows; y++) {
    //        for (let x = 0; x < cols; x++) {
    //            let p = Vec.new({x, y});
    //            let p_ = Vec.new(p).add(self.lastDir);

    //            let sprite1 = self.grid.spriteAt(p);
    //            let sprite2 = self.grid.spriteAt(p_);

    //            if (!sprite1 || !sprite2 || 
    //                spriteset.has(sprite1) ||
    //                spriteset.has(sprite2)) {
    //                continue;
    //            }

    //            let sprite3 = self.algebra.applySprites(sprite1, sprite2);
    //            if (!sprite3) 
    //                continue;

    //            let promise = self.grid.move({src: p, dest: p_, force: true})
    //                .then(_=> {
    //                    self.grid.removeSprite(p_);
    //                    self.grid.removeSprite(p);
    //                    let alg = self.algebra;
    //                    if (alg.algebra.identity != alg.getElem(sprite3)) {
    //                        sprite1.destroy();
    //                        sprite2.destroy();
    //                        self.grid.setSprite({sprite: sprite3, x: p_.x, y: p_.y});
    //                        return Promise.resolve();
    //                    } else {
    //                        sprite1.visible = false;
    //                        sprite1.destroy();
    //                        return Anima.boom(sprite2);
    //                    }
    //                });
    //            await promise;
    //            await self.grid.drop({dir: self.lastDir});
    //        }
    //    }


    //    //await Promise.all(promises);
    //    self.actions.add(_=> M.randomInsert(self));

    //    return Promise.resolve();

    //    //return Promise.all(promises).then(_ => {
    //    //    //self.grid.eachSprite(s => s.setState("idle"));
    //    //});
    //},

    // !!!!!!!!!!!!!!!!
    // !!!!!!!!!!!!!!!!
    // !!!!!!!!!!!!!!!!
    // !!!!!!!!!!!!!!!!
    // new less shit algorithm:
    // rotate grid by dir
    // drop(down)
    // for i,j in row; i+= 2
    //  put new elem at i,j if applicable
    //  remove elem at i+1,j
    // drop(down)
    // tadah
    //
    // now you only have to worry about how to
    // rotate array without actually doing so...
    async combineElements(self) {
        M.randomInsert(self);
        let {grid, algebra} = self;
        let {rows, cols} = grid;
        let rarr = RotatedArray.create(
            {rows, cols},
            Vec.new(self.lastDir).neg(),
            grid.gameArray.data
        );
        let ps = [];
        let gameWin = false;
        for (let y = 0; y < rows-1; y++) {
            for (let x = 0; x < cols; x++) {
                let a = grid.indexOf({x, y});
                let b = grid.indexOf({x, y: y+1});
                let sprite1 = rarr[a];
                let sprite2 = rarr[b];

                if (!(sprite1 && sprite2))
                    continue;

                let al
                let sprite3 = algebra.applySprites(sprite1, sprite2);
                if (!sprite3) 
                    continue;

                gameWin = gameWin || algebra.getElem(sprite3) == identity;

                let p  = rarr.translate(x,y);
                let p_ = rarr.translate(x,y+1);
                let promise = self.grid.move({src: p_, dest: p, force: true})
                grid.hightlightTiles([ p,p_ ]);
                await Util.sleep(150);
                grid.clearHighlights();

                let pos = grid.spritePos(sprite1);
                grid.removeSprite(sprite1, true);
                grid.removeSprite(sprite2, true);
                grid.setSprite({sprite: sprite3, x: pos.x, y: pos.y});
                ps.push(
                    Anima.scale(sprite3, { start: 0.8, seconds: 0.2})
                );
            }
        }
        await Promise.all(ps);
        await self.grid.drop({dir: self.lastDir});
        if (gameWin) {
            M.createWinMenu(self);
        } else if (self.grid.isFull()) {
            if (!M.hasCombinable(self)) {
                M.gameOver(self);
            }
        }
    },

    hasCombinable(self) {
        let {grid} = self;
        let {rows, cols} = grid;

        let isCombinable = (p1, p2) => {
            let s1 = grid.spriteAt(p1);
            let s2 = grid.spriteAt(p2);
            let combinable = self.algebra.applySprites(s1, s2) != null;
            return combinable;
        }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < rows; x++) {
                let pos = {x, y};
                if (isCombinable(pos, Vec.up(pos)))
                    return true;
                if (isCombinable(pos, Vec.right(pos)))
                    return true;
                if (isCombinable(pos, Vec.left(pos)))
                    return true;
                if (isCombinable(pos, Vec.down(pos)))
                    return true;
            }
        }

        return false;
    },

    newGame(self) {
        M.listenKeys(self);
        M.createPlayMenu(self);

        let {gameStage} = self;
        let grid = self.grid = Grid.new(self.gridArgs);
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);
        grid.clearSprites();

        M.createAlgebra(self);
        M.createGraphicTable(self);

        self.actions.start();
        self.randomInsert(3);
    },

    createAlgebra(self) {
        let {resources} = self;
        let CharSprites = require("src/client/algebra/RpgSprites").new();
        let sprites = CharSprites.getConstructors(resources);
        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                Util.randomPair(algebra.elems, sprites),
                { equals: resources["equals"].texture,
                    [algebra.identity]:  resources["blob"].texture,
                }
            )
        });
        self.algebra = galge;
    },

    createGraphicTable(self) {
        let table = self.table = GraphicTable.new(self.algebra, {
            tileSize: 30,
            tileSpace: 0.1,
            stretch: 0.8,
            tileMap: function(x, y, id) {
                return null;
            },
        });
        self.gameStage.add(table.grid);
        Layout.leftOf({}, self.grid, table.grid);
        self.table = table;
    },


    start(self) {
        M.init(self);
        M.createMainMenu(self);
    },

    createMainMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "Ten24",
            showBg: false,
            textStyle: {
                fill: 0xaa0022,
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

    createPlayMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            hide: true,
            title: "paused",
            showBg: false,
            textStyle: {
                fill: 0xdd9900,
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

    createGameOverMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "game over",
            showBg: false,
            textStyle: {
                fill: 0xdd0000,
                fontSize: 60,
            },
            onShow: ()=> {
                M.pause(self);
            },
            onHide: ()=> {
                M.resume(self);
            },
        }, {
            "Restart": ()=>{
                M.stop(self);
                M.newGame(self);
                gameStage.hideMenu();
            },
            "Quit": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    createWinMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "You win",
            showBg: false,
            textStyle: {
                fill: 0xdddd00,
                fontSize: 90,
            },
            onShow: ()=> {
                M.pause(self);
            },
            onHide: ()=> {
                M.resume(self);
            },
        }, {
            "New Game": ()=>{
                M.stop(self);
                M.newGame(self);
                gameStage.hideMenu();
            },
            "Quit": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    stop(self) {
        if (self.grid)
            self.grid.destroy(false);
        if (self.table)
        self.table.grid.destroy(false);
        M.unlistenKeys(self);
        self.actions.stop();
    },

    gameOver(self) {
        self.running = false;
        self.actions.stop();
        M.unlistenKeys(self);
        M.createGameOverMenu(self);
    },

    resume(self) {
        M.listenKeys(self);
    },
    pause(self) {
        M.unlistenKeys(self);
    },

    move(self) {
        let grid = self.grid;
        return self.actions.add(_=> {
            let state = Util.stateName(self.lastDir);
            grid.eachSprite(s => s.setState && s.setState(state));
            return grid.drop({dir: self.lastDir})
        });
    },

    moveUp(self) {
        self.lastDir = {x: 0, y: -1};
        M.move(self);
    },

    moveLeft(self) {
        self.lastDir = {x: -1, y: 0};
        M.move(self);
    },

    moveRight(self) {
        self.lastDir = {x:  1, y: 0};
        M.move(self);
    },

    moveDown(self) {
        self.lastDir = {x: 0, y:  1};
        M.move(self);
    },

    async randomInsert(self, count=2) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 2048;
        let ps = [];
        let points = grid.getEmptyPoints();
        Util.shuffle(points);
        for (let n = 0; n < Math.min(points.length, count); n++) {
            let {x, y} = points[n];
            let elem = "2";
            let sprite = algebra.createSprite(elem);
            grid.setSprite({x, y, sprite});
            ps.push(
                Anima.scale(sprite, { start: 0.8, seconds: 0.2})
            );
        }
        return Promise.all(ps);
        //for (n = 0; n < count; n++) {
        //    let elem = "2";
        //    let sprite = algebra.createSprite(elem);
        //    let [_, i] = Util.randomSelect(grid.tiles, filled, false);
        //    if (i == null) {
        //        return false;
        //    }

        //    filled[i] = true;
        //    filled[elem] = true;
        //    let {x, y} = grid.toXY(i);
        //    if (self.grid.hasSprite({x, y})) {
        //        //n--;
        //        retries--;
        //        if (retries <= 0) {
        //            break;
        //        }
        //    } else {
        //        grid.setSprite({x, y, sprite});
        //        ps.push(
        //            Anima.scale(sprite, { start: 0.8, seconds: 0.2})
        //        );
        //    }
        //}
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
