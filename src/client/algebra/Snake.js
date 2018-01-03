
let Actions = require("src/client/algebra/Actions");
let Algebra = require("src/client/algebra/Algebra");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let GraphicTable = require("src/client/algebra/GraphicTable");
let Anima = require("src/client/algebra/Anima");
let Waypoint = require("src/client/algebra/Waypoint");
let Util = require("src/client/algebra/Util");
let Vec = require("src/client/algebra/Vec");
let Backgrounds = require("src/client/algebra/Backgrounds");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Rsrc = require("src/client/algebra/Rsrc");
let Keyboard = require("src/client/algebra/Keyboard");
let EasingFn = require("src/client/algebra/EasingFn");
let SlideContent = require("src/client/algebra/SlideContent");
let Button = require("src/client/algebra/Button");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Sound = require("src/client/algebra/Sound");
let Layout = require("src/client/algebra/Layout");
let PIXI = require("src/client/pixi");
let Bouton = require("src/client/algebra/Bouton");
let Table = require("src/client/algebra/Table");
let TextProp = require("src/client/algebra/TextProp");
let InputDialog = require("src/client/algebra/InputDialog");
let Highscore = require("src/client/algebra/Highscore");
let HighscoreDialog = require("src/client/algebra/HighscoreDialog");
let UI  = require("src/client/algebra/UI");
let SlideDialog  = require("src/client/algebra/SlideDialog");

let GridTiles = require("src/client/algebra/GridTiles");

function randomTable(numElems, rows=numElems/2) {
    let elems = "abcdefghijklmnopqrstuvwxyz".split("").slice(0, numElems+1);
    if (elems.length < numElems)
        throw "cannot create table numElems is too large: " + numElems;
    let table = [];
    let rand = _=> Util.randomSelect(elems)[0];
    for (let i = 0; i < rows; i++)
        table.push([rand(), rand(), rand()]);
    return table;
}

let M = {
    create({
        gameStage,
        resources,
        rows=6,
        cols=9,
        tileSize=40,
        tileSpace=1,
        x, y,
        seconds=0.4,
        stretch=.90,
        alpha=0.5,

        onGameOver=()=>{},
    } = {}) {
        let CharSprites = require("src/client/algebra/MonsterSprites").new();
        let charSprites = CharSprites.getConstructors(resources);

        let {randomTexture} = GridTiles;
        let tile1 = randomTexture(PIXI.loader.resources);

        let tileMap = (x, y) => {
            return tile1;
        }
        let highscore = Highscore.new({
            name: "snake",
            length: 5,
        });
        let self = {
            highscore,
            gridArgs: {
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                seconds, stretch, interactive: true, alpha,
            },
            charSprites,
            gameStage,
            resources,
            actions: Actions.new({throttle: 10, bufferSize: 1}),
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
            fixed: {},
            dir: {x: 0, y: 0},

            sprites: [],
        };

        return self;
    },

    createAlgebra(self) {
        let {resources} = self;
        let sprites = Rsrc.cake();

        let algebra = Algebra.new({
            table: randomTable(9, 7),
        });

        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                Util.randomPair(algebra.elems, sprites),
                { equals: resources["equals"].texture,
                }
            )
        });
        let tile = PIXI.Texture.from(GridTiles.get("ground_03.png"));
        let table = self.table = GraphicTable.new(galge, {
            alpha: 0.8,
            tileSize: 25,
            tileSpace: 1.0,
            stretch: 0.7,
            tileMap: function(x, y, id) {
                return tile;
            },
        });
        self.algebra = galge;
        self.table = table;
    },


    async init(self) {
        if (self.initialized)
            return;
        self.initialized = true;
    },

    move(self) {
        let {grid, dir, algebra} = self;
        return self.actions.add(async _ => {
            let poss = self.sprites.map(s => grid.spritePos(s));
            let newpos = Vec.new(poss[0]).add(dir);

            if (grid.gameArray.outbounds(newpos)) {
                let sprite = grid.spriteAt(poss[0]);
                newpos = grid.wrapPos(newpos);
            }

            let head = grid.spriteAt(poss[0]);
            let sprite = grid.spriteAt(newpos);

            let gameOver = sprite && self.sprites.indexOf(sprite) >= 0;
            if (sprite && self.sprites.indexOf(sprite) < 0) {
                self.textScore.value++;
                self.grow++;
                Anima.fadeAway(sprite);
                M.randomInsert(self, Util.randomInt(1,1));
                if (Math.random() < 0.5)
                    Sound.play("mons1")
                else
                    Sound.play("mons2")
            }

            poss.unshift(newpos);
            let lastPos;
            lastPos = poss.pop();

            let ps = self.sprites.map((sprite, i) => {
                let src = grid.spritePos(sprite);
                let dest = poss[i];
                let dir = Vec.new(dest).sub(src).norm();
                let jump = Vec.dist(src, dest) > 1;
                if (jump)
                    dir.neg();
                if (sprite.setState)
                    sprite.setState(Util.stateName(dir));
                return self.grid.move({
                    sprite,
                    dest,
                    force: true,
                    apply: true,
                    jump,
                });
            });
            await Promise.all(ps);
            if (gameOver) {
                Sound.play("meh");
                self.actions.stop();
                self.gameLoop.stop();
                self.sprites.forEach(async s => {
                    setTimeout(function() {
                        Anima.fadeAway(s);
                    }, Math.random()*500);
                });
                let score = self.textScore.value;
                if (score > 0 && self.highscore.isHighscore(score)) {
                    self.highscore.addEntry({
                        score, 
                    });
                }
                M.createGameOverMenu(self);
                return;
            } else if (self.grow > 0) {
                self.grow--;
                sprite = new PIXI.Sprite(sprite.texture);
                if (self.sprites.length > 2) {
                    Util.last(self.sprites).tint = 0x44ff00;
                }
                sprite.tint = 0xff0000;
                //let sprite = PixiUtil.roundedRect({
                //    color: 0x00d0dd,
                //    alpha: 0.8,
                //    radius: 15,
                //    width: grid.tileWidth,
                //    height: grid.tileHeight,
                //});
                if (lastPos) {
                    grid.setSprite({sprite, x: lastPos.x, y: lastPos.y});
                    self.sprites.push(sprite);
                }
            }

            return Promise.resolve();
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
            "Quit": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    listNextPositions(self, pos) {
        let {grid} = self;
        let dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        let points = [];
        let sprite = grid.spriteAt(pos);
        if (!sprite)
            return [];
        for (let arr of dirs) {
            let dir = Vec.new({x: arr[0], y: arr[1]});
            let p1 = Vec.new(pos).add(dir);
            let p2 = Vec.new(pos).add(Vec.mul(dir, 2));
            if (!grid.hasSprite(p1))
                points.push(p1);
            else {
                let sprite_ = grid.spriteAt(p1);
                if (!grid.hasSprite(p2) && grid.hasSprite(p1) &&
                        sprite[TEAM] != sprite_[TEAM])
                    points.push(p2);
            }
        }
        points.push(pos);
        return points;
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

            let path = "static/images/help/snake/";
            let videoSize = {
                width: 220,
                height: 150,
            }
            let videos = {
                "controls": PixiUtil.loadVideo(path+"controls.mp4", videoSize),
                "gameplay": PixiUtil.loadVideo(path+"gameplay.mp4", videoSize),
            }
            let slideDialog = SlideDialog.new({
                title: "Help",
                items: [
                    ui.build(_=> row(
                        videos.controls,
                        text(`
                            |Controls:
                            |Use the ⇦ , ⇨, ⇩, and ⇧ arrow keys 
                            |move the head or lead horizontally. 
                            |Alternatively, 
                            `),
                    )),
                    ui.build(_=> row(
                        videos.gameplay,
                        text(`
                            |Gameplay:
                            |Collect as much
                            |as item, the game ends
                            |when the head or lead
                            |comes in contact with the
                            |collectd items.
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

    newGame(self) {
        self.actions.start();
        M.createGrid(self);
        M.createAlgebra(self);
        M.listenKeys(self);
        M.randomize(self);
        M.randomInsert(self, 2);
        M.createPlayMenu(self);
        self.grow = 0;

        let {left, right, up, down} = self.keys;
        self.dir =
            Util.shuffle(["left", "right", "up", "down"])
                .map(k => Vec[k]({x: 0, y: 0}))[0];

        let fn = async () => {
            let dir = self.dir;
            if (right.isDown)
                dir = {x:  1, y:  0};
            if (left.isDown)
                dir = {x: -1, y:  0};
            if (up.isDown)
                dir = {x:  0, y: -1};
            if (down.isDown)
                dir = {x:  0, y:  1};

            if (dir && !Vec.new(dir).neg().equals(self.dir)) {
                self.dir = dir;
            }
            await M.move(self);
        }
        self.gameLoop = Util.loop(fn);
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

    createGrid(self) {
        let {gameStage} = self;
        let grid = Grid.new(self.gridArgs);
        grid.setInteractive();
        gameStage.add(grid);
        Layout.center({}, grid);
        self.grid = grid;
    },

    start(self) {
        self.gameStage.changeBackground(Backgrounds.fullpath("grassy_plains_by_theodenn.jpg"));
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
            self.grid.destroy({children: true});
        self.actions.stop();
        if (self.gameLoop) {
            self.gameLoop.stop();
            self.gameLoop = null;
        }
        if (self.table) {
            self.table.grid.destroy({children: true});
        }
    },

    createMainMenu(self) {
        let {gameStage} = self;
        let menu = gameStage.createMenu({
            title: "Snake",
            showBg: false,
            textStyle: {
                fill: 0xaaff22,
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
        if (self.gameLoop) self.gameLoop.start();
        M.listenKeys(self);
    },
    pause(self) {
        if (self.gameLoop) self.gameLoop.stop();
        M.unlistenKeys(self);
    },

    async buildMaze(self) {

    },

    randomize(self) {
        let sprites = [];
        let len = Util.randomInt(1,3);

        let {grid, algebra} = self;
        let n = Math.floor(grid.cols/2);
        let points = grid.getEmptyPoints()
        Util.shuffle(points);
        let pos = points[0];
        for (let i = 0; i < len; i++) {
            //let sprite = PixiUtil.roundedRect({
            //    color: 0x00d0dd,
            //    radius: 15,
            //    alpha: 0.8,
            //    width: grid.tileWidth,
            //    height: grid.tileHeight,
            //});
            let sprite;
            if (i == 0) {
                let [fn] = Util.randomSelect(self.charSprites);
                sprite = fn();
            } else {
                sprite = algebra.randomSprite();
                sprite.tint = 0x00ff00;
            }
            grid.setSprite({sprite, x: pos.x, y: pos.y});
            sprites.push(sprite);
        }
        self.sprites = sprites;
    },

    randomInsert(self, size=3) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 2048;
        let ps = [];
        let points = grid.getEmptyPoints();
        Util.shuffle(points);
        for (let n = 0; n < Math.min(points.length, size); n++) {
            let {x, y} = points[n];
            let sprite = algebra.randomSprite();
            grid.setSprite({x, y, sprite});
            ps.push(
                Anima.scale(sprite, { start: 0.8, seconds: 0.2})
            );
        }
        return Promise.all(ps);
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

    tintSprite(self, sprite) {
        if (sprite[TEAM] == TEAM1)
            sprite.tint = 0xee7777;
        else
            sprite.tint = 0x7777ee;
    },
}

M.new = Util.constructor(M);
module.exports = M;


