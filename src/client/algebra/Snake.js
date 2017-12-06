
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
let Layout = require("src/client/algebra/Layout");
let PIXI = require("src/client/pixi");

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
        rows=10,
        cols=10,
        tileSize=30,
        tileSpace=1,
        x, y,
        seconds=0.4,
        stretch=.90,
        alpha=0.9,

        onGameOver=()=>{},
    } = {}) {
        let {randomTexture} = GridTiles;
        let tile1 = randomTexture(PIXI.loader.resources);

        let tileMap = (x, y) => {
            return tile1;
        }
        let self = {
            gridArgs: {
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                seconds, stretch, interactive: true, alpha,
            },
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

            if (sprite && self.sprites.indexOf(sprite) >= 0) {
                console.log("game over");
                self.actions.stop();
                self.gameLoop.stop();
                self.sprites.forEach(async s => {
                    await Util.sleep(Util.randomInt(100, 300));
                    Anima.fadeAway(s);
                });
                M.createGameOverMenu(self);
                return;
            }

            if (sprite && self.sprites.indexOf(sprite) < 0) {
                self.grow++;
                Anima.fadeAway(sprite);

                M.randomInsert(self, Util.randomInt(1,2));
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
            if (self.grow > 0) {
                self.grow--;
                let sprite = PixiUtil.roundedRect({
                    color: 0x00d0dd,
                    alpha: 0.8,
                    radius: 15,
                    width: grid.tileWidth,
                    height: grid.tileHeight,
                });
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

    newGame(self) {
        self.actions.start();
        M.createGrid(self);
        M.createAlgebra(self);
        M.listenKeys(self);
        M.randomize(self);
        M.randomInsert(self, 2);
        M.createPlayMenu(self);
        self.grow = 0;

        //self.gameStage.addUI(self.table.grid);
        //Layout.belowOf(
        //    {inside: true, align: "right"},
        //    self.gameStage.ui, self.table.grid
        //);

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
        //ticker.add(fn);
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
            "Help/Instructions": ()=>{
                Anima.slideOut(menu, {fade: 1});
                SlideContent.dialog({
                    title: "Help",
                    content: [
                        "Controls:",
                        " Use the arrow keys to control the snake.",
                        "",
                        "Gameplay:",
                        " ... Just move around and eat stuff without point.",
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
        let len = Util.randomInt(5,8);

        let {grid, algebra} = self;
        let n = Math.floor(grid.cols/2);
        let points = grid.getEmptyPoints()
        Util.shuffle(points);
        let pos = points[0];
        for (let i = 0; i < len; i++) {
            let sprite = PixiUtil.roundedRect({
                color: 0x00d0dd,
                radius: 15,
                alpha: 0.8,
                width: grid.tileWidth,
                height: grid.tileHeight,
            });
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
            console.log(x, y);
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



