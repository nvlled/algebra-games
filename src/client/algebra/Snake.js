
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
let Keyboard = require("src/client/algebra/Keyboard");
let EasingFn = require("src/client/algebra/EasingFn");
let Button = require("src/client/algebra/Button");
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
        rows=9,
        cols=9,
        tileSize=40,
        tileSpace,
        x, y,
        seconds=0.3,
        stretch=.9,
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
        let CharSprites = require("src/client/algebra/RpgSprites").new();
        let sprites = CharSprites.getConstructors(resources);

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

            let head = grid.spriteAt(poss[0]);
            let sprite = grid.spriteAt(newpos);

            if (sprite && self.sprites.indexOf(sprite) < 0) {
                console.log(algebra.getElem(head), algebra.getElem(sprite));
                let sprite_ = algebra.applySprites(head, sprite);
                if (sprite_) {
                    let p = grid.spritePos(head);
                    Anima.fade(sprite, {end: 0});
                    Anima.move(sprite, {end: head});
                    Anima.fade(head, {end: 0});
                    grid.setSprite({sprite: sprite_, x: p.x, y: p.y});
                    self.gameStage.watch(sprite_, 0.3);
                    await Anima.fade(sprite_, {start: 0, end: 1});
                    self.sprites[0] = sprite_;
                } else {
                    self.sprites.unshift(sprite);
                    poss = self.sprites.map(s => grid.spritePos(s));
                    newpos = Vec.new(poss[0]).add(dir);
                    await self.gameStage.watch(sprite, 0.3);
                }
            }


            if (grid.gameArray.outbounds(newpos)) {
                let sprite = grid.spriteAt(poss[0]);
                newpos = grid.wrapPos(newpos);
            }
            poss.unshift(newpos);
            poss.pop();

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
                })
            });
            await Promise.all(ps);

            return Promise.resolve();
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
        M.randomInsert(self, 10);
        M.createPlayMenu(self);

        self.gameStage.addUI(self.table.grid);
        Layout.belowOf(
            {inside: true, align: "right"}, 
            self.gameStage.ui, self.table.grid
        );

        let {left, right, up, down} = self.keys;
        let fn = async () => {
            let dir;
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
        self.gameStage.changeBackground(Backgrounds.randomName());
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
        gameStage.createMenu({
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
        let len = Util.randomInt(5,10);

        let {grid, algebra} = self;
        let x = 0;
        for (let i = 0; i < len; i++) {
            let sprite = algebra.randomSprite();
            if (sprite.stopIdling)
                sprite.stopIdling();
            grid.setSprite({sprite, x, y: 0});
            sprites.push(sprite);
        }
        self.gameStage.watch(sprites[0]);
        self.sprites = sprites;
    },

    randomInsert(self, n=3) {
        let {algebra, grid} = self;
        let points = grid.getEmptyPoints();
        if (points.length < n)
            return;

        let exclude = new Set();
        for (let i = 0; i < n; i++) {
            let [p] = Util.randomSelect(points, exclude);
            exclude.add(p);
            let sprite = algebra.randomSprite();
            let {x, y} = p;
            grid.setSprite({sprite, x,y});
            console.log(algebra.getElem(sprite), x, y);
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

    tintSprite(self, sprite) {
        if (sprite[TEAM] == TEAM1)
            sprite.tint = 0xee7777;
        else
            sprite.tint = 0x7777ee;
    },
}

M.new = Util.constructor(M);
module.exports = M;



