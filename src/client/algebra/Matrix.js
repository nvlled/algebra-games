
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
        //rows=11,
        //cols=11,
        tileSize=80,
        tileSpace=5,
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

        let f = v => {
            return {rows: v[0], cols: v[1]};
        };
        let o = _=> Util.randomInt(2, 3);
        let O=o();
        let size1 = f([o(),O]);
        let size2 = f([O,o()]);
        console.log(o(), o(), o());

        let space = 20;
        //[x, y] = [200, 200];
        let matrix1 = Grid.new({
            x: 0, y: 0, rows: size1.rows, cols: size1.cols, tileSize, tileSpace, tileMap,
            speed, stretch, interactive: true, alpha,
        });
        let matrix2 = Grid.new({
            x: 0, y: 0, rows: size2.rows, cols: size2.cols, tileSize, tileSpace, tileMap,
            speed, stretch, interactive: true, alpha,
        });
        let matrix3 = Grid.new({
            x: 0, y: 0, rows: size1.rows, cols: size2.cols, tileSize, tileSpace, tileMap,
            speed, stretch, interactive: true, alpha,
        });
        let view = gameStage.view;
        let width = matrix1.width + space + matrix2.width;
        let height = matrix1.height + space + matrix2.height;
        [x, y] = [
            view.width/2 - matrix1.width/2 - matrix2.width/2, 
            view.height/2 + matrix2.height/2 - matrix1.height/3];

        matrix1.position = {x, y};
        matrix2.position = {x: x+space+matrix1.width, y: y-space-matrix2.height};
        matrix3.position = {x: x+space+matrix1.width, y: y};

        gameStage.add(matrix1);
        gameStage.add(matrix2);
        gameStage.add(matrix3);
        
        let self = {
            gameStage,
            actions: Actions.new({throttle: 20, bufferSize: 1}),
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
    },

    newGame(self) {
    },

    start(self) {
        self.actions.start();
        self.gameStage.start();
        M.listenKeys(self);

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

    stop(self) {
        M.unlistenKeys(self);
        self.actions.stop();
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
}

M.new = Util.constructor(M);
module.exports = M;



