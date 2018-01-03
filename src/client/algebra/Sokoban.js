
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
let Rsrc = require("src/client/algebra/Rsrc");
let AniSprite = require("src/client/algebra/AniSprite");
let SlideContent = require("src/client/algebra/SlideContent");
let SetUtil = require("src/client/algebra/SetUtil");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Table  = require("src/client/algebra/Table");
let UI  = require("src/client/algebra/UI");
let SlideDialog  = require("src/client/algebra/SlideDialog");

let CoinSprites = require("src/client/algebra/CoinSprites");
let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let DIR = Symbol();
let MOVS = Symbol();
let PLAYER = Symbol();
let DESTS = Symbol();
let MOVEABLE = Symbol();

let images = {
    tile: GridTiles.get("metile.png"),
    background: Backgrounds.dir+"/dark background.png",
}

let algebra = Algebra.new({
    identity: 'e',
    table: [
        ["a", "b", "a"],
        ["b", "b", "a"],
    ],
});

let charTextures = Rsrc.sharm.characters();
let sharmTiles = Rsrc.sharm.tiles();
let floorTile = sharmTiles.get(10);

let createSprite = {
    ["X"]: function() {
        return sharmTiles.createSprite(0);
    },
    ["*"]: function() {
        return sharmTiles.createSpriteXY(3,3);
    },
    ["."]: function() {
        return sharmTiles.createSpriteXY(3,2);
    },
    ["@"]: function() {
        return AniSprite.new(Object.assign({
            textureSet: charTextures,
            states: {
                idle: [4],
                left: [15, 16, 17],
                down: [3, 4, 5],
                right: [27, 28, 29],
                up: [39, 40, 41],
            },
            animationSpeed: 0.1
        }));
    },
}

let createGrid = (mapStr, gridArgs) => {
    let lines = []
    let cols = 0;
    for (let line of mapStr.split("\n")) {
        line = line.trimRight();
        if (line.trim().length == 0)
            continue;
        lines.push(line);
        cols = Math.max(line.length, cols);
    }
    let rows = lines.length;
    gridArgs.cols = cols;
    gridArgs.rows = rows;
    let grid = Grid.new(gridArgs);
    let moveables = [];
    let destinations = [];
    for (let y = 0; y < rows; y++) {
        let line = lines[y];
        for (let x = 0; x < line.length; x++) {
            let c = line[x];
            let fn = createSprite[c];
            if (!fn)
                continue;
            let sprite = fn();
            grid.setSprite({sprite, x, y});

            if (c == "@") {
                grid[PLAYER] = sprite;
            } else if (c == ".") {
                grid.removeSprite(sprite);
                destinations.push(grid.indexOf({x, y}));
            } else if (c == "*") {
                sprite[MOVEABLE] = true;
                moveables.push(sprite);
            }
        }
    }
    if (grid[PLAYER]) {
        let sprite =  grid[PLAYER];
        grid.setChildIndex(sprite, grid.children.length-1);
        sprite[DIR] = {x: 0, y: 1};;

    }
    for (let s of moveables)
        grid.setChildIndex(s, grid.children.length-1);

    grid[DESTS] = new Set(destinations);
    grid[MOVS] = moveables;

    return grid;
}

let levels = [
    `
XXXXXXXXXXXX
X          X
X @ *      X
X     .    X
X          X
XXXXXXXXXXXX
    `,
    `
XXXXXXXXX
XXX    XX
XXX XX*XX
X @ *  XX
XXX XX.XX
XXXXXX.XX
XXXXXXXXX
    `,

    `
    XXXXX
    X   X
    X*  X
  XXX  *XXX
  X  *  * X
XXX X XXX X     XXXXXX
X   X XXX XXXXXXX  ..X
X *  *             ..X
XXXXX XXXX X@XXXX  ..X
    X      XXX  XXXXXX
    XXXXXXXX
    `,

    `
XXXXXXXXXXXX
X..  X     XXX
X..  X *  *  X
X..  X*XXXX  X
X..    @ XX  X
X..  X X  * XX
XXXXXX XX* * X
  X *  * * * X
  X    X     X
  XXXXXXXXXXXX
    `,

    `
        XXXXXXXX
        X     @X
        X *X* XX
        X *  *X
        XX* * X
XXXXXXXXX * X XXX
X....  XX *  *  X
XX...    *  *   X
X....  XXXXXXXXXX
XXXXXXXX
    `,

    `
              XXXXXXXX
              X  ....X
   XXXXXXXXXXXX  ....X
   X    X  * *   ....X
   X ***X*  * X  ....X
   X  *     * X  ....X
   X ** X* * *XXXXXXXX
XXXX  * X     X
X   X XXXXXXXXX
X    *  XX
X **X** @X
X   X   XX
XXXXXXXXX
    `,

    `
        XXXXX
        X   XXXXX
        X X*XX  X
        X     * X
XXXXXXXXX XXX   X
X....  XX *  *XXX
X....    * ** XX
X....  XX*  * @X
XXXXXXXXX  *  XX
        X * *  X
        XXX XX X
          X    X
          XXXXXX
    `,

    `
XXXXXX  XXX
X..  X XX@XX
X..  XXX   X
X..     ** X
X..  X X * X
X..XXX X * X
XXXX * X*  X
   X  *X * X
   X *  *  X
   X  XX   X
   XXXXXXXXX
    `,

    `
       XXXXX
 XXXXXXX   XX
XX X @XX ** X
X    *      X
X  *  XXX   X
XXX XXXXX*XXX
X *  XXX ..X
X * * * ...X
X    XXX...X
X ** X X...X
X  XXX XXXXX
XXXX
    `,

    `
  XXXX
  X  XXXXXXXXXXX
  X    *   * * X
  X *X * X  *  X
  X  * *  X    X
XXX *X X  XXXX X
X@X* * *  XX   X
X    * X*X   X X
XX  *    * * * X
 XXXX  XXXXXXXXX
  XXX  XXX
  X      X
  X      X
  X......X
  X......X
  X......X
  XXXXXXXX
    `,

    `
          XXXXXXX
          X  ...X
      XXXXX  ...X
      X      ...X
      X  XX  ...X
      XX XX  ...X
     XXX XXXXXXXX
     X *** XX
 XXXXX  * * XXXXX
XX   X* *   X   X
X@ *  *    *  * X
XXXXXX ** * XXXXX
     X *    X
     XXXX XXX
        X  X
        X  X
        X  X
        XXXX
    `,

    `
              XXXX
         XXXXXX  X
         X       X
         X  XXXX XXX
 XXX  XXXXX XXX    X
XX@XXXX   *** X    X
X **   ** *   X....XX
X  ***X    *  X.....X
X *   X ** ** X.....X
XXX   X  *    X.....X
  X   X * * * X.....X
  X XXXXXXX XXX.....X
  X   X  * *  X.....X
  XXX X ** * *XXXXXXX
    X X  *      X
    X X *** *** X
    X X       X X
    X XXXXXXXXX X
    X           X
    XXXXXXXXXXXXX
    `,

    `
          XXXX
     XXXX X  X
   XXX  XXX* X
  XX   @  *  X
 XX  * **XX XX
 X  X*XX     X
 X X * ** X XXX
 X   * X  X * XXXXX
XXXX    X  ** X   X
XXXX XX *         X
X.    XXX  XXXXXXXX
X.. ..X XXXX
X...X.X
X.....X
XXXXXXX
    `,
];

let M = {
    create({
        gameStage,
        resources,
        rows=5,
        cols=5,
        tileSize=40,
        tileSpace=1.0,
        alpha=0.8,
        x, y,
        seconds=0.2,
        stretch=1.0,

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
            )
        });

        //let tileMap = _ => PIXI.Texture.from(images.tile);
        let tileMap = _ => floorTile;

        let self = {
            gameStage,
            resources,
            gridArgs: {
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                stretch, interactive: true,
                wrapDrag: true,
                alpha,
                seconds,
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
            fontSize: 30,
            pointerdown: handler,
            bgStyle: {
                normal: 0x666600,
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
                margin: 10,
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

    setupHelpDialog(self) {
        let {gameStage} = self;
        gameStage.showHelp = () => {
            gameStage.hideMenuBar();
            M.pause(self);
            let ui = UI.new();
            let {
                img,
                fill, size, map, center, centerX, left, top, right, bottom,
                row, col, textBig, text, textSmall, minWidth, fillX,
                and, btn,slide, root, btnImg,
            } = ui.funcs();

            let path = "static/images/help/sokoban/";
            let videoSize = {
                width: 220,
                height: 150,
            }
            let videos = {
                "controls": PixiUtil.loadVideo(path+"controls.mp4", videoSize),
                "gameplay": PixiUtil.loadVideo(path+"gameplay.mp4", videoSize),
                "fail": PixiUtil.loadVideo(path+"fail.mp4", videoSize),
            }
            let slideDialog = SlideDialog.new({
                title: "Help",
                items: [
                    ui.build(_=> row(
                        videos.controls,
                        text(`
                            |Controls:
                            |Use the ⇦ , ⇨, ⇩, and ⇧ arrow keys 
                            |to control the character.
                            |Move against a vase to push them. 
                            |You cannot pull vases.
                            `),
                    )),
                    ui.build(_=> row(
                        videos.gameplay,
                        text(`
                            |Goal:
                            |Move all the vase into their destination
                            |(the green patches of grass).
                            `),
                    )),
                    ui.build(_=> row(
                        videos.fail,
                        text(`
                            |Stuck:
                            |Avoid pushing the vases in the corner.
                            |If this happens, then the level can
                            |no longer be completed and needs
                            |to be restarted.
                            `),
                    )),
                ],
                closed: () => {
                    M.resume(self);
                    for (let [_, vid] of Object.entries(videos))
                        vid.destroy(true);
                    gameStage.showMenuBar();
                }
            });
            gameStage.addUI(slideDialog);
            Table.Align.center(slideDialog);
            Anima.fade(slideDialog, {start: 0, end: 1});
        }
    },

    newGame(self, level) {
        self.currentLevel = level;
        if (self.grid) {
            self.grid.destroy({children: true});
        }
        let {gameStage} = self;
        let mapStr = levels[level];
        let grid = self.grid = createGrid(mapStr, self.gridArgs);
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);

        self.player = grid[PLAYER];
        M.listenKeys(self);
        M.handleInput(self);
        gameStage.watch(self.player);
        M.createPlayMenu(self);
        gameStage.showMenuBar();
        M.setupHelpDialog(self);
    },

    start(self) {
        M.init(self);
        M.createMainMenu(self);
    },

    isComplete(self) {
        let {grid} = self;
        let dests = grid[DESTS];
        for (let s of grid[MOVS]) {
            let pos = grid.spritePos(s);
            if (!dests.has(grid.indexOf(pos)))
                return false;
        }
        return true;
        //return grid[DESTS].every(pos => grid.isOccupied(pos));
    },

    handleInput(self) {
        if (!self.player || self.gameLoop)
            return;

        let move = async dir => {
            let {player, grid, keys} = self;

            let state = Util.stateName(dir);
            if (player.setState) {
                player.setState(state);
                player.play();
            }
            if (!Vec.equals(dir, player[DIR])) {
                await Util.sleep(100);
                player[DIR] = dir;
                return;
            }

            let playerPos = grid.spritePos(player);
            let pos1 = Vec.new(playerPos).add(dir);
            let pos2 = Vec.new(pos1).add(dir);

            let sprite1 = grid.spriteAt(pos1);
            let sprite2 = grid.spriteAt(pos2);

            if (sprite1 && sprite1[MOVEABLE] && sprite2 == null) {
                grid.moveBy({sprite: sprite1, step: dir, apply: true});
            }

            await grid.moveBy({sprite: player, step: dir, apply: true});
        }

        self.gameLoop = Util.loop(async () => {
            let {player, grid, keys} = self;
            if (keys.up.isDown)
                await move({x: 0,  y: -1});
            else if (keys.down.isDown)
                await move({x: 0,  y:  1});
            else if (keys.left.isDown)
                await move({x: -1, y:  0});
            else if (keys.right.isDown)
                await move({x:  1, y:  0});
            else {
                player.stop();
            }
            if (M.isComplete(self)) {
                self.gameLoop.stop();
                M.createWinGame(self);
            }
        });
    },

    stop(self) {
        if (self.grid)
            self.grid.destroy({children: true});
        self.actions.stop();
        M.unlistenKeys(self);
            self.gameLoop = null;
    },

    createMainMenu(self) {
        let {gameStage} = self;
        let menu = gameStage.createMenu({
            title: "Sokoban",
            showBg: false,
            textStyle: {
                fill: 0x33dddd,
                fontSize: 90,
            },
        }, {
            "New Game": ()=>{
                gameStage.showMenuBar();
                M.createLevelMenu(self);
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
            "Restart": ()=>{
                M.newGame(self, self.currentLevel);
            },
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
                fill: 0xaa0033,
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
                M.newGame(self, self.currentLevel+1);
            },
            "back to main": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    resume(self) {
        M.listenKeys(self);
    },
    pause(self) {
        if (self.player)
            self.player.stop();
        M.unlistenKeys(self);
    },

    listenKeys(self) {
        if (self.gameLoop)
            self.gameLoop.start();
        for (let key of Object.values(self.keys)) {
            key.listen();
        }
    },
    unlistenKeys(self) {
        if (self.gameLoop)
            self.gameLoop.stop();
        for (let key of Object.values(self.keys)) {
            key.unlisten();
        }
    },

}

M.new = Util.constructor(M);
module.exports = M;


