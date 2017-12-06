
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
let Button = require("src/client/algebra/Button");
let SlideContent = require("src/client/algebra/SlideContent");
let SetUtil = require("src/client/algebra/SetUtil");
let PixiUtil = require("src/client/algebra/PixiUtil");

let CoinSprites = require("src/client/algebra/CoinSprites");
let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("ground_05.png"),
    background: Backgrounds.dir+"/bg5.jpg",
}

let algebra = Algebra.new({
    identity: 'e',
    table: [
        ["a", "a", "e"],
        ["b", "b", "e"],
        ["c", "c", "e"],
        ["d", "d", "e"],
        ["f", "f", "e"],
        ["g", "g", "e"],
    ],
});

let count = 5;

let M = {
    create({
        gameStage,
        resources,
        rows=8,
        cols=8,
        tileSize=50,
        tileSpace=3,
        alpha=0.2,
        x, y,
        speed=200,
        stretch=.7,

        onGameOver=()=>{},
    } = {}) {
        gameStage.setBackground(images.background);

        let Rsrc = require("src/client/algebra/Rsrc");
        //let sprites = Rsrc.konett();
        let CharSprites = require("src/client/algebra/CharSprites").new();
        let sprites = CharSprites.getConstructors(resources);
        Util.shuffle(sprites);

        console.log(algebra.elems);
        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                {},
                Util.joinKeyval(algebra.elems, sprites),
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
                alpha,
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
            currentLevel: 0,
        };

        return self;
    },

    init(self) {
        if (self.initialized)
            return;
        self.initialized = true;
    },

    async followPath(self, sprite, path) {
        let {grid} = self;
        for (let p of path) {
            if (sprite.setState) {
                let p_ = grid.spritePos(sprite);
                sprite.setState(Util.stateName(Vec.new(p).sub(p_)));
                sprite.play();
            }
            await grid.move({sprite, dest: p, apply: true}); 
        }
        if (sprite.setState) {
            sprite.setState("idle");
            sprite.stop();
        }
    }, 

    handleInput(self) {
        let searching = false;
        let sprite;
        self.grid.onTileClick = async function(pos) {
            if (searching)
                return;
            let {grid} = self;
            let {gameArray} = grid;
            if (sprite) {
                if (sprite == grid.spriteAt(pos)) {
                    sprite.tint = 0xffffff;
                    sprite = null;
                    return;
                }

                searching = true;
                var path = gameArray.findPath({
                    start: grid.spritePos(sprite),
                    end:   pos,
                    speed: 1,
                    //fn: async function(path, cc) {
                    //    //grid.hightlightTiles(path);
                    //    //await Util.sleep(10);
                    //    //grid.clearHighlights();
                    //    cc();
                    //},
                    done: async function(path) {
                        if (path != null) {
                            await M.followPath(self, sprite, path);
                            let points = await M.randomInsert(self, 3);
                            if (points) {
                                points.push(Util.last(path));
                                M.findMatches(self, points);
                            }
                            if (self.grid.isFull()) {
                                grid.eachSprite(s => {
                                    Anima.shake(s);
                                });
                                await Util.sleep(1000);
                                M.createGameOverMenu(self);
                            }
                        } 
                        searching = false;
                        sprite.tint = 0xffffff;
                        sprite = null;
                    },
                });
            } else {
                sprite = grid.spriteAt(pos);
                if (!sprite)
                    return;
                sprite.tint = 0x00dddd;
            }
        }
    },

    findMatches(self, points) {
        for (let p of points) {
            let lines = M.findValidLines(self, p);
            for (let line of lines) {
                for (let s of line) {
                    Anima.fade(s, {end: 0})
                        .then(_=> {
                            self.grid.removeSprite(s, true);
                        });
                }
            }
        }
    },

    findValidLines(self, pos) {
        let dirs = [ [Vec.left, Vec.right], [Vec.down, Vec.up] ];
        let result = [];

        let {algebra, grid} = self;
        let collect = (pos, move) => {
            let sprite = grid.spriteAt(pos);
            let sprites = [];
            while (true) {
                let pos_ = move(pos);
                let sprite_ = grid.spriteAt(pos_);
                if (!sprite || !sprite_)
                    break;
                let elem = algebra.getElem(sprite);
                let elem_ = algebra.getElem(sprite_);
                if (elem != elem_)
                    break;
                sprites.push(sprite_);
                pos = pos_;
            }
            return sprites;
        }

        for (let [a,b] of dirs) {
            let sprite = grid.spriteAt(pos);
            let sprites = collect(pos, a).concat(collect(pos, b));
            sprites.push(sprite);
            if (sprites.length >= count) {
                result.push(sprites);
            }
        }
        return result;
    },

    async randomInsert(self, count=3) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 2048;
        let ps = [];
        let points = grid.getEmptyPoints();
        Util.shuffle(points);
        for (let n = 0; n < Math.min(points.length, count); n++) {
            let {x, y} = points[n];
            let sprite = algebra.randomSprite();
            grid.setSprite({x, y, sprite});
            ps.push(
                Anima.scale(sprite, { start: 0.8, seconds: 0.2})
            );
        }
        return points;
    },

    isComplete(self) {
        let {grid} = self;
        let {gameArray} = grid;
        let {cols, rows} = grid;
        for (let i = 0; i < cols*rows; i++) {
            let s = grid.gameArray.data[i];
            if (s.visible)
                return false;
        }
        return true;
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

                if (algebra.applySprites(...sprites)) {
                    result.push(sprites);
                    return result;
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

                if (algebra.applySprites(...sprites)) {
                    result.push(sprites);
                    break;
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

    newGame(self, level=0) {
        self.grid.toggleInteractive(true);
        self.grid.visible = true;

        M.randomInsert(self, 10);
        self.gameStage.showMenuBar();
        self.actions.start();
        M.createPlayMenu(self);
    },

    start(self) {
        M.init(self);

        let grid = self.grid = Grid.new(self.gridArgs);
        let {rows, cols} = self.grid;
        let {gameStage} = self;
        grid.setInteractive();
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);
        M.handleInput(self);

        grid.visible = false;
        grid.toggleInteractive(false);

        M.createMainMenu(self);
        //M.newGame(self);
    },

    stop(self) {
        M.unlistenKeys(self);
        if (self.grid)
            self.grid.destroy({children: true});
        self.actions.stop();
        if (self.blurLoop) {
            self.blurLoop.stop();
            self.blurLoop = null;
        }
        M.stopNoise(self);
    },

    createMainMenu(self) {
        let {gameStage} = self;
        let menu = gameStage.createMenu({
            title: "Five More",
            showBg: false,
            textStyle: {
                fill: 0x3393dd,
                fontSize: 90,
            },
        }, {
            "New Game": ()=>{
                gameStage.showMenuBar();
                M.newGame(self);
            },
            "Help": ()=>{
                Anima.slideOut(menu, {fade: 1});
                SlideContent.dialog({
                    title: "Help",
                    content: [
                        "Controls:",
                        " * Click/touch an item, then click an empty tile to move.",
                        "",
                        "Gameplay:",
                        " Move items such that five or more of them line up."
                    ].join("\n"),
                    buttons: {
                        ["close"]: async dialog => {
                            Layout.center({}, menu);
                            Anima.slideIn(menu, {fade: 1});
                            await Anima.slideOut(dialog, {fade: 1});
                            dialog.destroy(true);
                        },
                    },
                    parent: gameStage.ui,
                });
            },
            "Exit": ()=>{
                gameStage.exitModule();
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
            "back to menu": ()=>{
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

    createWinGame(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "level complete",
            showBg: false,
            textStyle: {
                fill: 0x000088,
                fontSize: 50,
            },
            onShow: ()=> {
                M.pause(self);
            },
            onHide: ()=> {
                M.resume(self);
            },
        }, {
            "next ": async ()=>{
                self.gameStage.hideMenu();
                await M.stopNoise(self);
                M.newGame(self, self.currentLevel+1);
            },
            "back to main": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    startNoise(self) {
        self.noiseTimer = setInterval(function() {
            let i = Util.randomIndex(self.grid.gameArray.data);
            let {x, y} = self.grid.toXY(i);
            self.noisePs = M.toggleAt(self, {x, y});
        }, 300);
    },

    async stopNoise(self) {
        clearInterval(self.noiseTimer);
        await self.noisePs;
    },

    resume(self) {
        M.listenKeys(self);
    },
    pause(self) {
        M.unlistenKeys(self);
    },

    async toggleAt(self, {x, y}, on) {
        let ps = 
            [ Vec.left, Vec.right, Vec.down, Vec.up, o=>o]
            .map(f => {
                let p = f({x, y});
                return M.lightAt(self, p);
            });
        return Promise.all(ps);
    },

    async lightAt(self, {x, y}, on) {
        let {grid} = self;
        let s = grid.spriteAt({x, y});
        if (!s)
            return;
        if (on == null) {
            on = !s.visible;
        }

        if (on) {
            s.visible = true;
            await Anima.fade(s, {start: 0, end: 1, seconds: 0.3});
        } else {
            s.visible = true;
            await Anima.fade(s, {end: 0, seconds: 0.3});
            s.visible = false;
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


