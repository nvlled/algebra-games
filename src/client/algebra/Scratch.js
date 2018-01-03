
let Actions = require("src/client/algebra/Actions");
let Anima = require("src/client/algebra/Anima");
let Phys = require("src/client/algebra/Phys");
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
let Rsrc = require("src/client/algebra/Rsrc");
let Button = require("src/client/algebra/Button");
let PIXI = require("src/client/pixi");
let GraphicTable = require("src/client/algebra/GraphicTable");
let Bouton = require("src/client/algebra/Bouton");
let Table = require("src/client/algebra/Table");
let Highscore = require("src/client/algebra/Highscore");
let HighscoreDialog = require("src/client/algebra/HighscoreDialog");
let InputDialog = require("src/client/algebra/InputDialog");
let UI  = require("src/client/algebra/UI");
let SlideDialog  = require("src/client/algebra/SlideDialog");

let Backgrounds = require("src/client/algebra/Backgrounds");
let GridTiles = require("src/client/algebra/GridTiles");

let images = {
    tile: GridTiles.get("metile.png"),
    background: Backgrounds.fullpath("sunsetintheswamp.png"),
}

let identity = "e";
let algebra = Algebra.new({
    identity,
    table: [
        ["2", "2", "4"],
        ["4", "4", "8"],
        ["8", "8", "16"],
        ["16", "16", "32"],
        ["32", "32", "64"],
        ["64", "64", "128"],
        ["128", "128", identity],
    ],
});

let M = {
    create({
        gameStage,
        resources,
        rows=4,
        cols=4,
        tileSize=50,
        tileSpace,
        x, y,
        speed=200,
        stretch=.7,
    } = {}) {
        gameStage.setBackground(images.background);

        let tileMap = _ => PIXI.Texture.from(images.tile);

        let self = {
            player:  PIXI.Sprite.fromImage("fireball"),
            gridArgs: {
                x, y, rows, cols,
                tileSize, tileSpace,
                tileMap, speed,
                stretch,
            },

            gameStage,
            resources,
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

        self.initialized = true;

        self.actions.onPerform = async () => {
            await M.combineElements(self);
        }
    },

    hasCombinable(self) {
        let {grid} = self;
        let {rows, cols} = grid;

        let isCombinable = (p1, p2) => {
            let s1 = grid.spriteAt(p1);
            let s2 = grid.spriteAt(p2);
            let combinable = self.algebra.applySprites(s1, s2) != null;
            return combinable;
        }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < rows; x++) {
                let pos = {x, y};
                if (isCombinable(pos, Vec.up(pos)))
                    return true;
                if (isCombinable(pos, Vec.right(pos)))
                    return true;
                if (isCombinable(pos, Vec.left(pos)))
                    return true;
                if (isCombinable(pos, Vec.down(pos)))
                    return true;
            }
        }

        return false;
    },

    testTable(self) {
        let sp = name => PIXI.Sprite.fromImage(name);
        let w = (s, n) => { s.width = n;  return s };
        let h = (s, n) => { s.height = n; return s };
        let sz = (s, n, m) => { s.width = n; s.height = m; return s };

        let cat = sp("blob");
        cat.width = 50;
        cat.height = 70;
        cat.anchor.set(1.0);

        let funcs = Table.Align.funcs;
        let table = Table.new({
            margin: 10
        }, ({map}) => [
            [cat, sp("fireball"), sp("blob"), map(sp("fireball"), Util.compose(funcs.top, funcs.fill(true)))],
        ]);
        let container = new PIXI.Container();
        let _ = Util.compose;
        table.mapTable(_(funcs.bottom, funcs.left));
        table.mapRow(1, _(funcs.fillX(true), funcs.fillY(false)));
        table.apply();
        self.gameStage.add(table);

        //table.addAllToContainer(container);
        //self.gameStage.world.addChild(container);
        //Table.Align.apply(table, self.grid, _(funcs.left, funcs.bottom), {outsideX: true});
        Table.Align.apply(table, self.gameStage.world, _(funcs.center), {});
        Table.Align.apply(table, self.gameStage.world, _(funcs.top, funcs.right), {});
        // TODO: Table.Align.apply(table, container, funcs.topLeft);
        // TODO: Table.Align.leftOf(table, container);
        // TODO: Table.Align.leftOf(table, container);

        Util.loop(() => {
        });
    },

    createHighscoreDialog(self, data) {
        let fn = Table.Align.funcs;
        let sp = name => PIXI.Sprite.fromImage(name);
        let text = (t,size=15) => new PIXI.Text(t, {fill: 0xffffff, fontSize: size});

        let header = [];
        let headerNames = Object.keys(data[0] || {});
        if (headerNames.length > 0) {
            header = headerNames.map(f => text(f+"", 18));
        }
        let userRows = data.map((user,i) => {
            return Object.values(user).map(f => f && text(f+""));
        });

        let t = Table.new({
            marginX: 20,
            marginY: 15,
            tableFn: Util.compose(fn.center),
        }, ({map, size, fill}) => [
            [text("Highscore", 20)],
            [...header],
            ...userRows,
        ]);
        self.gameStage.add(t);
    },

    createDialog(self) {
        let text = t => new PIXI.Text(t, {fill: 0xffffff, fontSize: 15});
        let btn = t => Bouton.new({text:t, height: 20, fontSize: 18, align: "left"});
        let btni = t => Bouton.new({
            image: t,
            width: 45,
            height: 40,
            bgcolor: 0xdddd00,
        });

        let btnGroup = [];
        let btng = t => {
            let b =  Bouton.new({
                btnGroup,
                image: t,
                width: 45,
                height: 40,
                toggle: true,
                bgcolor: 0xcc0000,
                bgcolor2: 0x222222,
            });
            btnGroup.push(b);
            return b;
        }

        let racoon = PIXI.Sprite.fromImage("racoon");
        racoon.width = 150;
        racoon.height = 150;

        let fn = Table.Align.funcs;
        let sp = name => PIXI.Sprite.fromImage(name);
        let t = Table.new({
            margin: 10,
            tableFn: Util.compose(fn.centerY, fn.left),
        }, ({map, size, fill}) => [
            [text("Game options")],
            [racoon],
            [text("select image")],
            [map(
                Table.new({margin: 5, tableFn: fn.center}, _=> [
                    [btng("fireball"), btng("blob"), btng("cat")],
                ]),
                Util.compose(fn.center)
            )],
            [text("select table")],
            [map(
                Table.new({margin: 5, tableFn: fn.center}, _=> [
                    [btng("fireball"), btng("blob"), btng("cat")],
                ]),
                Util.compose(fn.center)
            )],
            [map(
                Table.new({margin: 5, tableFn: fn.center}, _=> [
                    [btni("left"), btn("close"), btni("right")],
                ]),
                Util.compose(fn.center)
            )],

        ]);

        btnGroup[0].setChecked();
        self.gameStage.add(t);
    },

    newGame(self) {
        M.listenKeys(self);
        M.createPlayMenu(self);

        let {gameStage} = self;
        let grid = self.grid = Grid.new(self.gridArgs);
        gameStage.add(grid);
        Layout.centerOf({}, gameStage.world, grid);
        grid.clearSprites();

        M.testTable(self);

        M.setupPlayer(self);

        let numbers = Rsrc.numbers();
        let zero = numbers.createSprite(0);
        let i = 0;

        //let blah = new PIXI.Text("blah2", { fill: 0x0fff00 });
        //let tableText = Table.column(
        //    {margin: 10}, 
        //    [
        //        map(new PIXI.Text("blah1", { fill: 0xff0000 }), size(80, 80)),
        //        new PIXI.Text("blah3", { fill: 0xff0f00 }),
        //        new PIXI.Text("blah4", { fill: 0x0000ff }),
        //    ]
        //);
        //gameStage.add(tableText);
        let _ = Util.compose;


        let highscore = Highscore.new({
            name: "scratch",
            length: 3,
        });

        //let dialog = InputDialog.new({
        //    textPrompt: "enter something:",
        //    buttonPrompt: "okay",
        //    size: 8,
        //    tap() {
        //        let score = parseInt(dialog.getValue());
        //        if (isNaN(score))
        //            return;
        //        if (highscore.isHighscore(score)) {
        //            highscore.addEntry({
        //                name: "testing",
        //                score,
        //            });
        //        }
        //    }
        //});
        //dialog.x = 20;
        //dialog.y = 150;
        //gameStage.add(dialog);

        {
            let ui = UI.new();
            let {
                img,
                fill, size, map, center, centerX, left, top, right, bottom,
                row, col, textBig, text, textSmall, minWidth, fillX,
                and, btn,slide, root, btnImg,
            } = ui.funcs();
            let slideDialog = SlideDialog.new({
                title: "Help",
                items: [
                    ui.build(_=> row(
                        img("racoon", 200, 200),
                        text(`
                            |Controls:
                            |Use the arrow keys to blah
                            |and some other foo blah 
                            `),
                    )),
                    text("slide 1"),
                    text("slide 2\nasdf asidjfaisdjf jaisdjfaisdf\asidfjasdi"),
                    text("slide 3\nasdfasd\nasdfasdf\nasdfasdfsdf\nxcvxzcv\nasdifjasdf aisdjf\nasdifjasid"),
                ],
            });
            //gameStage.add(slideDialog);
        }

        var texture = PIXI.Texture.fromVideo('static/images/help/drop/test.mp4');
        // create a new Sprite using the video texture (yes it's that easy)
        var videoSprite = new PIXI.Sprite(texture);
        gameStage.addUI(videoSprite);
        texture.baseTexture.source.loop = true;


        //let hsdialog = HighscoreDialog.new({data: highscore.data});
        //gameStage.add(hsdialog);
        //M.createHighscoreDialog(self, highscore.data);
        //M.createHighscoreDialog(self, [
        //    {name: "ronald", score: 123, time: "1:20"}, 
        //    {name: "asdf", score: 456}, 
        //]);

        return;

        let btn = Bouton.new({
            color: 0x0000dd,
            alpha: 1.0,
            width: 28,
            height: 28,
            image: "menu",
            bgcolor: 0xffff00,
            bgcolor2: 0x33aa33,
            //bgalpha: 0,
            bgalpha2: 9,
            //toggle: true,
            tap() {
            },
        });

        let btn2 = Bouton.new({
            color: 0x0000dd,
            alpha: 1.0,
            width: 28,
            height: 28,
            image: "help",
            bgcolor: 0xffff00,
            bgcolor2: 0xff3333,
            //toggle: true,
            tap() {
            },
        });

        let btn3 = Bouton.new({
            color: 0x0000dd,
            alpha: 1.0,
            width: 28,
            height: 32,
            image: "soundon",
            image2: "soundoff",
            bgcolor: 0xffff00,
            bgcolor2: 0xffff00,
            toggle: true,
            tap() {
            },
        });

        let t = Table.row({margin: 15}, [btn, map(btn2, fill(true)), btn3]);
        t.border.width = gameStage.world.width;
        //gameStage.add(t);
        //gameStage.add(btn);
        //gameStage.add(btn2);

        Util.loop(() => {
            //btn._text.style.fontSize++;
        });
        setTimeout(() => {
            //btn.tint = 0xdd0000;
            //btn.width = 200;
            ////btn.height = 200;
            ////btn._rect.color = 0xff0000;
            ////btn._rect.alpha = 0.3;
            //btn.text.text = "";
            //btn.resizeToText();
        }, 800);
    },

    createInputDialog(args = {}) {
        let {
            textColor=0xdddddd,
            charlimit=15,
            textPrompt="Enter input",
            buttonPrompt="confirm",
        } = args;

        let textBox = new PIXI.Text("", {
            fill: textColor,
        });
        let cursor = new PIXI.Text("", {
            fill: textColor,
        });
        let button = Button.new({
            text: buttonPrompt,
            fontSize: 14,
            width: 110,
        });
        textBox.text = "*".repeat(25);
        cursor.text = "|"
        textBox.addChild(cursor);
        Util.loop(async function() {
            await Util.sleep(500);
            cursor.visible = !cursor.visible;
        });
        let inputDialog = Layout.col(
            {
                stretch: false, 
                center: false, 
                color: 0x222222,
                padding: 15,
                alpha: 0.8,
            },
            new PIXI.Text(textPrompt, { fill: textColor }),
            textBox,
            button,
        );
        textBox.text = "";
        cursor.x = textBox.width+1;

        Layout.center({centerY: false}, button);
        window.addEventListener("keydown", function(e) {
            let t = textBox.text;
            if (e.key.length == 1) {
                if (t.length < charlimit)
                    textBox.text += e.key;
            } else if (e.key == "Backspace") {
                textBox.text = t.slice(0, t.length-1);
            }
            cursor.x = textBox.width+1;
            cursor.y = textBox.height-cursor.height;
        });
        return inputDialog; 
    },


    setupPlayer(self) {
        let img = PIXI.Sprite.fromImage("fireball");
        img.width = 200;
        img.height = 200;

        var filter = new PIXI.filters.ColorMatrixFilter();

        let {player, gameStage} = self;

        let nf = new PIXI.filters.NoiseFilter(0.1);
        player.filters = [new PIXI.filters.BlurFilter()];

        //setInterval(() => {
        //    nf.seed = Math.random();
        //}, 16);
        
        //self.gameStage.world.filters = [nf];
        gameStage.add(player);
        gameStage.watch(player);
        Layout.leftOf({}, self.grid, player);

        let step = 5;
        let {up,left,right,down} = self.keys;
        player.width = 30;
        player.height = 30;
        Phys.init(player);
        Phys.applyForce(player, {
            x: 1,
            y: 1.5,
        });
        function loop() {
            //Phys.update(player);
            let v =  {x: 0, y: 0};
            if (up.isDown) {
                v.y = -step;
            } else if (down.isDown) {
                v.y =  step;
            }

            if (left.isDown) {
                v.x = -step;
            } else if (right.isDown) {
                v.x =  step;
            }

            if (Vec.len(v) != 0) {
                self.grid.clearHighlights();
                let points  = self.grid.getIntersectingPoints(player, {x: v.x});
                let points_ = points.filter(p => self.grid.isOccupied(p));
                if (points_.length == 0) {
                    self.grid.highlightIntersectingPoints(player, v);
                    player.x += v.x;
                }
                points  = self.grid.getIntersectingPoints(player, {y: v.y});
                points_ = points.filter(p => self.grid.isOccupied(p));
                if (points_.length == 0) {
                    self.grid.highlightIntersectingPoints(player, v);
                    player.y += v.y;
                }
            }

            //let pos = player.getGlobalPosition();
            //let [gpos] = self.grid.globalToGridPos(pos) || [];
            //if (gpos) {
            //    self.grid.clearHighlights();
            //    let tile = self.grid.tileAt(gpos);
            //    if (PixiUtil.intersects(player, tile)) {
            //        self.grid.hightlightTiles([gpos]);
            //    }
            //    console.log(gpos);
            //}

            requestAnimationFrame(loop);
        }
        loop();
    },


    createAlgebra(self) {
        let {resources} = self;
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
        self.algebra = galge;
    },

    createGraphicTable(self) {
        let table = self.table = GraphicTable.new(self.algebra, {
            tileSize: 30,
            tileSpace: 0.1,
            stretch: 0.8,
            tileMap: function(x, y, id) {
                return null;
            },
        });
        self.gameStage.add(table.grid);
        Layout.leftOf({}, self.grid, table.grid);
        self.table = table;
    },


    start(self) {
        M.init(self);
        M.newGame(self);
        //M.createMainMenu(self);
    },

    createMainMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "Ten24",
            showBg: false,
            textStyle: {
                fill: 0xaa0022,
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

    createWinMenu(self) {
        let {gameStage} = self;
        gameStage.createMenu({
            title: "You win",
            showBg: false,
            textStyle: {
                fill: 0xdddd00,
                fontSize: 90,
            },
            onShow: ()=> {
                M.pause(self);
            },
            onHide: ()=> {
                M.resume(self);
            },
        }, {
            "New Game": ()=>{
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

    stop(self) {
        if (self.grid)
            self.grid.destroy(false);
        if (self.table)
        self.table.grid.destroy(false);
        M.unlistenKeys(self);
        self.actions.stop();
    },

    gameOver(self) {
        self.running = false;
        self.actions.stop();
        M.unlistenKeys(self);
        M.createGameOverMenu(self);
    },

    resume(self) {
        M.listenKeys(self);
    },
    pause(self) {
        M.unlistenKeys(self);
    },

    move(self) {
        let grid = self.grid;
        return self.actions.add(_=> {
            let state = Util.stateName(self.lastDir);
            grid.eachSprite(s => s.setState && s.setState(state));
            return grid.drop({dir: self.lastDir})
        });
    },

    moveUp(self) {
        self.lastDir = {x: 0, y: -1};
        M.move(self);
    },

    moveLeft(self) {
        self.lastDir = {x: -1, y: 0};
        M.move(self);
    },

    moveRight(self) {
        self.lastDir = {x:  1, y: 0};
        M.move(self);
    },

    moveDown(self) {
        self.lastDir = {x: 0, y:  1};
        M.move(self);
    },

    async randomInsert(self, count=2) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 2048;
        let ps = [];
        let points = grid.getEmptyPoints();
        Util.shuffle(points);
        for (let n = 0; n < Math.min(points.length, count); n++) {
            let {x, y} = points[n];
            let elem = "2";
            let sprite = algebra.createSprite(elem);
            grid.setSprite({x, y, sprite});
            ps.push(
                Anima.scale(sprite, { start: 0.8, seconds: 0.2})
            );
        }
        return Promise.all(ps);
        //for (n = 0; n < count; n++) {
        //    let elem = "2";
        //    let sprite = algebra.createSprite(elem);
        //    let [_, i] = Util.randomSelect(grid.tiles, filled, false);
        //    if (i == null) {
        //        return false;
        //    }

        //    filled[i] = true;
        //    filled[elem] = true;
        //    let {x, y} = grid.toXY(i);
        //    if (self.grid.hasSprite({x, y})) {
        //        //n--;
        //        retries--;
        //        if (retries <= 0) {
        //            break;
        //        }
        //    } else {
        //        grid.setSprite({x, y, sprite});
        //        ps.push(
        //            Anima.scale(sprite, { start: 0.8, seconds: 0.2})
        //        );
        //    }
        //}
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
