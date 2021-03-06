
let Actions = require("src/client/algebra/Actions");
let Anima = require("src/client/algebra/Anima");
let Waypoint = require("src/client/algebra/Waypoint");
let Util = require("src/client/algebra/Util");
let Vec = require("src/client/algebra/Vec");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let EasingFn = require("src/client/algebra/EasingFn");
let PIXI = require("src/client/pixi");
let Algebra = require("src/client/algebra/Algebra");
let SlideContent = require("src/client/algebra/SlideContent");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let GraphicTable = require("src/client/algebra/GraphicTable");
let Layout = require("src/client/algebra/Layout");
let Bouton = require("src/client/algebra/Bouton");
let Table = require("src/client/algebra/Table");
let TextProp = require("src/client/algebra/TextProp");
let InputDialog = require("src/client/algebra/InputDialog");
let Highscore = require("src/client/algebra/Highscore");
let HighscoreDialog = require("src/client/algebra/HighscoreDialog");
let PixiUtil = require("src/client/algebra/PixiUtil");
let UI  = require("src/client/algebra/UI");
let SlideDialog  = require("src/client/algebra/SlideDialog");

let Rsrc = require("src/client/algebra/Rsrc");
let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

// game params:
// grid size: 2x2, 4,4 5x5, ...
// 2x2  2 rows
// 2x2  3 rows
// 4x4  4 rows
// 5x5  5 rows
//
// tuple size: pair, triple

//gameplay
// xs = [a,b,c,...] pair each elems
// ys = [1,2,3,...], ys.length = xs/2
// a b 1
// d e 2
// d e 3
// ahahah this is fucking too hard
// or is it?

function formatTime(diff) {
    let mins = Util.leftpad(diff.getMinutes(), 2, "0");
    let secs = Util.leftpad(diff.getSeconds(), 2, "0");
    return `${mins}:${secs}`;
}

let createTable = size => {
    let zVals = Util.nums.split("")
        .concat(["!", "@", "#", "$", "%", "^", "&", "*"]);

    let alpha = Util.a2z.split("");
    let n = size*size;
    let elems = alpha.slice(0, n);

    let m = Math.floor(n/2);
    let table = Util.transpose(
        // m = 3
        // 0,3 | 0,1,2
        // 3,6 | 3,4,5
        // [1,2,3,4,5,6,7]
        Util.shuffle(elems.slice(0, m)),
        Util.shuffle(elems.slice(m, m+m)),
        zVals.slice(0, m)
    );

    let cakeSprites = Rsrc.cake();
    let konettSprites = Rsrc.konett();
    konettSprites.forEach(s => {
        s.texture = "";
    });

    let algebra = Algebra.new({table});
    return GraphicAlgebra.new({
        algebra,
        textures: Object.assign(
            // The bug is probably here, put textures instead of sprites?
            // or not
            {},
            Util.joinKeyval(elems.slice(0, n), cakeSprites),
            Util.joinKeyval(zVals.slice(0, m), konettSprites),
        ),
    });
}

let images = {
    tile: GridTiles.get("metile.png"),
    background: Backgrounds.dir+"/sunsetintheswamp.png",
}

let M = {
    create({
        gameStage,
        resources,
        rows=6,
        cols=8,
        tileSize=60,
        tileSpace=10,
        x, y,
        speed=900,
        stretch=.8,
        interactive,
        alpha,
        onGameOver=()=>{},
    } = {}) {
        gameStage.setBackground(images.background);

        let tileMap = _ => PIXI.Texture.from(images.tile);
        let highscore = Highscore.new({
            name: "memrise",
            length: 5,
            desc: false,
        });
        let self = {
            highscore,
            gridArgs: {
                x, y, rows: 3, cols: 3, tileSize, tileSpace, tileMap,
                speed, stretch, interactive, alpha,
                tileRadius: 24,
            },
            gameStage,
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
        if (self.initialized)
            return;
        self.initialized = true;
    },

    async handleInput(self) {
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

                let score = M.getScore(self);
                await Util.sleep(700);
                if (z == null) {
                    await Promise.all(shownTiles.map(pos => hideTile(pos)));
                } else {
                    shownTiles.forEach(pos => {
                        grid.tileAt(pos).alpha = 0.2;
                        indices[grid.indexOf(pos)] = true;
                    });
                    let len = Object.keys(indices).length;
                    if (len == self.boardSize) {
                        self.loop.stop();
                        await Util.sleep(900);
                        M.createWinGame(self, score);
                    } 
                }
                shownTiles.splice(0);
                checking = false;
            }
        }

    },

    getScore(self) {
        let d = new Date() - self.startTime;
        return d;
    },

    createWinGame(self, score) {
        console.log("score:", score);
        let message = "puzzle complete";
        if (score > 0 && self.highscore.isHighscore(score)) {
            self.highscore.addEntry({
                score, 
                time: formatTime(new Date(score)),
            });
            message = "tadah";
        }

        let {gameStage} = self;
        gameStage.createMenu({
            title: message,
            showBg: false,
            textStyle: {
                fill: 0x0000ff,
                fontSize: 50,
            },
            onShow: ()=> {
                M.pause(self);
            },
            onHide: ()=> {
                M.resume(self);
            },
        }, {
            "back to main": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
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

            let path = "static/images/help/memrise/";
            let videoSize = {
                width: 220,
                height: 150,
            }
            let videos = {
                "gameplay": PixiUtil.loadVideo(path+"gameplay.mp4", videoSize),
            }
            let slideDialog = SlideDialog.new({
                title: "Help",
                items: [
                    ui.build(_=> row(
                        videos.gameplay,
                        text(`
                            |Gameplay:
                            |Click on a hidden tile to reveal
                            |its contents. Click two tiles
                            |in succession to test if
                            |they are a valid combination.
                            |The valid combinations are
                            |indicated on the left.
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
    newGame(self, size=4) {
        let {gameStage} = self;
        self.gridArgs.rows = size;
        self.gridArgs.cols = size;
        let grid = self.grid = Grid.new(self.gridArgs);
        grid.setInteractive();
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);
        {
            let n = Math.pow(size, 2);
            if (n % 2 != 0)
                grid.hideTiles(Math.floor(n/2));
            self.backTile = grid.tiles[0].texture;
            self.frontTile = GridTiles.randomTexture(PIXI.loader.resources);

            self.boardSize =
                n%2 != 0 ? n-1 : n;
        }
        let algebra = self.algebra = createTable(size);
        self.randomize();
        M.handleInput(self);
        M.createPlayMenu(self);

        let table = self.table = GraphicTable.new(self.algebra, {
            tileSize: 35,
            tileSpace: 0.1,
            stretch: 1.0,
            tileMap: function(x, y, id) {
                return null;
            },
        });
        self.gameStage.add(table.grid);
        Layout.leftOf({
        }, self.grid, table.grid);

        M.setupTextScore(self);
        self.loop = Util.loop(_=> {
            self.textScore.value = +new Date();
        });
        M.setupTextScore(self);
        M.setupHelpDialog(self);
    },

    setupTextScore(self) {
        self.startTime = +new Date();
        let text = TextProp.new({
            label: "",
            val: +new Date(),
            format: val => formatTime(new Date(val - self.startTime)),
        });
        self.grid.addChild(text);
        let fn = Table.Align.funcs;
        Table.Align.apply(text, self.grid, Util.compose(
            fn.right,
            fn.bottom,
        ), {outsideY: true, isContained: true});
        self.textScore = text;
    },

    start(self) {
        M.init(self);
        M.createMainMenu(self);
        //Layout.col({container: self.gameStage.ui}, ...cakeSprites);
    },

    createMainMenu(self) {
        let {gameStage} = self;
        let menu = gameStage.createMenu({
            title: "Memrise",
            showBg: false,
            textStyle: {
                fill: 0xaa3322,
                fontSize: 120,
            },
        }, {
            "New Game": ()=>{
                gameStage.showMenuBar();
                //M.newGame(self, Util.randomInt(3, 4));
                M.newGame(self, 4);
            },
            "Highscore": ()=>{
                Anima.slideOut(menu, {fade: 1});
                let hsdialog = HighscoreDialog.new({
                    excl: {"score":true},
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

    stop(self) {
        if (self.loop)
            self.loop.stop();
        if (self.textScore) {
            self.textScore.destroy();
            self.textScore = null;
        }
        if (self.grid)
            self.grid.destroy({children: true});
        if (self.table)
            self.table.grid.destroy({children: true});

        M.unlistenKeys(self);
        self.actions.stop();
    },

    resume(self) {
        M.listenKeys(self);
    },
    pause(self) {
        M.unlistenKeys(self);
    },

    randomize(self) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 128;

        let count = grid.rows*grid.cols;

        let elems = Util.shuffle([...algebra.getElemArgs()]);

        let len = elems.length;
        if (count%2 != 0) {
            let i = Math.floor(count/2);
            let sprite = algebra.createSprite(elems[i]);
            let {x, y} = grid.toXY(count-1);
            sprite.visible = false;
            grid.setSprite({x, y, sprite});
        }

        for (let n = 0; n < len; n++) {
            let sprite = algebra.createSprite(elems[n]);
            let {x, y} = grid.toXY(n);
            sprite.visible = false;
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


