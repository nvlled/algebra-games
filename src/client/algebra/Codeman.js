
let Actions = require("src/client/algebra/Actions");
let Algebra = require("src/client/algebra/Algebra");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let Anima = require("src/client/algebra/Anima");
let Waypoint = require("src/client/algebra/Waypoint");
let Util = require("src/client/algebra/Util");
let Vec = require("src/client/algebra/Vec");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let EasingFn = require("src/client/algebra/EasingFn");
let Button = require("src/client/algebra/Button");
let PIXI = require("src/client/pixi");

let GridTiles = require("src/client/algebra/GridTiles");
// TODO: Smoother character movement

let M = {
    create({
        gameStage,
        algebra,
        rows=40,
        cols=40,
        tileSize,
        tileSpace,
        //tileMap,
        x, y,
        speed=200,
        stretch=.8,
        //interactive,
        alpha,

        onGameOver=()=>{},
    } = {}) {
        let {randomTexture} = GridTiles;
        let tile1 = randomTexture(PIXI.loader.resources);

        let tileMap = (x, y) => {
            return tile1;
        }
        let grid = Grid.new({
            x, y, rows, cols, tileSize, tileSpace, tileMap,
            speed, stretch, interactive: true, alpha,
        });
        grid.setInteractive();
        
        let self = {
            gameStage,
            actions: Actions.new({throttle: 20, bufferSize: 1}),
            grid,
            algebra,
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
            fixed: {},
        };

        return self;
    },

    async init(self) {
        if (self.initialized)
            return;
        self.initialized = true;
    },

    move(self, dir) {
        let sprite = self.sprite;
        if (!sprite)
            return;
        let pos = self.grid.spritePos(sprite);
        let dest = Vec.new(pos).add(dir);
        sprite.setState(Util.stateName(dir));
        return self.actions.add(_ => self.grid.move({
            sprite,
            dest,
            apply: true,
        }));
    },

    moveLeft(self) { return M.move(self, {x: -1, y: 0}); },
    moveRight(self) { return M.move(self, {x:  1, y: 0}); },
    moveUp(self) { return M.move(self, {x: 0, y: -1}); },
    moveDown(self) { return M.move(self, {x: 0, y: 1}); },

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
    },

    start(self) {
        self.actions.start();
        self.gameStage.start();
        M.listenKeys(self);
        M.buildMaze(self);
        //M.randomize(self);

        let ticker = PIXI.ticker.shared;
        let {left, right, up, down} = self.keys;
        let fn = () => {
            if (right.isDown)
                M.moveRight(self);
            if (left.isDown)
                M.moveLeft(self);
            if (up.isDown)
                M.moveUp(self);
            if (down.isDown)
                M.moveDown(self);
        }
        ticker.add(fn);
    },

    randomTable(self) {
        let table = [];
        let {team1Elems, team2Elems} = self;
        let set1 = new Set(team1Elems);
        let set2 = new Set(team2Elems);
        let rand1 = _=> Util.randomSelect(team1Elems, set2)[0];
        let rand2 = _=> Util.randomSelect(team2Elems, set1)[0];
        for (let e of self.team1Elems) {
            for (let e of self.team1Elems) {
                table.push([e, rand2(), rand1()]);
            }
        }
        for (let e of self.team2Elems) {
            table.push([e, rand1(), rand2()]);
        }
        
        return table;
    },

    stop(self) {
        M.unlistenKeys(self);
        self.actions.stop();
    },

    async buildMaze(self) {
        let {grid} = self;
        let {gameArray} = grid;

        grid.fillArray(_=> self.algebra.randomSprite(false));

        await gameArray.generateMaze({
            viewerFn: async pos => {
                let sprite = grid.spriteAt(pos);
                //await Anima.boom(sprite);
                sprite.destroy();
                //await Util.sleep(10);
            },
        });
        M.randomize(self);
    },

    randomize(self) {
        let {grid, algebra} = self;
        let sprite = algebra.randomSprite();
        if (sprite.stopIdling)
            sprite.stopIdling();
        grid.setSprite({sprite, x: 0, y: 0});
        self.gameStage.watch(sprite);
        self.sprite = sprite;
    },

    listenKeys(self) {
        for (let key of Object.values(self.keys)) {
            key.listen();
        }
    },

    unlistenKeys(self) {
        for (let key of self.keys) {
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



