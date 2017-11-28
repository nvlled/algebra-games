
let PIXI = require("src/client/pixi");
require("src/client/pixi-particles");

let Actions = require("src/client/algebra/Actions");
let Algebra = require("src/client/algebra/Algebra");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let Anima = require("src/client/algebra/Anima");
let Waypoint = require("src/client/algebra/Waypoint");
let Util = require("src/client/algebra/Util");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Vec = require("src/client/algebra/Vec");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let EasingFn = require("src/client/algebra/EasingFn");
let Button = require("src/client/algebra/Button");
let Layout = require("src/client/algebra/Layout");
let Rsrc = require("src/client/algebra/Rsrc");
let Menu = require("src/client/algebra/Menu");
let Backgrounds = require("src/client/algebra/Backgrounds");

let images = {
    background: Backgrounds.fullpath("starfield2.jpg"),
}

let GridTiles = require("src/client/algebra/GridTiles");
// TODO: Smoother character movement

let btn = Button.new({
    text: "testing\nblah",
    fontSize: 36,
});

let M = {
    create({
        gameStage,
        resources,
        algebra,
        rows=21,
        cols=21,
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
        grid.visible = false;
        
        let self = {
            gameStage,
            resources,
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

    pause(self) {
        console.log("pausing");
    },

    async resume(self) {
        window.location.hash = "";
        let {gameStage} = self;
        await gameStage.hideMenu({showMenuBar: false});
        M.createMenu(self);
        self.menu.visible = true;
        //gameStage.fadeInBackground(0.5, Backgrounds.randomName());
        gameStage.setMenu(self.menu, () => {
            return Anima.fade(self.menu, {end: 1, start: 0});
        });
        gameStage.hideMenuBar();
        gameStage.changeBackground(images.background);
    },

    start(self) {
        M.createMenu(self);
        let {gameStage,resources} = self;
        gameStage.fadeInBackground(0.5, images.background);
        let name = window.location.hash.slice(1);
        if (name && name != "MainMenu") {
            let Module = require("src/client/algebra/"+name);
            gameStage.startModule(Module);
        } else {
            self.menu.visible = true;
            gameStage.setMenu(self.menu);
        }
    },

    createMenu(self) {
        let {gameStage,resources} = self;
        let mainMenu, buttons
        let gameSelected = false;

        let handler = text => {
            if (gameSelected)
                return;

            window.location.hash = text;
            gameSelected = true;
            gameStage.fadeOutBackground();
            buttons.forEach(async (s, i) => {
                if (s.text != text) {
                    setTimeout(async () => {
                        await Anima.fadeLift(s);
                        s.visible = false;
                    }, i*30);

                    return;
                }

                Layout.centerOf(
                    {animate: true}, 
                    mainMenu,
                    s
                );
                await Anima.scaleBy(s, {end: 0.5, seconds: 1.0});
                await Anima.moveBy(s, 
                    {
                        end: {y: 1000}, 
                        seconds: 0.3,
                    });

                let Module = require("src/client/algebra/"+text);
                gameStage.startModule(Module);
            });
        }

        let newBtn = text => Button.new({
            text, 
            fontSize: 30,
            pointerdown: handler,
        });

        buttons = [
            newBtn("Drop"),
            newBtn("Ten24"),
            newBtn("Sudoku"),
            newBtn("PairSwap"),
            newBtn("Memrise"),
            newBtn("Snake"),
            newBtn("Slider"),
            newBtn("LightsOut"),
            newBtn("Sokoban"),
        ];

        mainMenu = Layout.table(
            {
                cols: 3, 
                margin: 20, 
                height: 100
            }, 
            ...buttons
        );
        gameStage.addUI(mainMenu);
        Layout.centerOf({}, gameStage.ui, mainMenu);
        mainMenu.visible = false;
        self.menu = mainMenu;
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
        for (let [_, key] of Object.entries(self.keys)) {
            key.unlisten();
        }
    },

    tintSprite(self, sprite) {
        if (sprite[TEAM] == TEAM1)
            sprite.tint = 0xee7777;
        else
            sprite.tint = 0x7777ee;
    },


    testParticles(self) {
        let container = new PIXI.Container();
        var emitter = new PIXI.particles.Emitter(

            // The PIXI.Container to put the emitter in
            // if using blend modes, it's important to put this
            // on top of a bitmap, and not use the root stage Container
            container,

            // The collection of particle images to use
            [PIXI.Texture.fromImage('fireball')],

            // Emitter configuration, edit this to change the look
            // of the emitter

            {
                "alpha": {
                    "start": 0.74,
                    "end": 0.85
                },
                "scale": {
                    "start": 1,
                    "end": 0.51,
                    "minimumScaleMultiplier": 1.04
                },
                "color": {
                    "start": "#e34932",
                    "end": "#d1d11b"
                },
                "speed": {
                    "start": 55,
                    "end": 50,
                    "minimumSpeedMultiplier": 1
                },
                "acceleration": {
                    "x": 1,
                    "y": 0
                },
                "maxSpeed": 0,
                "startRotation": {
                    "min": 0,
                    "max": 333
                },
                "noRotation": false,
                "rotationSpeed": {
                    "min": 0,
                    "max": 0
                },
                "lifetime": {
                    "min": 1,
                    "max": 0.8
                },
                "blendMode": "screen",
                "frequency": 0.001,
                "emitterLifetime": -1,
                "maxParticles": 500,
                "pos": {
                    "x": 0,
                    "y": 0
                },
                "addAtBack": false,
                "spawnType": "circle",
                "spawnCircle": {
                    "x": 0,
                    "y": 0,
                    "r": 0
                }
            }

        );

        self.gameStage.addUI(container);
        Layout.centerOf({}, self.gameStage.world, container);

        let t = new PIXI.ticker.Ticker();
        t.add(d => {
            emitter.update(t.elapsedMS/1000)
        });

        t.start();
        //// Calculate the current time
        //var elapsed = Date.now();

        //// Update function every frame
        //var update = function(){

        //    // Update the next frame
        //    requestAnimationFrame(update);

        //    var now = Date.now();

        //    // The emitter requires the elapsed
        //    // number of seconds since the last update
        //    emitter.update((now - elapsed) * 0.001);
        //    elapsed = now;

        //    // Should re-render the PIXI Stage
        //    // renderer.render(stage);
        //};

        // Start emitting
        emitter.emit = true;
    },
}

M.new = Util.constructor(M);
module.exports = M;






