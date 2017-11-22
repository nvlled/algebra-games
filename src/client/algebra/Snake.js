
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

// ___*____________________
// ___**___________________
// ____**__________________
// ________________________
// ________________________
// ________________________

let M = {
    create({
        gameStage,
        rows=11,
        cols=11,
        tileSize,
        tileSpace,
        x, y,
        speed=300,
        stretch=.8,
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

        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                Util.randomPair(algebra.elems, sprites),
                { equals: resources["equals"].texture,
                    [algebra.identity]:  resources["blob"].texture,
                }
            )
        });
        
        let self = {
            gameStage,
            actions: Actions.new({throttle: 50, bufferSize: 1}),
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
            fixed: {},
            dir: {x: 0, y: 0},

            sprites: [],
        };

        return self;
    },

    async init(self) {
        if (self.initialized)
            return;
        self.initialized = true;
    },

    move(self) {
        let {grid, dir} = self;
        return self.actions.add(_ => {
            let poss = self.sprites.map(s => grid.spritePos(s));
            let newpos = Vec.new(poss[0]).add(dir);
            if (grid.gameArray.outbounds(newpos))
                return Promise.resolve();
            poss.unshift(newpos);
            poss.pop();

            let ps = self.sprites.map((sprite, i) => {
                let src = grid.spritePos(sprite);
                let dest = poss[i];
                let dir = Vec.new(dest).sub(src).norm();
                if (sprite.setState)
                    sprite.setState(Util.stateName(dir));
                return self.grid.move({
                    sprite,
                    dest,
                    force: true,
                    apply: true,
                })
            });
            return Promise.all(ps);
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
    },

    start(self) {
        self.actions.start();
        self.gameStage.start();
        M.listenKeys(self);
        M.randomize(self);

        let ticker = PIXI.ticker.shared;
        let {left, right, up, down} = self.keys;
        let fn = () => {
            if (right.isDown)
                self.dir = {x:  1, y:  0};
            if (left.isDown)
                self.dir = {x: -1, y:  0};
            if (up.isDown)
                self.dir = {x:  0, y: -1};
            if (down.isDown)
                self.dir = {x:  0, y:  1};

            M.move(self);
        }
        ticker.add(fn);
    },

    stop(self) {
        M.unlistenKeys(self);
        self.actions.stop();
    },

    async buildMaze(self) {

    },

    randomize(self) {
        let sprites = [];
        let len = Util.randomInt(10,20);

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



