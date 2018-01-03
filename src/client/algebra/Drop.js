let Util = require("src/client/algebra/Util");
let SetUtil = require("src/client/algebra/SetUtil");
let Layout = require("src/client/algebra/Layout");
let Button = require("src/client/algebra/Button");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Grid = require("src/client/algebra/Grid");
let Block = require("src/client/algebra/Block");
let Keyboard = require("src/client/algebra/Keyboard");
let PIXI = require("src/client/pixi");
let Actions = require("src/client/algebra/Actions");
let Anima = require("src/client/algebra/Anima");
let Algebra = require("src/client/algebra/Algebra");
let InfoText = require("src/client/algebra/InfoText");
let FadeText = require("src/client/algebra/FadeText");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let GraphicTable = require("src/client/algebra/GraphicTable");
let EasingFn = require("src/client/algebra/EasingFn");
let SlideContent = require("src/client/algebra/SlideContent");
let Table = require("src/client/algebra/Table");
let Highscore = require("src/client/algebra/Highscore");
let HighscoreDialog = require("src/client/algebra/HighscoreDialog");
let InputDialog = require("src/client/algebra/InputDialog");
let Sound = require("src/client/algebra/Sound");
let UI  = require("src/client/algebra/UI");
let SlideDialog  = require("src/client/algebra/SlideDialog");

let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("ground_04.png"),
    background1: Backgrounds.dir+"/voodoo.jpg",
    background2: Backgrounds.dir+"/wizardtower.png",
    background3: Backgrounds.dir+"/pyramid.jpg",
    background4: Backgrounds.dir+"/backdrop.png",
    background5: Backgrounds.dir+"/bg5.jpg",
}

// TODO: Fix gameover bug

let startSpeed = 3000;
let speedDiff = 100;
let nextLevelCount = 35;

// gameplay:
// the resulting element will be a bonus item instead
// of inserting a new one, for instance a bomb

// TODO:
// show table
// score
// levels

let shapes = {
    L: {
        cols: 3,
        data: [
            1, 1, 1,
            1, 0, 0,
        ],
    },
    J: {
        cols: 3,
        data: [
            1, 1, 1,
            0, 0, 1,
        ],
    },
    O: {
        square: true,
        cols: 2,
        data: [
            1, 1,
            1, 1,
        ],
    },
    I: {
        cols: 4,
        data: [ 1, 1, 1, 1 ],
    },
    T: {
        cols: 3,
        data: [
            1, 1, 1,
            0, 1, 0,
        ],
    },
};


let btn = {
    newGame: Button.new({
        text: "new game",
    }),
}

let algebra = Algebra.new({
    identity: 'e',
    table: [
        ["a", "a", "a", "b"],
        ["b", "b", "b", "c"],
        ["c", "c", "c", "a"],
        ["d", "d", "d", "d"],
    ],
});

let maxRows = (function() {
    let row = 0;
    for (let [_, shape] of Object.entries(shapes)) {
        row = Math.max(row, shape.data.length/shape.cols);
    }
    return row;
})();

let M = {
    create({
        gameStage,
        resources,
        rows=14,
        cols=10,
        tileSpace,
        alpha,
        //tileMap,
        x, y,
    } = {}) {
        gameStage.setBackground(images.background1);

        let CharSprites = require("src/client/algebra/CharSprites").new();
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

        let tileSize = 21;
        let tileMap = _ => PIXI.Texture.from(images.tile);
        let gridArgs = {
            speed: 300,
                x, y, rows, cols, tileSize, tileSpace, tileMap,
                alpha,
        }

        let highscore = Highscore.new({
            name: "drop",
            length: 5,
        });

        let self = {
            highscore,
            gridArgs,
            algebra: galge,
            keys: {
                left: Keyboard(37),
                up: Keyboard(38),
                right: Keyboard(39),
                down: Keyboard(40),
            },
            ticker: new PIXI.ticker.Ticker(),
            initialized: false,
            descendSpeed: startSpeed,
            releasing: false,
            running: false,
            timerId: null,
            dropSpeed: 300,
            clearCount: 0,
            rotateTime: 0.4,
            moveTime: 0.4,

            gameStage,
            actions: Actions.new({throttle: 30, bufferSize: 1}),
        };

        return self;
    },

    init(self) {
        if (self.initialized)
            return;
        self.initialized = true;

        self.keys.left.press  = e=>M.moveLeft(self);
        self.keys.right.press = e=>M.moveRight(self);
        self.keys.up.press    = e=>M.rotate(self);
        self.keys.down.press  = e=>M.release(self);

        btn.newGame.pointerup = function() {
            self.actions.add(() => {
                self.running = false;
                self.grid.clearSprites(true);
                M.start(self);
            }, true);
        }
    },

    createGrid(self) {
        let {gameStage} = self;
        let grid = self.grid = Grid.new(self.gridArgs);
        gameStage.add(grid);
        Layout.centerOf({marginX: grid.width/4}, gameStage.world, grid);
        grid.setInteractive(true);
        M.setupGridHandlers(self);
    },

    setupGridHandlers(self) {
        let {gameStage, grid} = self;
        grid.onTileDrag=(pos, pos_, dir)=> {
            if (dir.y == 0)
                self.actions.add(() => M.moveBlock(self, self.currentBlock, dir));
            else if (dir.y < 0)
                M.rotate(self);
            else if (dir.y > 0)
                M.release(self);
        }
    },

    gameOver(self) {
    },

    startDescension(self, force=false) {
        if (self.descending && !force)
            return;
        //self.forceDescend = force;
        self.descending = true;
        let loop = async function() {
            if (!self.running)
                return;
            if (self.releaseAction) {
                await self.releaseAction;
                self.releaseAction = null;
            }

            let points = self.currentBlock.points;
            await M.moveDown(self);

            if (self.currentBlock.points == points) {
                M.unlistenKeys(self);
                self.actions.clear();
                await M.shift(self);
                let points = self.currentBlock.data.map(s=>self.grid.spritePos(s));
                let combo = 0;
                while (points.length > 0) {
                    points = await M.searchMatches(self, points, ++combo);
                }
                self.actions.block(false);

                let gameover = M.newBlock(self);
                M.listenKeys(self);

                if (self.clearCount > nextLevelCount) {
                    M.nextLevel(self);
                    self.clearCount = 0;
                }

                if (gameover) {
                    let {gameStage} = self;
                    self.running = false;
                    self.actions.stop();
                    M.unlistenKeys(self);
                    let score = self.info.ref.score;
                    let recorded = false;
                    if (self.highscore.isHighscore(score)) {
                        let dialog = InputDialog.new({
                            textPrompt: "Highscore, enter your name",
                            buttonPrompt: "confirm",
                            size: 8,
                            tap() {
                                if (recorded)
                                    return;
                                recorded = true;
                                let name = dialog.getValue();
                                if (self.highscore.isHighscore(score)) {
                                    self.highscore.addEntry({
                                        name,
                                        score,
                                    });
                                }
                                Anima.fade(dialog, {end: 0});
                                M.createGameOverMenu(self);
                            }
                        });
                        Anima.fade(dialog, {end: 1, start: 0});
                        gameStage.add(dialog);
                        Table.Align.center(dialog);
                    } else {
                        M.createGameOverMenu(self);
                    }
                }
            }

            if (self.running) {
                clearTimeout(self.timerId);
                self.timerId = setTimeout(loop, self.descendSpeed);
            } else {
                self.descending = false;
            }
        }
        clearTimeout(self.timerId);
        if (force) {
            loop();
        } else {
            self.timerId = setTimeout(loop, self.descendSpeed);
        }
    },

    nextLevel(self) {
        //self.level++;
        self.info.ref.level++;
        self.descendSpeed -= speedDiff;
        if (self.descendSpeed < 0) {
            self.descendSpeed = 0;
        }
        self.gameStage.changeBackground(Backgrounds.randomName());
    },

    async searchMatches(self, points, combo=1) {
        let {grid, algebra} = self;
        let size = algebra.getMaxArgLen();
        let blockSet = new Set(self.currentBlock.data);
        let exclude = new Set();

        let table = [];

        for (let pos of points) {
            if (!pos)
                continue;
            if (exclude.has(pos))
                continue;
            let params = await M.findCandidateParametersH(self, {pos, size, exclude});
            if (params.length > 0) {
                SetUtil.addAll(exclude, params);
                table.push(params);
            }
            params = await M.findCandidateParametersV(self, {pos, size, exclude});
            if (params.length > 0) {
                SetUtil.addAll(exclude, params);
                table.push(params);
            }
        }
        let promises = [];

        for (let row of table) {
            Sound.play("explode");
            //await PixiUtil.flashSprites(row);
            Anima.vibrate(self.grid, {seconds: .2, end: 1.01});
            promises = promises.concat(row.map(s => Anima.boom(s)))
            self.clearCount += row.length;
            self.info.ref.score += row.length*combo;
            if (combo > 1)
                self.comboText.setText("chain x"+combo);
        }

        if (promises.length > 0) {
            let paths = [];
            for (let row of table) {
                for (let sprite of row) {
                    let pos = grid.spritePos(sprite);
                    grid.removeSprite(pos);
                }
                let newSprite = algebra.applySprites(...row);
                if (newSprite && algebra.getElem(newSprite) != algebra.getIdentity()) {
                    let insertPos = grid.spritePos(row[0]);
                    //grid.setSprite({sprite: newSprite, x: insertPos.x, y: insertPos.y});
                    //newSprite.alpha = 0;
                    //Anima.fade(newSprite, {end: 1});
                    //paths.push(insertPos);
                }
            }
            paths = paths.concat(await M.shift(self));
            grid.flashBlocks(paths, 0xffaa00, 500);
            await Promise.all(promises);
            return paths;
        }
        return [];
    },

    async findCandidateParametersH(self, {pos, size, matchSize=true, exclude=[]}) {
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
                if (algebra.applySprites(...sprites)) {
                    return sprites;
                }
            }
        }
        return [];
    },

    async findCandidateParametersV(self, {pos, size, matchSize=true, exclude=[]}) {
        let excludeSet = exclude instanceof Set ? exclude : new Set(exclude);
        let shouldInclude = elem => !excludeSet.has(elem);

        let {grid, algebra} = self;
        let result = [];

        for (let n = 0; n < size; n++) {
            let sprites = [];
            for (let y = pos.y-n; y < pos.y+size-n; y++) {
                let sprite = grid.spriteAt({y, x: pos.x});
                if (sprite && shouldInclude(sprite))
                    sprites.push(sprite);
            }

            if (!matchSize || sprites.length == size) {
                if (algebra.applySprites(...sprites)) {
                    return sprites;
                }
            }
        }
        return [];
    },

    stopDescension(self) {
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

            let path = "static/images/help/drop/";
            let videoSize = {
                width: 150,
                height: 200,
            }
            let videos = {
                "move": PixiUtil.loadVideo(path+"move-x.mp4", videoSize),
                "rotate": PixiUtil.loadVideo(path+"rotate.mp4", videoSize),
                "drop": PixiUtil.loadVideo(path+"drop.mp4", videoSize),
                "clear": PixiUtil.loadVideo(path+"clear.mp4", videoSize),
                "gameover": PixiUtil.loadVideo(path+"gameover.mp4", videoSize),
            }
            let slideDialog = SlideDialog.new({
                title: "Help",
                items: [
                    ui.build(_=> row(
                        videos.move,
                        text(`
                            |Controls:
                            |Use the ⇦ and ⇨ arrow keys move 
                            |block horizontally. Alternatively, 
                            |drag the grid horizontally.
                            `),
                    )),
                    ui.build(_=> row(
                        videos.rotate,
                        text(`
                            |Controls:
                            |Use the ⇧ to rotate the block.
                            |Alternatively, drag the grid upwards.
                            `),
                    )),
                    ui.build(_=> row(
                        videos.drop,
                        text(`
                            |Controls:
                            |Use the ⇩ to release or drop the block.
                            |Alternatively, drag the grid downwards.
                            `),
                    )),
                    ui.build(_=> row(
                        videos.clear,
                        text(`
                            |Goal:
                            |Prevent the board from filling up.
                            |Clear pieces by aligning them according
                            |to the table or reference.
                            `),
                    )),
                    ui.build(_=> row(
                        videos.gameover,
                        text(`
                            |End game:
                            |The game ends when the pieces 
                            |reach the block spawn point.
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

    async newGame(self) {
        M.setupHelpDialog(self);
        M.createPlayMenu(self);
        M.createGrid(self);
        self.actions.start();
        self.running = true;
        M.listenKeys(self);
        M.clear(self);
        M.randomize(self, 30);
        await M.shift(self);
        M.newBlock(self);
        M.startDescension(self);
        self.gameStage.changeBackground(Backgrounds.randomName());

        let table = self.table = GraphicTable.new(self.algebra, {
            hideLastCol: true,
            tileSize: 25,
            tileSpace: 0.1,
            stretch: 0.8,
            tileMap: function(x, y, id) {
                return null;
            },
        });
        self.gameStage.add(table.grid);
        Layout.leftOf({}, self.grid, table.grid);

        self.info = InfoText.new({
            ref: {
                score: 0,
                level: 1,
                //time: 0,
            },
            font: {
                fill: 0xeeeeee,
                fontSize: 20,
            },
            bg: {
                color: 0x222222,
                alpha: 0.8,
            },
            valueLen: 4,
        });
        self.gameStage.add(self.info.container);
        Layout.leftOf({align: "right"}, self.grid, self.info.container);

        let comboText = FadeText.new("combo", {
            fontSize: 20,
            fill: 0x00ffff,
        });
        self.comboText = comboText;

        self.gameStage.addChild(comboText);
        Layout.leftOf({align: "center", marginX: 100}, self.grid, comboText);
        //setInterval(() => {
        //    comboText.setText((Math.random()*100)+"");
        //}, 3500);
    },

    stop(self) {
        if (self.info)
            self.info.container.destroy({children: true});
        if (self.table)
            self.table.grid.destroy({children: true});
        if (self.grid)
            self.grid.destroy({children: true});

        self.actions.stop();
        M.unlistenKeys(self);
        self.running = false;
        clearTimeout(self.timerId);
    },

    async start(self) {
        let {gameStage} = self;

        let menu = gameStage.createMenu({
            title: "Drop",
            showBg: false,
            textStyle: {
                fill: 0xdd9900,
                fontSize: 130,
            },
        }, {
            "New Game": ()=>{
                gameStage.showMenuBar();
                M.newGame(self);
            },
            "Highscore": ()=>{
                Anima.slideOut(menu, {fade: 1});
                let hsdialog = HighscoreDialog.new({
                    desc: true,
                    data: self.highscore.data,
                    button: {
                        fontSize: 18,
                        text: "back",
                        tap: async () => {
                            Layout.center({}, menu);
                            Anima.slideIn(menu, {fade: 1});
                            await Anima.slideOut(hsdialog, {fade: 1});
                            hsdialog.destroy(true);
                        },
                    },
                });
                Anima.fade(hsdialog, {end: 1, start: 0});
                gameStage.add(hsdialog);
                Table.Align.center(hsdialog);
            },
            "Exit": ()=>{
                gameStage.exitModule();
            },
        });

        M.init(self);
    },

    createPlayMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            hide: true,
            title: "paused",
            showBg: false,
            textStyle: {
                fill: 0xdd9900,
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
            "Restart": ()=>{
                M.stop(self);
                M.newGame(self);
                gameStage.hideMenu();
            },
            "Quit": ()=>{
                M.stop(self);
                M.start(self);
            },
        });
    },

    pause(self) {
        clearTimeout(self.timerId);
        M.unlistenKeys(self);
        self.running = false;
        self.descending = false;
    },

    resume(self) {
        self.running = true;
        M.listenKeys(self);
        M.startDescension(self);
    },

    clear(self) {
        if (self.currentBlock) {
            self.currentBlock.destroy();
        }
        self.grid.clearSprites();
    },

    randomize(self, count) {
        let {algebra, grid} = self;
        let filled = {};
        for (let n = 0; n < count; n++) {
            let elem = algebra.randomElement(false);
            let sprite = algebra.createSprite(elem);
            let [_, i] = Util.randomSelect(grid.tiles, filled);
            filled[i] = true;
            filled[elem] = true;
            let {x, y} = grid.toXY(i);
            grid.setSprite({x, y, sprite});
        }
    },

    shift(self) {
        return self.actions.add(_=> self.grid.dropVertical(), true);
        //let woah = null;
        //M.queueAction(self,
        //    async function() {
        //        let p = self.grid.dropVertical();
        //        return p.then(_=> woah());
        //});
        //return new Promise(resolve => {
        //    woah = resolve;
        //});
    },

    newBlock(self, shapeName) {
        if (!shapeName) {
            let names = Object.keys(shapes);
            shapeName = Util.randomSelect(names)[0];
        }
        let block = M.createBlock(self, shapeName);

        self.currentBlock = block;
        return M.insertBlock(self, self.currentBlock);
    },

    createBlock(self, shapeName) {
        let shape = shapes[shapeName];
        if (!shape)
            throw "unknown shape: " + shapeName;

        let {cols, data, square, pivot} = shape;
        let block = Block.new({
            cols,
            square,
            rows: 2,
            pivot,
            data: data.map(x => {
                if (x == 1) {
                    let {algebra} = self;
                    let elem = algebra.randomElement(false);
                    return algebra.createSprite(elem);
                }
                return null;
            }).filter(x=>x),
        });
        return block;
    },

    //randomBlock(self) {
    //    let names = Object.keys(shapes);
    //    let name = Util.randomSelect(names)[0];
    //    return M.createBlock(self, name);
    //},

    insertBlock(self, block, pos) {
        if (!pos) {
            pos = {
                x: Math.floor((self.grid.cols-block.cols)/2),
                y: 2,
            }
        }
        return self.grid.insertBlock(block, pos);
    },

    async moveBlock(self, block, dir) {
        return self.grid.moveBlock({block, dir, seconds: self.moveTime});
    },

    moveLeft(self) {
        return self.actions.add(() => M.moveBlock(self, self.currentBlock, {x: -1, y: 0}));
        //if (!self.currentBlock || self.releaseAction)
        //    return;
        //M.queueAction(self,
        //    () => M.moveBlock(self, self.currentBlock, {x: -1, y: 0}));
    },

    moveRight(self) {
        return self.actions.add(() => M.moveBlock(self, self.currentBlock, {x: 1, y: 0}));
        //if (!self.currentBlock || self.releaseAction)
        //    return;
        //M.queueAction(self,
        //    () => M.moveBlock(self, self.currentBlock, {x: 1, y: 0}));
    },

    //search(self, points) {
    //    let {algebra} = self;
    //    let blocks = [];
    //    let getGroupOf = (pos, dir, n) => {
    //        for (let x = 0; x < n; x++) {
    //            let block = [];
    //            for (let a = 0; a < n; a++) {
    //                let p = pos.new().add(dir.new().mul(a));
    //                let sprite = self.grid.spriteAt(p);
    //                if (sprite)
    //                    block.push(p);
    //            }
    //            if (block.length == n)
    //                blocks.push(block);
    //        }
    //        return blocks;
    //    }
    //    for (let p of points) {
    //    }
    //},

    // I bid goodluck to my future self for reading this code
    // no I won't haha ha!
    async moveDown(self) {
        if (!self.currentBlock || self.releaseAction)
            return Promise.resolve();

        return self.actions.add(_=> M.moveBlock(self, self.currentBlock, {x: 0, y: 1}), true);
        //return M.moveBlock(self, self.currentBlock, {x: 0, y: 1});


        //if (!self.currentBlock || self.releaseAction)
        //    return Promise.reject();
        //let woah = null;
        //M.queueAction(self,
        //    async function() {
        //        let p = M.moveBlock(self, self.currentBlock, {x: 0, y: 1});
        //        return p.then(_=> woah());
        //});
        //return new Promise(resolve => {
        //    woah = resolve;
        //});
    },

    async release(self) {
        if (self.releaseAction) {
            return;
        }
        self.releaseAction = self.actions.add(_=> M.releaseBlock(self, self.currentBlock));
        return self.releaseAction;
    },

    rotate(self) {
        return self.actions.add(() => M.rotateBlock(self, self.currentBlock));
        //M.queueAction(self, () => M.rotateBlock(self, self.currentBlock));
    },

    async releaseBlock(self, block) {
        let moved = true;
        clearTimeout(self.timerId);
        while (moved) {
            moved = await self.grid.moveBlock({block, dir: {x: 0, y: 1}, speed: self.dropSpeed});
        }
        M.startDescension(self, true);
    },

    rotateBlock(self, block) {
        return self.grid.rotateBlock({block, seconds: self.rotateTime});
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

    //queueAction(self, action) {
    //    self.actions.push(action);
    //},

    move(self) {
    },

    end(self) {
    },
}
M.new = Util.constructor(M);

module.exports = M;
