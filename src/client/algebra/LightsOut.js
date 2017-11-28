
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
let PixiUtil = require("src/client/algebra/PixiUtil");

let CoinSprites = require("src/client/algebra/CoinSprites");
let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("ground_05.png"),
    background: Backgrounds.dir+"/dark background.png",
}

let algebra = Algebra.new({
    identity: 'e',
    table: [
        ["a", "b", "a"],
        ["b", "b", "a"],
    ],
});

let levels = [
    [   0, 0, 0, 0, 1,
        0, 0, 0, 1, 1,
        0, 0, 0, 0, 1,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, ],

    [   0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        1, 0, 0, 0, 1,
        1, 1, 0, 1, 1, ],

    [   1, 1, 0, 1, 1,
        0, 1, 1, 1, 0,
        0, 1, 1, 1, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 0, 0, ],

    [   0, 1, 0, 0, 0,
        1, 1, 0, 0, 0,
        0, 1, 1, 1, 0,
        1, 1, 0, 0, 0,
        0, 1, 0, 0, 0, ],
    
    [   1, 0, 0, 0, 1,
        0, 1, 0, 1, 0,
        0, 1, 0, 1, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, ],

    [   1, 1, 1, 0, 0,
        1, 1, 1, 0, 0,
        1, 0, 1, 1, 0,
        1, 1, 1, 0, 0,
        1, 1, 1, 0, 0, ],

    [   1, 1, 0, 0, 0,
        0, 0, 1, 1, 0,
        0, 0, 1, 0, 0,
        0, 1, 0, 1, 0,
        1, 1, 0, 1, 1, ],

    [   1, 0, 0, 0, 1,
        1, 0, 0, 0, 1,
        0, 1, 1, 1, 0,
        0, 0, 1, 0, 0,
        0, 0, 1, 0, 0, ],

    [   1, 0, 0, 1, 1,
        0, 1, 1, 1, 1,
        0, 0, 0, 0, 1,
        0, 0, 1, 1, 0,
        0, 1, 0, 0, 1, ],

    [   0, 0, 0, 0, 0,
        0, 1, 1, 1, 0,
        0, 0, 1, 0, 0,
        1, 0, 1, 0, 1,
        1, 0, 0, 0, 1, ],
];

let M = {
    create({
        gameStage,
        resources,
        rows=5,
        cols=5,
        tileSize=90,
        tileSpace=8,
        alpha=0.1,
        x, y,
        speed=200,
        stretch=.9,

        onGameOver=()=>{},
    } = {}) {
        gameStage.setBackground(images.background);

        //let CoinSprites = require("src/client/algebra/CoinSprites").new();
        //let ctors = CoinSprites.getConstructors(resources);

        let Rsrc = require("src/client/algebra/Rsrc");
        let sprites = Rsrc.konett();
        Util.shuffle(sprites);

        console.log(algebra.elems);
        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                {},
                Util.joinKeyval(algebra.elems, sprites),
                //{
                //    a: sprites[2],
                //    b: sprites[1],
                //    c: sprites[0],
                //    equals: resources["equals"].texture,
                //    [algebra.identity]:  resources["blob"].texture,
                //}
            )
        });

        let tileMap = _ => PIXI.Texture.from(images.tile);

        let self = {
            gameStage,
            resources,
            gridArgs: {
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                speed, stretch, interactive: true,
                wrapDrag: true,
                alpha,
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
            currentLevel: 0,
        };

        return self;
    },

    init(self) {
        if (self.initialized)
            return;
        self.initialized = true;
    },

    handleInput(self) {
        self.grid.onTileClick = async function(pos) {
            await M.toggleAt(self, pos);
            if (M.isComplete(self)) {
                console.log("complete");
                M.startNoise(self);
                self.grid.toggleInteractive(false);
                M.createWinGame(self);
            }
        }
    },

    isComplete(self) {
        let {grid} = self;
        let {gameArray} = grid;
        let {cols, rows} = grid;
        for (let i = 0; i < cols*rows; i++) {
            let s = grid.gameArray.data[i];
            if (s.visible)
                return false;
        }
        return true;
    },

    fillEmptyFiles(self) {
        let {grid, algebra} = self;
        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.cols; x++) {
                if (!grid.isOccupied({x, y})) {
                    //let s = algebra.randomSprite();
                    let s = PixiUtil.roundedRect({
                        color: Math.random() < 0.5 ? 0xff0000 : 0x0000ff,
                        width: tileSize,
                        height: height,
                    });
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

    newGame(self, level=0) {
        self.grid.toggleInteractive(true);
        self.grid.visible = true;
        M.selectLevel(self, level);

        M.createPlayMenu(self);
        self.gameStage.showMenuBar();
        self.actions.start();
        M.createPlayMenu(self);
    },

    initGrid(self) {
        let {algebra, grid} = self;
        let {rows, cols} = grid;
        for (let n = 0; n < rows*cols; n++) {
            let sprite = PixiUtil.roundedRect({
                color: 0x0000ff,
                width: grid.tileWidth,
                height: grid.tileHeight,
                renderer: self.gameStage.view,
                alpha: 0.8,
            });
            let {x, y} = grid.toXY(n);
            sprite.filters = [new PIXI.filters.BlurFilter(3)];
            grid.setSprite({x, y, sprite});
        }
    },

    selectLevel(self, level) {
        let {algebra, grid} = self;
        let {rows, cols} = grid;
        let data = levels[level];
        for (let n = 0; n < rows*cols; n++) {
            let sprite = grid.spriteOn(n);
            let {x, y} = grid.spritePos(sprite);
            if (data[n] == 0)
                sprite.visible = false;
            else
                sprite.visible = true;
            sprite.alpha = 1;
        }
        self.currentLevel = level;
    },

    createLevelMenu(self) {
        let {gameStage,resources} = self;
        let mainMenu, buttons, caption, backBtn
        let gameSelected = false;

        let hide = async _=> {
            await Anima.fade(mainMenu, {end: 0});
            mainMenu.destroy();
            caption.destroy();
            backBtn.destroy();
        }
        let handler = async (text, btn) => {
            if (gameSelected)
                return;
            hide();
            M.newGame(self, btn.level);
        }

        let newBtn = text => Button.new({
            text, 
            fontSize: 40,
            pointerdown: handler,
            bgStyle: {
                normal: 0x662200,
            }
        });

        buttons = [];
        for (var i = 0; i < levels.length; i++) {
            let btn = newBtn((i+1)+"");
            btn.level = i;
            buttons.push(btn);
        }

        mainMenu = Layout.table(
            {
                cols: 5, 
                margin: 20, 
            }, 
            ...buttons
        );
        backBtn = Button.create({
            text: "back",
            fontSize: 25,
            bgStyle: {
                normal: 0x333333,
            },
            pointerdown: () => {
                hide();
                M.createMainMenu(self);
            },
        });
        caption = new PIXI.Text("Select level", {
            fill: 0xdddddd,
            fontSize: 20,
        });

        gameStage.addUI(mainMenu);
        Layout.centerOf({}, gameStage.ui, mainMenu);
        Layout.aboveOf({}, mainMenu, caption);
        Layout.belowOf({align: "right"}, mainMenu, backBtn);

        mainMenu.visible = false;
        self.menu = mainMenu;
        self.menu.visible = true;
        gameStage.hideMenu();
        gameStage.hideMenuBar();
    },

    start(self) {
        M.init(self);
        M.createMainMenu(self);

        let grid = self.grid = Grid.new(self.gridArgs);
        let {rows, cols} = self.grid;
        let {gameStage} = self;
        grid.setInteractive();
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);
        self.noiseFilter = new PIXI.filters.NoiseFilter(0.1);
        grid.filters = [self.noiseFilter];
        M.handleInput(self);
        M.initGrid(self);

        grid.visible = false;
        grid.toggleInteractive(false);
    },

    stop(self) {
        M.unlistenKeys(self);
        if (self.grid)
            self.grid.destroy({children: true});
        self.actions.stop();
        M.stopNoise(self);
    },

    createMainMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "Lights Out",
            showBg: false,
            textStyle: {
                fill: 0x3353dd,
                fontSize: 90,
            },
        }, {
            "New Game": ()=>{
                gameStage.showMenuBar();
                M.createLevelMenu(self);
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

    createWinGame(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "level complete",
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
            "next ": async ()=>{
                self.gameStage.hideMenu();
                await M.stopNoise(self);
                M.newGame(self, self.currentLevel+1);
            },
            "back to main": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    startNoise(self) {
        self.noiseTimer = setInterval(function() {
            let i = Util.randomIndex(self.grid.gameArray.data);
            let {x, y} = self.grid.toXY(i);
            self.noisePs = M.toggleAt(self, {x, y});
            self.noiseFilter.seed = Math.random();
        }, 300);
    },

    async stopNoise(self) {
        clearInterval(self.noiseTimer);
        await self.noisePs;
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

    randomize(self, count) {
        let {algebra, grid} = self;
        let filled = {};
        for (let n = 0; n < count; n++) {
            let elem = algebra.randomElement(false);

            let sprite = PixiUtil.roundedRect({
                color: 0x0000ff,
                width: grid.tileWidth,
                height: grid.tileHeight,
                renderer: self.gameStage.view,
                alpha: 0.8,
            });
            let {x, y} = grid.toXY(n);
            sprite.filters = [new PIXI.filters.BlurFilter(3)];
            grid.setSprite({x, y, sprite});
        }
    },

    async toggleAt(self, {x, y}, on) {
        let ps = 
            [ Vec.left, Vec.right, Vec.down, Vec.up, o=>o]
            .map(f => {
                let p = f({x, y});
                return M.lightAt(self, p);
            });
        return Promise.all(ps);
    },

    async lightAt(self, {x, y}, on) {
        let {grid} = self;
        let s = grid.spriteAt({x, y});
        if (!s)
            return;
        if (on == null) {
            on = !s.visible;
        }

        if (on) {
            s.visible = true;
            await Anima.fade(s, {start: 0, end: 1, seconds: 0.5});
        } else {
            s.visible = true;
            await Anima.fade(s, {end: 0, seconds: 0.5});
            s.visible = false;
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

