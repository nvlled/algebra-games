
let Actions = require("src/client/algebra/Actions");
let Anima = require("src/client/algebra/Anima");
let Waypoint = require("src/client/algebra/Waypoint");
let EasingFn = require("src/client/algebra/EasingFn");
let Util = require("src/client/algebra/Util");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Vec = require("src/client/algebra/Vec");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let Algebra = require("src/client/algebra/Algebra");
let Layout = require("src/client/algebra/Layout");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let RotatedArray = require("src/client/algebra/RotatedArray");
let PIXI = require("src/client/pixi");

let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("metile.png"),
    background: Backgrounds.fullpath("sunsetintheswamp.png"),
}

let algebra = Algebra.new({
    identity: 'e',
    table: [
        ["2", "2", "4"],
        ["4", "4", "8"],
        ["8", "8", "16"],
        ["16", "16", "32"],
        ["32", "32", "64"],
        ["64", "64", "128"],
        ["128", "128", "e"],
    ],
});

let M = {
    create({
        gameStage,
        resources,
        rows=4,
        cols=4,
        tileSize=80,
        tileSpace,
        x, y,
        speed=200,
        stretch=.7,
        onGameOver=()=>{},
    } = {}) {
        //gameStage.setBackground(images.background);

        let CharSprites = require("src/client/algebra/RpgSprites").new();
        let sprites = CharSprites.getConstructors(resources);
        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                Util.randomPair(algebra.elems, sprites),
                { equals: resources["equals"].texture,
                    [algebra.identity]:  resources["blob"].texture,
                }
            )
        });

        let tileMap = _ => PIXI.Texture.from(images.tile);

        let self = {
            gridArgs: {
                x, y, rows, cols,
                tileSize, tileSpace,
                tileMap, speed,
                stretch,
            },

            gameStage,
            resources,
            algebra: galge,
            keys: {
                left: Keyboard(37),
                up: Keyboard(38),
                right: Keyboard(39),
                down: Keyboard(40),
            },
            ticker: new PIXI.ticker.Ticker(),
            //actions: [],
            initialized: false,
            releasing: false,
            running: false,
            timerId: null,
            lastDir: {x: 0, y: 0},
            actions: Actions.new({throttle: 300, bufferSize: 1}),
        };

        return self;
    },

    init(self) {
        if (self.initialized)
            return;
    },

    createColorPanel(self) {
        let colors = [
            0xff0000,
            0x0000ff,
            0x00ff00,
            0x00ffff,
            0xffff00,
            0xffffff,
        ];
        let {gameStage} = self;
        let blocks = colors.map(color => {
            let b = PixiUtil.roundedRect({
                color,
                width: gameStage.world.width/20,
                height: gameStage.world.height/15,
            });
            b.interactive = true;
            b.buttonMode = true;
            return b;
        });
        let panel = Layout.col({
            marginX: -10,
            marginY: 10,
        }, ...blocks);
        Layout.leftOf({}, self.canvas, panel);
    },

    newGame(self) {
        M.setupCanvas(self);
        M.createColorPanel(self);
    },

    setupCanvas(self) {
        M.listenKeys(self);
        M.createPlayMenu(self);

        let {gameStage} = self;
        let g = PixiUtil.roundedRect({
            x: 0, y: 0,
            width: 600,
            height: 400,
            alpha: 0.95,
            color: 0xdddddd,
        })
        let canvas = PixiUtil.roundedRect({
            x: 0, y: 0,
            width: g.width,
            height: g.height,
        })
        //canvas.interactive = true;
        g.interactive = true;

        let down = false;

        let size = 30;
        let color = 0x509990;
        let alpha = 0.05;

        let lastpos;
        let toLocalPos = pos => {
            let bpos = g.getGlobalPosition();
            return {
                x: pos.x-bpos.x,
                y: pos.y-bpos.y,
            }
        }

        let drawRect = pos => {
            g.beginFill(color, alpha);
            g.drawRect(pos.x-size/2, pos.y-size/2, size, size);
            g.endFill();
        }
        let drawCircle = pos => {
            g.beginFill(color, alpha);
            g.drawCircle(pos.x, pos.y, size/2);
            g.endFill();
        }
        let drawTriangle = pos => {
            g.lineStyle(1, color, 1);
            g.beginFill(color, alpha);
            let ps = [
                Vec.new(pos).add({x: 0, y: -size}),
                Vec.new(pos).add({x: size, y: 0}),
                Vec.new(pos).add({x: -size, y: 0}),
            ]
            g.moveTo(ps[0].x, ps[0].y);
            g.lineTo(ps[1].x, ps[1].y);
            g.lineTo(ps[2].x, ps[2].y);
            g.lineTo(ps[0].x, ps[0].y);
            g.endFill();
        }
        let draw = drawTriangle;

        g.pointerdown = (e) => {
            down = true;
            let pos = toLocalPos(e.data.global);
            draw(pos);
            lastpos = pos;
        }
        g.pointermove = (e) => {
            if (!down)
                return;
            let pos = toLocalPos(e.data.global);
            draw(pos);
            lastpos = pos;
        }
        g.pointerup = (e) => {
            down = false;
        }
        g.pointerupoutside = (e) => {
            down = false;
        }
        g.mask = canvas;

        gameStage.add(g);
        gameStage.add(canvas);
        Layout.center({}, canvas);
        Layout.center({}, g);

        //let grid = self.grid = Grid.new(self.gridArgs);
        //gameStage.add(grid);
        //Layout.centerOf({}, gameStage.world, grid);
        //grid.clearSprites();

        self.canvas = g;
    },

    start(self) {
        M.init(self);
        M.newGame(self);
        //M.createMainMenu(self);
    },

    createMainMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "Drawing",
            showBg: false,
            textStyle: {
                fill: 0x9a8028,
                fontSize: 110,
            },
        }, {
            "New Canvas": ()=>{
                gameStage.showMenuBar();
                M.newGame(self);
            },
            "Browse Submission": ()=>{
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
        if (self.grid)
            self.grid.destroy(false);
        M.unlistenKeys(self);
        self.actions.stop();
    },

    resume(self) {
        M.listenKeys(self);
    },
    pause(self) {
        M.unlistenKeys(self);
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


