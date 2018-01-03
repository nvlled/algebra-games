
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
let Bouton = require("src/client/algebra/Bouton");
let Table = require("src/client/algebra/Table");
let TextProp = require("src/client/algebra/TextProp");
let InputDialog = require("src/client/algebra/InputDialog");
let Highscore = require("src/client/algebra/Highscore");
let HighscoreDialog = require("src/client/algebra/HighscoreDialog");
let UI  = require("src/client/algebra/UI");
let SlideDialog  = require("src/client/algebra/SlideDialog");

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
        tileSize=45,
        tileSpace=2,
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
        let highscore = Highscore.new({
            name: "fivemore",
            length: 5,
        });

        let self = {
            highscore,
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
                                let score = self.textScore.value;
                                if (score > 0 && self.highscore.isHighscore(score)) {
                                    self.highscore.addEntry({
                                        score, 
                                    });
                                }
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
                    self.textScore.value++;
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

    setupHelpDialog(self) {
        let {gameStage} = self;
        gameStage.showHelp = () => {
            gameStage.hideMenuBar();
            M.pause(self);
            let ui = UI.new();
            let {
                img,
                fill, size, map, center, centerX, left, top, right, bottom,
                row, col, textBig, text, textSmall, minWidth, fillX,
                and, btn,slide, root, btnImg,
            } = ui.funcs();

            let path = "static/images/help/fivemore/";
            let videoSize = {
                width: 220,
                height: 150,
            }
            let videos = {
                "gameplay": PixiUtil.loadVideo(path+"gameplay.mp4", videoSize),
                "gameover": PixiUtil.loadVideo(path+"gameover.mp4", videoSize),
            }
            let slideDialog = SlideDialog.new({
                title: "Help",
                items: [
                    ui.build(_=> row(
                        videos.gameplay,
                        text(`
                            |Controls:
                            |First, click on a character to
                            |select them. Then click on an empty
                            |tile to make them move to that tile.
                            |If the tile is not reachable, then
                            |the selected character does not move.
                            `),
                    )),
                    ui.build(_=> row(
                        videos.gameover,
                        text(`
                            |Gameplay:
                            |Clear the tiles and make a score
                            |by aligning five or more similar 
                            |characters in a row or column.
                            |The game ends when all the
                            |tiles are occupied.
                            `),
                    )),
                ],
                closed: () => {
                    M.resume(self);
                    for (let [_, vid] of Object.entries(videos))
                        vid.destroy(true);
                    gameStage.showMenuBar();
                }
            });
            gameStage.addUI(slideDialog);
            Table.Align.center(slideDialog);
            Anima.fade(slideDialog, {start: 0, end: 1});
        }
    },

    newGame(self, level=0) {
        self.grid.toggleInteractive(true);
        self.grid.visible = true;

        M.randomInsert(self, 10);
        self.gameStage.showMenuBar();
        self.actions.start();
        M.createPlayMenu(self);
        M.setupTextScore(self);
        M.setupHelpDialog(self);
    },

    setupTextScore(self) {
        let fn = Table.Align.funcs;
        let text = TextProp.new({
            label: "score",
            val: 0,
        });
        self.gameStage.addChild(text);
        Table.Align.apply(text, self.grid, Util.compose(
            fn.left,
            fn.bottom,
        ), {outsideY: true});
        self.textScore = text;
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
        if (self.textScore) {
            self.textScore.destroy();
            self.textScore = null;
        }
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
            "Highscore": ()=>{
                Anima.slideOut(menu, {fade: 1});
                let hsdialog = HighscoreDialog.new({
                    data: self.highscore.data,
                    button: {
                        fontSize: 18,
                        text: "back",
                        tap: async () => {
                            Layout.center({}, menu);
                            Anima.slideIn(menu, {fade: 1});
                            await Anima.slideOut(hsdialog, {fade: 1});
                            hsdialog.destroy(true);
                        },
                    },
                });
                Anima.fade(hsdialog, {end: 1, start: 0});
                gameStage.add(hsdialog);
                Table.Align.center(hsdialog);
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


