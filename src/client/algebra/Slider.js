
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
let SetUtil = require("src/client/algebra/SetUtil");
let SlideContent = require("src/client/algebra/SlideContent");
let TextureSet = require("src/client/algebra/TextureSet");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Bouton = require("src/client/algebra/Bouton");
let Table = require("src/client/algebra/Table");
let TextProp = require("src/client/algebra/TextProp");
let InputDialog = require("src/client/algebra/InputDialog");
let Highscore = require("src/client/algebra/Highscore");
let HighscoreDialog = require("src/client/algebra/HighscoreDialog");
let Sound = require("src/client/algebra/Sound");
let UI  = require("src/client/algebra/UI");
let SlideDialog  = require("src/client/algebra/SlideDialog");

let CoinSprites = require("src/client/algebra/CoinSprites");
let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("ground_05.png"),
    background: Backgrounds.dir+"/dark background.png",
}

let BLANK = Symbol("blank");
let LAST = Symbol();
let IDX = Symbol();

let algebra = Algebra.new({
    identity: 'e',
    table: [
        ["a", "a", "a", "a"],
        ["b", "b", "b", "b"],
        ["c", "c", "c", "c"],
        ["d", "d", "d", "d"],
        ["e", "e", "e", "e"],
    ],
});

let M = {
    create({
        gameStage,
        resources,
        rows=4,
        cols=4,
        tileSize=95,
        tileSpace=0,
        x, y,
        seconds=0.3,
        stretch=.95,

        onGameOver=()=>{},
    } = {}) {
        gameStage.setBackground(images.background);

        //let CoinSprites = require("src/client/algebra/CoinSprites").new();
        //let ctors = CoinSprites.getConstructors(resources);

        let Rsrc = require("src/client/algebra/Rsrc");
        let sprites = Rsrc.konett();
        Util.shuffle(sprites);

        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                {},
                Util.joinKeyval(algebra.elems, sprites),
            )
        });

        let tileMap = _ => PIXI.Texture.from(images.tile);
        let highscore = Highscore.new({
            name: "slider",
            length: 5,
        });

        let self = {
            highscore,
            gameStage,
            resources,
            gridArgs: {
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                seconds, stretch, interactive: true,
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

    getNearBlankTile(self, pos) {
        let {grid} = self;
        let points = 
            self.grid.adjacentSprites(pos)
                .filter(s => s[BLANK])
                .map(s => grid.spritePos(s));
        return points[0];
    },

    handleInput(self) {
        let srcTile = null;
        let destTile = null;

        self.grid.onTileDown = ({x, y}) => {
            srcTile = self.grid.tileAt({x, y});
            srcTile.tint = 0xff0000;
        }

        self.grid.onTileClick = async (pos) => {
            if (!pos)
                return;
            srcTile = self.grid.tileAt(pos);
            srcTile.tint = 0xffffff;

            let {grid} = self;
            let pos_ = M.getNearBlankTile(self, pos);
            if (pos_) {
                grid.move({src: pos_, dest: pos, force: true, apply: true});
                await grid.move({src: pos, dest: pos_, force: true, apply: true});
            }
            Sound.play("click");
            self.textScore.value++;
            if (M.isComplete(self)) {
                console.log("done");
                M.createWinGame(self);
            }
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

            if (!(sprite[BLANK] || sprite_[BLANK])) {
                return;
            }

            grid.move({src: pos_, dest: pos, force: true, apply: true});
            await grid.move({src: pos, dest: pos_, force: true, apply: true});

            self.textScore.value++;
            if (M.isComplete(self)) {
                console.log("done");
                M.createWinGame(self);
            }
            Sound.play("click");
        }
    },

    createWinGame(self) {
        let score = self.textScore.value;
        if (score > 0 && self.highscore.isHighscore(score)) {
            self.highscore.addEntry({
                score, 
            });
        }

        let {gameStage} = self;
        gameStage.createMenu({
            title: "Puzzle complete",
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
            "back to main": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
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

    setupHelpDialog(self) {
        let {gameStage} = self;
        gameStage.showHelp = () => {
            gameStage.hideMenuBar();
            self.textScore.visible = false;
            M.pause(self);
            let ui = UI.new();
            let {
                img,
                fill, size, map, center, centerX, left, top, right, bottom,
                row, col, textBig, text, textSmall, minWidth, fillX,
                and, btn,slide, root, btnImg,
            } = ui.funcs();

            let path = "static/images/help/slider/";
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
                            |Drag a tile into the empty slot
                            |to move it. Or, click a tile
                            |adjacent to the empty slot to move.
                            |The goal is to complete the jumbled
                            |image.
                            `),
                    )),
                ],
                closed: () => {
                    M.resume(self);
                    for (let [_, vid] of Object.entries(videos))
                        vid.destroy(true);
                    gameStage.showMenuBar();
                    self.textScore.visible = true;
                }
            });
            gameStage.addUI(slideDialog);
            Table.Align.center(slideDialog);
            Anima.fade(slideDialog, {start: 0, end: 1});
        }
    },

    async newGame(self) {
        let grid = self.grid = Grid.new(self.gridArgs);
        let {rows, cols} = self.grid;
        let {gameStage} = self;
        grid.setInteractive();
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);

        M.createPlayMenu(self);
        self.setupGrid(rows*cols);

        //await Util.sleep(500);
        await M.shuffle(self);
        await M.selectBlankTile(self);

        let btn = Bouton.new({
            text: "shuffle",
            pointerup: async () => {
                btn.visible = false;
                await M.shuffle(self);
                btn.visible = true;
            }
        });
        self.shuffleBtn = btn;
        Layout.belowOf({}, self.grid, btn);

        M.handleInput(self);
        self.actions.start();
        M.setupTextScore(self);
        M.setupHelpDialog(self);
    },

    setupTextScore(self) {
        let fn = Table.Align.funcs;
        let text = TextProp.new({
            label: "moves",
            val: 0,
        });
        self.gameStage.addChild(text);
        Table.Align.apply(text, self.grid, Util.compose(
            fn.right,
            fn.bottom,
        ), {outsideY: true});
        self.textScore = text;
    },

    async swap(self, pos1, pos2) {
        let {grid} = self;
        grid.move({src: pos2, dest: pos1, force: true, apply: true, seconds: 0.1});
        await grid.move({src: pos1, dest: pos2, force: true, apply: true, seconds: 0.1});
    },

    async shuffle(self) {
        let {grid} = self;
        let indices = Util.shuffle(Util.range(grid.getDataSize()));
        let fns = ["left", "right", "up", "down"].map(k => Vec[k]);
        for (let i of indices) {
            let pos = grid.toXY(i);
            let pos_ = null;
            Util.shuffle(fns);
            for (let f of fns) {
                pos_ = f(pos);
                if (!grid.outbounds(pos_) && grid.hasSprite(pos_))
                    break;
                pos_ = null;
            }
            if (pos_)
                await M.swap(self, pos, pos_);
        }
    },

    start(self) {
        M.init(self);
        M.createMainMenu(self);
    },

    stop(self) {
        if (self.textScore) {
            self.textScore.destroy();
            self.textScore = null;
        }
        M.unlistenKeys(self);
        if (self.grid)
            self.grid.destroy(false);
        self.actions.stop();
        if (self.shuffleBtn)
            self.shuffleBtn.destroy();
    },

    createMainMenu(self) {
        let {gameStage} = self;
        let menu = gameStage.createMenu({
            title: "Slider",
            showBg: false,
            textStyle: {
                fill: 0x9a9a92,
                fontSize: 110,
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

    setupGrid(self, count) {
        //let filled = {};
        //for (let n = 0; n < count; n++) {
        //    let elem = algebra.randomElement(false);
        //    let sprite = algebra.createSprite(elem);
        //    let [_, i] = Util.randomSelect(grid.tiles, filled);
        //    filled[i] = true;
        //    filled[elem] = true;
        //    let {x, y} = grid.toXY(i);
        //    grid.setSprite({x, y, sprite});
        //}

        let {algebra, grid} = self;
        let {rows, cols} = grid;
        let images = [
            "static/images/armadillo.jpg",
            "static/images/hare.jpg",
            "static/images/racoon.jpg",
        ];
        let image = PIXI.Texture.from(Util.randomSelect(images)[0]);

        //self.gameStage.add(image);

        let txtr = TextureSet.new({
            rows, cols,
            tileWidth: Math.floor(image.width/cols),
            tileHeight: Math.floor(image.height/rows),
            //exclude: 2,
            image,
        });
        let sprites = txtr.textures.map(t=>new PIXI.Sprite(t));
        let sprite;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let i = y*cols + x;
                sprite = sprites[i];
                grid.setSprite({sprite, x, y});
                grid.tileAt({x, y}).alpha = 0.1;
                sprite[IDX] = i;
            }
        }
        self[LAST] = sprite;

    },

    isComplete(self) {
        for (let i = 0; i < self.grid.getDataSize(); i++) {
            let s = self.grid.spriteOn(i);
            console.log(s[IDX], i);
            if (s[IDX] != i)
                return false;
        }
        return true;
    },

    selectBlankTile(self) {
        let {algebra, grid} = self;
        let {rows, cols} = grid;
        //let i = Util.randomIndex(grid.tiles);
        let {x, y} = grid.spritePos(self[LAST]);
        let blankTile = PIXI.Sprite.fromImage(images.tile);
        blankTile.tint = 0x000000;
        blankTile[BLANK] = "blank";
        blankTile[IDX] = self[LAST][IDX];
        self.grid.removeSprite({x, y}, true);
        self.grid.setSprite({sprite: blankTile, x, y, stretch: 1});
        return Anima.fade(blankTile, {end: 0, seconds: 0.5});
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

