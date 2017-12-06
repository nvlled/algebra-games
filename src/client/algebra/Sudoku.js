
let Actions = require("src/client/algebra/Actions");
let Algebra = require("src/client/algebra/Algebra");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let Anima = require("src/client/algebra/Anima");
let Button = require("src/client/algebra/Button");
let Waypoint = require("src/client/algebra/Waypoint");
let Util = require("src/client/algebra/Util");
let Vec = require("src/client/algebra/Vec");
let EasingFn = require("src/client/algebra/EasingFn");
let Grid = require("src/client/algebra/Grid");
let Layout = require("src/client/algebra/Layout");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let Keymap = require("src/client/algebra/Keymap");
let SlideContent = require("src/client/algebra/SlideContent");
let PixiUtil = require("src/client/algebra/PixiUtil");
let PIXI = require("src/client/pixi");

let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("ground_01.png"),
    background: Backgrounds.dir+"/industrial-background.jpg",
}

let FIXED = Symbol();

// TODO for the shitty night:
// add menus for other games
// add button for showing the tables
// bonus if you can add some onscreen controllers
// I've still got a crapton of fucking work to do

let algebra = Algebra.new({
    table: [
        ["1"],
        ["2"],
        ["3"],
        ["4"],
        ["5"],
        ["6"],
        ["7"],
        ["8"],
        ["9"],
    ],
});

function blockSize(size) {
    let cols = Math.ceil(Math.sqrt(size));
    let rows = Math.floor(size/cols);
    return {cols, rows};
}

function blockPos(size, {x, y}) {
    // 4, 2*2
    // 6, 3*2
    // 9, 3*3
    let {cols, rows} = blockSize(size);
    //let f = n => half*Math.floor(n/half);
    return { 
        x: cols*Math.floor(x/cols),
        y: rows*Math.floor(y/rows),
    };
}

let M = {
    create({
        gameStage,
        resources,
        x=0, y=0,
        speed=900,
        stretch=.8,
        interactive,
        alpha=0.8,
        onGameOver=()=>{},
    } = {}) {

        gameStage.setBackground(images.background);
        let tileSize = 45;
        let tileSpace = 2;


        let size = 6;
        let tileMap = _ => PIXI.Texture.from(images.tile);
        let self = {
            gameStage,
            resources,
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
            gridArgs: {
                size,
                tileSize, tileSpace,
                x, y, tileMap, speed, stretch, alpha,
            },
            fixed: {},
        };

        return self;
    },

    showBorders(self) {
        let {gridArgs, grid} = self;
        let {size} = gridArgs;
        let bs = blockSize(size);
        for (let y = 0; y < size; y += bs.rows) {
            for (let x = 0; x < size; x += bs.cols) {
                grid.surroundBorder(Vec.range(
                    {x, y}, {x: x+bs.cols-1, y: y+bs.rows-1},
                ), {color: 0xdd4444, alpha: 1.0});
            }
        }
    },

    createHandler(self, s, copy=true) {
        let dragging = false;
        let sprite;
        s.pointerdown = function(e) {
            if (sprite)
                sprite.destroy();
            sprite = new PIXI.Sprite(s.texture);
            self.createdSprites.push(sprite);
            dragging = true;
            sprite.setParent(self.gameStage.world);
            //s.parent.addChild(sprite);
            let p = e.data.global;
            sprite.x = p.x-sprite.width/2;
            sprite.y = p.y-sprite.height/2;
            console.log(sprite.x, sprite.y);
            sprite.width = s.width;
            sprite.height = s.height;
            sprite.alpha = 0.4;
        }
        s.pointermove = function(e) {
            if (!dragging)
                return;

            let {grid} = self;
            let p = e.data.global;
            sprite.x = p.x-sprite.width/2;
            sprite.y = p.y-sprite.height/2;
            let [gpos] = Util.nulla(grid.globalToGridPos(p));
            grid.clearHighlights();
            if (gpos) {
                grid.hightlightTiles([gpos]);
            }
        }
        s.pointerupoutside = function(e) {
            let {grid} = self;
            dragging = false; let p = e.data.global;
            let [gpos] = Util.nulla(grid.globalToGridPos(p));
            grid.clearHighlights();

            if (gpos && !M.isReplaceable(self, gpos)) {
                let fixedSprite = grid.spriteAt(gpos);
                if (fixedSprite)
                    Anima.shake(sprite, {start: 0});
            }

            let valid = false;
            if (gpos && M.isReplaceable(self, gpos)) {
                if (copy) {
                    let {x,y} = gpos;
                    grid.removeSprite({x, y}, true);
                    Anima.fade(sprite, {end: 1});
                    grid.setSprite({sprite, x, y});
                    valid = M.checkTiles(self);
                    M.createHandler(self, sprite, false);
                    sprite.interactive = true;
                    sprite.buttonMode = true;
                    sprite = null;
                } else if (!Vec.equals(gpos, grid.spritePos(s))) {
                    let {x,y} = gpos;
                    grid.removeSprite({x, y}, true);
                    Anima.fade(s, {end: 1});
                    if (!s._destroyed)
                        grid.setSprite({sprite: s, x, y});
                    valid = M.checkTiles(self);
                    sprite.destroy();
                    sprite = null;
                } else if (sprite) {
                    sprite.destroy();
                }
            } else if (sprite) {
                if (copy) {
                    sprite.setParent(s.parent);
                    sprite.x -= s.parent.x;
                    sprite.y -= s.parent.y;
                    let sprite_ = sprite;
                    Anima.move(sprite_, {end: s})
                        .then(() => {
                            if (sprite_)
                                sprite_.destroy();
                            if (sprite_ == sprite)
                                sprite = null;
                        });
                } else {
                    grid.removeSprite(sprite);
                    grid.removeSprite(s);
                    Anima.fade(sprite, {end: 0});
                    Anima.fade(s, {end: 0});
                }
            }
            if (valid && grid.isFull()) {
                M.gameWin(self);
            }
        }
        s.pointerup = s.pointerupoutside;
    },

    isReplaceable(self, pos) {
        let sprite = self.grid.spriteAt(pos);
        if (sprite && sprite[FIXED]) {
            return false;
        }
        return true;
    },

    generatePuzzle(self, size) {
        // 4^3
        // 6^3
        // 9^3
        // size*size*size

        let puzzle = new Array(size*size);
        let getCol = x => {
            let xs = [];
            for (let y = 0; y < size; y++) {
                let i = y*size + x;
                xs.push(puzzle[i]);
            }
            return xs;
        }
        let getBlock = (bx,by) => {
            //let s = size/2;
            //let f = n => s*Math.floor(n/s);
            //let p = { x: f(bx), y: f(by) };
            let p = blockPos(size, {x: bx, y: by});
            let bs = blockSize(size);
            let xs = [];
            for (let y = p.y; y < p.y+bs.rows; y++) {
                for (let x = p.x; x < p.x+bs.cols; x++) {
                    let i = y*size + x;
                    xs.push(puzzle[i]);
                }
            }
            return xs;
        }
        //for (let y = 0; y < size; y++) {
        //    for (let x = 0; x < size; x++) {
        //        getBlock(x,y);
        //    }
        //}

        //3 4 x 2
        //2 1 x 4
        //4 2 x 1
        //x x x x

        //3 4 1 2
        //2 1 4 3
        //4 2 3 1
        //1 3 2 4
        //
        
        // x x 5 2 x 4
        // 4 1 3 6 x x
        // 6 2 x 5 3 1
        // x 4 x x x 6
        // 2 x 1 4 5 3
        // 3 5 6 1 x 2


        //2 1 x 4 x 5 8 7 3
        //x 5 4 x x 2 3 8 1
        //x 6 3 x x 1 4 2 8
        //x x 8 2 x 4 1 3 7
        //7 9 x x x 3 2 1 6
        //4 2 1 8 3 7 5 6 9
        //3 7 2 1 8 9 6 4 5
        //1 3 5 7 2 6 9 x 4
        //5 8 4 3 1 x 7 9 2
        
        // random pick from available slots

        let conflicts = [];
        for (let elem = 1; elem <= size; elem++) {
            let ys = Util.range(size);
            ys.forEach(y => {
                let start = y*size;
                let end = start + size;
                let i = Util.randomEmptyIndex(puzzle, {start,end}, idx => {
                    let x = idx%size;
                    return puzzle[idx]==null && 
                        getCol  (x  ).indexOf(elem) < 0 &&
                        getBlock(x,y).indexOf(elem) < 0;
                });
                if (i == null) {
                    conflicts.push([elem, y]);
                } else {
                    puzzle[i] = elem;
                }
            });
        }
        conflicts.forEach(([elem, y]) => {
            for (let x = 0; x < size; x++) {
                let i = y*size + x;
                if (puzzle[i] == elem)
                    delete puzzle[i];
            }
        });

        //let s = "";
        //for (let y = 0; y < size; y++) {
        //    for (let x = 0; x < size; x++) {
        //        let i = y*size + x;
        //        if (puzzle[i] == null)
        //            s += "x ";
        //        else
        //            s += puzzle[i]+" ";
        //    }
        //    s+="\n";
        //}
        //console.log(s);

        return puzzle;
    },

    createGrid(self, size) {
        if (self.grid) {
            self.grid.destroy({children: true});
        }

        let {gridArgs} = self;
        gridArgs.size = size;
        gridArgs.rows = size;
        gridArgs.cols = size;
        let tileSize = self.gameStage.ui.width/15; 
        let grid = Grid.new(Object.assign(gridArgs, {
            tileSize, 
        }));

        self.grid = grid;
        self.gameStage.add(grid);
        grid.visible = true;
        Layout.centerOf({}, self.gameStage.world, grid);

        M.generatePuzzle(self, size).forEach((elem, i) => {
            let {x, y} = grid.toXY(i);
            // TODO: temporary fix
            if (Math.random() < 0.5)
                return;
            let sprite = self.algebra.createSprite(elem);
            sprite[FIXED] = true;
            grid.setSprite({
                x,y, sprite,
            });
        });

        {
            let sprite = grid.tileAt({x: 0, y: 0});
            let elemSprites = self.algebra.createAllSprites().slice(0, size);
            let blah = Layout.col({
                center: true,
                marginX: -20,
                width: tileSize*.7,
                height: tileSize*.7,
            }, ...elemSprites);
            Layout.leftOf({align:"left"}, self.grid, blah);
            elemSprites.forEach(s => {
                s.interactive = true;
                s.buttonMode = true;
                M.createHandler(self, s);
            });
            self.panel = blah;
        }
        M.showBorders(self);
    },

    init(self) {
        if (self.initialized)
            return;
        self.initialized = true;
        self.createdSprites = [];
    },

    isFixed(self, {x, y}) {
        let sprite = self.grid.spriteAt({x, y});
        if (sprite)
            return sprite[FIXED];
    },

    onTileClick(self, {x, y}) {
        let sprite = self.grid.spriteAt({x,y});
        if (sprite[FIXED]) {
            Anima.shake(sprite, {start: 0});
            return;
        }

        let {grid} = self;
        self.grid.removeSprite({x, y}, true);
        M.checkTiles(self);
        return;
        //if (M.isFixed(self, {x,y}) {
        //    let sprite = grid.spriteAt({x, y});
        //    Anima.shake(sprite, { start: 0 });
        //    return;
        //}

        //let prevSprite = self.grid.spriteAt({x, y});
        //let alg = self.algebra;
        //let elem = null;
        //let valid;
        //if (prevSprite) {
        //    prevSprite.destroy();
        //    self.grid.removeSprite({x, y});
        //    let elem = alg.getElem(prevSprite);
        //    elem = Util.nextItem(alg.getElems().slice(0, self.gridArgs.size), elem);

        //    if (elem) {
        //        let sprite = self.algebra.createSprite(elem);
        //        self.grid.setSprite({sprite, x, y});
        //    }

        //    valid = M.checkTiles(self, {x, y});
        //} else {
        //    let sprite = self.algebra.createSprite(alg.getElems()[0]);
        //    self.grid.setSprite({sprite, x, y});
        //    valid = M.checkTiles(self, {x, y});
        //}

        //if (valid && self.grid.isFull()) {
        //    grid.setInteractive(false);
        //    self.grid.eachSprite(sprite => {
        //        Anima.vibrate(sprite, {
        //            start: 0,
        //            end: 0.7,
        //            seconds: 0.5,
        //        });
        //        Anima.shake(sprite, {
        //            start: 0,
        //            end: Math.PI,
        //            seconds: 2,
        //        });
        //    });
        //}
    },

    checkTiles(self) {
        let {grid} = self;
        function match(sprite1, sprite2) {
            return sprite1 && sprite2 &&
                sprite1.texture == sprite2.texture &&
                sprite1 != sprite2;
        }
        function rowMatch(x, y, sprite) {
            let result = [];
            // This assumes that the grid is traversed from left,top to right,bottom.
            // It skips checking positions before it for efficiency.
            x++;
            for (; x < grid.cols; x++) {
                let sprite_ = grid.spriteAt({x, y});
                if (match(sprite, sprite_))
                    result.push({x,y});
            }
            return result;
        }
        function colMatch(x, y, sprite) {
            let result = [];
            y++;
            for (; y < grid.cols; y++) {
                let sprite_ = grid.spriteAt({x, y});
                if (match(sprite, sprite_))
                    result.push({x,y});
            }
            return result;
        }
        function blockMatch(x, y, sprite) {
            let result = [];
            let size = self.grid.rows/2;
            let bsize = blockSize(size*2);
            let bpos = blockPos(size*2, {x, y});

            for (; x < bpos.x+bsize.cols; x++) {
                for (let y_ = bpos.y; y_ < bpos.y+bsize.rows; y_++) {
                    let sprite_ = grid.spriteAt({x, y: y_});
                    if (match(sprite, sprite_)) {
                        result.push({x, y: y_});
                    }
                    //grid.hightlightTiles([{x,y: y_}], 0x0000aa);
                }
            }
            return result;
        }

        grid.clearHighlights();

        let valid = true;
        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.cols; x++) {
                let sprite = grid.spriteAt({x, y});
                if (!sprite)
                    continue;

                let row = rowMatch(x, y, sprite);
                if (row.length > 0) {
                    valid = false;
                    row.push({x, y});
                    grid.hightlightTiles(row, 0xaa0000, true);
                }

                let col = colMatch(x, y, sprite);
                if (col.length > 0) {
                    valid = false;
                    col.push({x,y});
                    grid.hightlightTiles(col, 0x00aa00, true);
                }

                let block = blockMatch(x, y, sprite);
                if (block.length > 0) {
                    valid = false;
                    block.push({x,y});
                    grid.hightlightTiles(block, 0xee0044, true);
                }
            }
        }
        return valid;
    },

    checkTiles2(self, pos) {
        let {grid} = self;

        let row = grid.getRow(pos.y, false);
        let col = grid.getColumn(pos.x, false);

        let sprite = self.grid.spriteAt(pos); 
        if (!sprite)
            return;

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
            self.grid.hightlightTiles(row, 0xff8888); 
        if (col.length > 1)
            self.grid.hightlightTiles(col, 0xff8888); 
    },

    createAlgebra(self) {
        let {resources} = self;
        let factories = ["MonsterSprites"]
                .map(name => require("src/client/algebra/"+name).new());
        let sprites = factories.reduce((ctors, factory) => {
            return ctors.concat(factory.getConstructors(resources));
        }, []);
        Util.shuffle(sprites);

        let galge = GraphicAlgebra.new({
            algebra,
            textures: Object.assign(
                Util.randomPair(algebra.elems, sprites),
                { equals: resources["equals"].texture,
                }
            )
        });
        self.algebra = galge;
    },


    newGame(self, size=4) {
        M.init(self);
        M.createAlgebra(self);
        M.createGrid(self, size);
        M.createButtons(self);
        M.checkTiles(self);

        M.createPlayMenu(self);
        self.gameStage.showMenuBar();
    },

    createButtons(self) {
        let clearBtn = Button.create({
            text: "clear",
            fontSize: 15,
            fgStyle: {
                normal: 0xffffff,
            },
            bgStyle: {
                normal: 0x333333,
            },
        });
        clearBtn.pointerdown = () => {
            M.clearSprites(self);
        }
        self.gameStage.add(clearBtn);
        Layout.leftOf({align: "right", marginY: 10}, self.grid, clearBtn);
        self.clearBtn = clearBtn;
    },

    async gameWin(self) {
        let grid = self.grid;
        Anima.fade(self.panel, {end: 0});
        let ps = [];
        grid.eachSprite((s, x, y) => {
            s.interactive = false;
            setTimeout(() => {
                ps.push(Anima.boom(s));
            }, (y*grid.cols + x)*100);
        });
        await Promise.all(ps);
        M.createGameWinMenu(self);
    },

    createGameWinMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "Puzzle completed",
            showBg: false,
            textStyle: {
                fill: 0xdd9090,
                fontSize: 60,
            },
            onShow: ()=> {
                M.pause(self);
            },
            onHide: ()=> {
                M.resume(self);
            },
        }, {
            "Back": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    start(self) {
        M.init(self);
        M.createMainMenu(self);
    },

    createMainMenu(self) {
        let {gameStage} = self;
        let menu = gameStage.createMenu({
            title: "Sudoku",
            showBg: false,
            textStyle: {
                fill: 0x00aa00,
                fontSize: 130,
            },
        }, {
            "New Game": ()=>{
                M.createSubMenu(self);
            },
            "Help": ()=>{
                Anima.slideOut(menu, {fade: 1});
                SlideContent.dialog({
                    title: "Help",
                    content: [
                        "Drag the items on the left into the grid. Each item must only occur once in a row, column or block.",
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

    createSubMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "Select board size",
            showBg: false,
            textStyle: {
                fill: 0x00aa00,
                fontSize: 50,
            },
        }, {
            "9x9": ()=>{ M.newGame(self, 9) },
            "6x6": ()=>{ M.newGame(self, 6) },
            "4x4": ()=>{ M.newGame(self, 4) },
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
        self.gameStage.clearWorld();
        if (self.panel)
            self.panel.destroy({children: true});
        if (self.grid) {
            self.grid.destroy({children: true});
        }
        for (let s of self.createdSprites) {
            s.destroy();
        }
        if (self.clearBtn) {
            self.clearBtn.destroy({children: true});
        }
        self.createdSprites.splice(0);
        M.unlistenKeys(self);
        self.actions.stop();
    },

    resume(self) {
        M.listenKeys(self);
        if (self.grid) {
            // TODO: allow disabling interactivity
            //self.grid.setInteractive(false);
        }
    },
    pause(self) {
        M.unlistenKeys(self);
        if (self.grid) {
            self.grid.interactive = false;
        }
    },

    clearSprites(self) {
        let {grid} = self;
        grid.eachSprite(function(sprite, x, y) {
            if ( ! M.isFixed(self, {x, y})) {
                grid.clearHighlights();
                grid.removeSprite({x, y});
                sprite.destroy();
            }
        });
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

    randomize(self, size=6) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 128;

        let elems = algebra.getElems().slice(0, size);
        Util.remove(elems, algebra.algebra.identity);
        Util.shuffle(elems);
        let count = elems.length;

        self.fixed = {};
        let n;
        for (n = 0; n < count; n++) {

            let elem = elems[n];

            let [_, i] = Util.randomSelect(grid.tiles, filled, false);
            if (i == null)
                return false;

            filled[i] = true;
            filled[elem] = true;
            self.fixed[i] = true;
            let {x, y} = grid.toXY(i);
            if (self.grid.hasSprite({x, y})) {
                n--;
                retries--;
                if (retries <= 0)
                    break;
            } else {
                let sprite = algebra.createSprite(elem);
                grid.setSprite({x, y, sprite});
                sprite.buttonMode = true;
            }
        }
        return n == count;
    },

    combineElements(self) {
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


