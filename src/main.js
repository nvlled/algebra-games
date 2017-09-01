let PIXI = require("pixi.js");
let Vec = require("src/Vec");
let Block = require("src/Block");
let Util = require("src/Util");
let Rect = require("src/Rect");
let Phys = require("src/Phys");
let Keyboard = require("src/Keyboard");
let Waypoint = require("src/Waypoint");
let Tileset = require("src/Tileset");
let Inspector = require("src/Inspector");
let PixiUtil = require("src/PixiUtil");
let SpriteSel = require("src/SpriteSel");
let GameArray = require("src/GameArray");
let Algebra = require("src/Algebra");
let GraphicAlgebra = require("src/GraphicAlgebra");
let GraphicTable = require("src/GraphicTable");
let EasingFn = require("src/EasingFn");
let Grid = require("src/Grid");
let Button = require("src/Button");
let TextureSet = require("src/TextureSet");
let AniSprite = require("src/AniSprite");

let Drop = require("src/Drop");
let Ten24 = require("src/Ten24");
let Sudoku = require("src/Sudoku");
let PairSwap = require("src/PairSwap");
let Checkers = require("src/Checkers");

let CharSprites = require("src/CharSprites").new();
let RpgSprites = require("src/RpgSprites").new();
let CoinSprites = require("src/CoinSprites").new();
let MonsterSprites = require("src/MonsterSprites").new();

let Backgrounds = require("src/Backgrounds");
let GridTiles = require("src/GridTiles");

window.globals = {};

let renderer;
async function setup() {
    CharSprites.loadTextures(PIXI.loader);
    CoinSprites.loadTextures(PIXI.loader);
    MonsterSprites.loadTextures(PIXI.loader);
    RpgSprites.loadTextures(PIXI.loader);
    Backgrounds.loadTextures(PIXI.loader);
    GridTiles.loadTextures(PIXI.loader);

    renderer = PIXI.autoDetectRenderer(1000, 800);
    renderer.options.antialias = true;
    renderer.view.onmousedown = e => e.preventDefault();
    document.body.querySelector("div.game").appendChild(renderer.view);
    window.addEventListener("keydown", e => {
        if (e.key == "F5" || e.keyCode == 116) {
            window.location = window.location;
        }
    });

    showLoadingStatus();
    PIXI.loader
        //.use((_, next) => {
        //    setTimeout(next, 1000+Math.random()*3000);
        //})
        .add("fireball", "images/fireball.png")
        .add("people", "images/people.png")
        .add("equals", "images/equals.png")
        .add("cat", "images/cat.png")
        .add("blob", "images/blob.png")

        .load(main);
}

function showLoadingStatus() {
    let loadText = new PIXI.Text('....',{fontFamily : 'Arial', fontSize: 24, fill : 0xeeeeee, align : 'center'});
    let g = new PIXI.Graphics();
    let g2 = new PIXI.Graphics();

    loadText.x = renderer.width/2;
    loadText.y = renderer.height/2;
    loadText.anchor.set(.5, .5);

    g.beginFill(0xaa0000, 0.9);
    g.drawRect(0, 0, 100, 100);
    g.endFill();

    g2.beginFill(0x00dddd, 0.8);
    g2.drawRect(0, 0, 100, 100);
    g2.endFill();
    g2.rotate = Math.PI;
    let loadingScreen = new PIXI.Container();

    loadingScreen.addChild(g);
    loadingScreen.addChild(g2);
    loadingScreen.addChild(loadText);

    g.x = renderer.width/2;
    g.y = renderer.height/2;
    g.pivot.set(50, 50);
    g2.x = renderer.width/2;
    g2.y = renderer.height/2;
    g2.pivot.set(50, 50);
    let ticker = new PIXI.ticker.Ticker(); 
    let loop = () => {
        g.rotation += 0.1;
        g2.rotation += 0.05;
        renderer.render(loadingScreen);
    }
    ticker.add(loop);
    ticker.start();
    PIXI.loader.onProgress.add(loader => {
        loadText.text = "[loading " + Math.floor(PIXI.loader.progress) + "%]";
        renderer.render(loadingScreen);
    });
    PIXI.loader.onComplete.add(loader => {
        ticker.remove(loop);
        ticker.stop();
    });
}

function main() {
    let {
        Sprite,
        Container,
        loader: {resources},
    } = PIXI;

    let gameStage = new Container();
    PIXI.ticker.shared.add(_=> renderer.render(gameStage));

    // fix texture bleed
    for (let rsrc  of Object.values(resources)) {
        rsrc.texture.baseTexture.scaleMode = 
            PIXI.SCALE_MODES.NEAREST;
    }

    let params = Util.parseQueryParams(window.location.search);
    let name = params["game"];

    let games = {
        Drop: {
            module: require("src/Drop"),
            showTable: true,
            tileSize: 35,
            tileSpace: 1,
        },
        Ten24: {
            module: require("src/Ten24"),
            showTable: true,
            tileSize: 64,
            tileSpace: 3,
        },
        Sudoku: {
            module: require("src/Sudoku"),
            showTable: false,
            tileSize: 64,
            tileSpace: 10,
        },
        PairSwap: {
            module: require("src/PairSwap"),
            showTable: true,
            tileSize: 64,
            tileSpace: 10,
        },
        Checkers: {
            module: require("src/Checkers"),
            showTable: true,
            tileSize: 64,
            tileSpace: 3,
        },
        Memrise: {
            module: require("src/Memrise"),
            showTable: true,
            tileSize: 64,
            tileSpace: 10,
        },
    }
    {
        let ul = document.querySelector("ul.games");
        ul.innerHTML = "";
        for (let [name] of Object.entries(games)) {
            let li = document.createElement("li");
            let a = document.createElement("a");
            a.href = "?game="+name;
            a.textContent = name;
            li.appendChild(a);
            ul.appendChild(li);
        }
    }


    let args = games[name];
    if (!args) {
        console.log("unkown game: ", name);
        return;
    }

    // TODO: tile background image
    // TODO: Use shaders for fade in/out effects
    let Game = args.module;

    let tileTexture = GridTiles.randomTexture(resources);

    let game = Game.new({
        //algebra, !!!
        tileSize: args.tileSize,
        tileSpace: args.tileSpace,
        alpha: 0.8,
        tileMap: _=> tileTexture,
    });
    game.init();

    let algebra, table;
    if (game.algebra) {
        algebra = game.algebra;
        table = GraphicTable.new(algebra, {
            tileSize: 45,
            tileSpace: 0.1,
            stretch: 0.8,
            tileMap: function(x, y, id) {
                return null;
            },
        });
    } else {
        ({algebra, table} = initAlgebra({resources}));
        game.algebra = algebra;
    }

    game.start();

    if (args.showTable) {
        game.grid.y = renderer.height/2 - game.grid.height/2;
        game.grid.x = renderer.width/2 - game.grid.width/2 - table.grid.width/2;
        table.grid.x = game.grid.x + game.grid.width;
        table.grid.y = game.grid.y;
    } else {
        game.grid.y = renderer.height/2 - game.grid.height/2;
        game.grid.x = renderer.width/2 - game.grid.width/2;
    }

    var bg = Backgrounds.random(resources);
    bg.width = renderer.width;
    bg.height = renderer.height;

    gameStage.addChild(bg);
    gameStage.addChild(game.grid);
    if (args.showTable)
        gameStage.addChild(table.grid);

    let gameTitle = new PIXI.Text("", {
        fontFamiliy: "Monospace",
        fontSize: 30,
        fill: 0xeeccaa,
        align: "center",
    });
    gameTitle.text = name;
    gameTitle.x = game.grid.x + game.grid.width/2 - gameTitle.width;
    gameTitle.y = game.grid.y - gameTitle.height*2;
    gameStage.addChild(gameTitle);
}

function initAlgebra({resources}) {
    let algebra = Algebra.new({
        identity: 'e',
        //table: randomTable(["a", "b", "c", "d", "e"]),
        table: [
            ["a", "a", "e"],
            ["a", "b", "c"],
            ["a", "c", "b"],
            ["b", "b", "a"],
            ["c", "c", "b"],
            ["d", "d", "b"],
        ],
    });

    let factories = [CharSprites, MonsterSprites, RpgSprites];
    let sprites = factories.reduce((ctors, factory) => {
        return ctors.concat(factory.getConstructors(resources));
    }, []);
    sprites.sort(_=> -1 + Math.random*2);

    let galge = GraphicAlgebra.new({
        algebra,
        textures: Object.assign(
            Util.randomPair(algebra.elems, sprites),
            { equals: resources["equals"].texture,
              [algebra.identity]:  resources["fireball"].texture,
            }
        )
        //textures: Object.assign(
        //    Util.randomPair(algebra.elems, tset.textures),
        //    { equals: resources["equals"].texture }
        //)
    });
    let table = GraphicTable.new(galge, {
        tileSize: 45,
        tileSpace: 0.1,
        stretch: 0.8,
        tileMap: function(x, y, id) {
            return null;
        },
    });
    return {algebra: galge, table: table};
}

function randomTable(numElems, rows=numElems/2) {
    let elems = "abcdefghijklmnopqrstuvwxyz";
    if (elems.length < numElems)
        throw "cannot create table numElems is too large: " + numElems;
    let table = [];
    let rand = _=> Util.randomSelect(elems)[0];
    for (let i = 0; i < rows; i++)
        table.push([rand(), rand(), rand()]);
    return table;
}

function randomAlgebra(numElems, rows) {
    let table = randomTable(numElems, rows); 
    let [row] = Util.randomSelect(table);
    let algebra = Algebra.new({
        identity: Util.randomSelect(row),
        table, 
    });
    return algebra;
}

function checkersGame({renderer, gameStage, algebra}) {
    let {
        Sprite,
        Container,
        loader: {resources},
    } = PIXI;

    let alt = GraphicTable.new(algebra, {
        x: 50, y: 10,
        tileSize: 40,
        tileSpace: 0.1,
        stretch: 0.9,
        //equals: resources["equals"].texture,
        tileMap: function(x, y, id) {
            return null;
        },
    });
    let game = Checkers.new({
        interactive: true,
        algebra,
        x: 50, y: 10,
        tileSize: 70,
        tileSpace: 5,
        alpha: 0.95,
        tileMap: _=> resources["cell3"].texture,
    });
    game.start();

    game.grid.y = renderer.height/2 - game.grid.height/2;
    game.grid.x = renderer.width/2 - game.grid.width/2 + alt.grid.width/2;
    alt.grid.x = game.grid.x - alt.grid.width;
    alt.grid.y = game.grid.y;

    var bg = new PIXI.Sprite(resources["bg5"].texture);
    bg.width = renderer.width;
    bg.height = renderer.height;

    gameStage.addChild(bg);
    gameStage.addChild(alt.grid);
    gameStage.addChild(game.grid);

    //let txts = TextureSet.new({image: resources["M_11"].texture, 
    //    tileWidth: 16, tileHeight: 17.0});

    //let sprite = AniSprite.new({
    //    textureSet: txts,
    //    states: {
    //        idle: [0],
    //        walkRight: [1,5,9],
    //        walkLeft: [3,7,11],
    //    },
    //    animationSpeed: 0.05,
    //});
    //sprite.width = 64;
    //sprite.height = 64;
    //sprite.y = 64;
    //sprite.x = 64;

    //sprite.setState("walkRight");
    //setTimeout(x=>sprite.setState("walkLeft"), 2000);
    //gameStage.addChild(sprite);
}

function pairSwapGame({renderer, gameStage, algebra}) {
    let {
        Sprite,
        Container,
        loader: {resources},
    } = PIXI;

    let alt = GraphicTable.new(algebra, {
        x: 50, y: 10,
        tileSize: 40,
        tileSpace: 0.1,
        stretch: 0.9,
        //equals: resources["equals"].texture,
        tileMap: function(x, y, id) {
            return null;
        },
    });
    let game = PairSwap.new({
        interactive: true,
        algebra,
        x: 50, y: 10,
        tileSize: 70,
        tileSpace: 5,
        alpha: 0.95,
        tileMap: _=> resources["cell4"].texture,
    });
    game.start();

    game.grid.y = renderer.height/2 - game.grid.height/2;
    game.grid.x = renderer.width/2 - game.grid.width/2 + alt.grid.width/2;
    alt.grid.x = game.grid.x - alt.grid.width;
    alt.grid.y = game.grid.y;

    var bg = new PIXI.Sprite(resources["bg4"].texture);
    bg.width = renderer.width;
    bg.height = renderer.height;

    gameStage.addChild(bg);
    gameStage.addChild(alt.grid);
    gameStage.addChild(game.grid);

    //let txts = TextureSet.new({image: resources["M_11"].texture, 
    //    tileWidth: 16, tileHeight: 17.0});

    //let sprite = AniSprite.new({
    //    textureSet: txts,
    //    states: {
    //        idle: [0],
    //        walkRight: [1,5,9],
    //        walkLeft: [3,7,11],
    //    },
    //    animationSpeed: 0.05,
    //});
    //sprite.width = 64;
    //sprite.height = 64;
    //sprite.y = 64;
    //sprite.x = 64;

    //sprite.setState("walkRight");
    //setTimeout(x=>sprite.setState("walkLeft"), 2000);
    //gameStage.addChild(sprite);
}

function sudokuGame({renderer, gameStage, algebra}) {
    let {
        Sprite,
        Container,
        loader: {resources},
    } = PIXI;
    //let alt = GraphicTable.new(galge, {
    //    x: 50, y: 10,
    //    tileSize: 32,
    //    tileSpace: 0.1,
    //    stretch: 0.9,
    //    //equals: resources["equals"].texture,
    //    tileMap: function(x, y, id) {
    //        return null;
    //    },
    //});
    //alt.grid.visible = false;
    let alt = GraphicTable.new(algebra, {
        x: 50, y: 10,
        tileSize: 32,
        tileSpace: 0.1,
        stretch: 0.9,
        //equals: resources["equals"].texture,
        tileMap: function(x, y, id) {
            return null;
        },
    });
    let game = Sudoku.new({
        interactive: true,
        algebra,
        x: 50, y: 10,
        //rows: 20, cols: 10,
        tileSize: 80,
        tileSpace: 5,
        alpha: 0.8,
        tileMap: _=> resources["cell2"].texture,
    });
    game.start();

    game.grid.y = renderer.height/2 - game.grid.height/2;
    //game.grid.x = renderer.width/2 - game.grid.width/2 + alt.grid.width/2;
    game.grid.x = renderer.width/2 - game.grid.width/2;
    //alt.grid.x = game.grid.x - alt.grid.width;
    //alt.grid.y = game.grid.y;

    var bg = new PIXI.Sprite(resources["bg3"].texture);
    bg.width = renderer.width;
    bg.height = renderer.height;

    gameStage.addChild(bg);
    //gameStage.addChild(alt.grid);
    gameStage.addChild(game.grid);
}

function ten24Game({renderer, gameStage, algebra}) {
    let {
        Sprite,
        Container,
        loader: {resources},
    } = PIXI;


    let alt = GraphicTable.new(algebra, {
        x: 50, y: 10,
        tileSize: 32,
        tileSpace: 2,
        stretch: 1,
        //equals: resources["equals"].texture,
        tileMap: function(x, y, id) {
            return null;
        },
    });
    let ten24 = Ten24.new({
        algebra,
        //x: 50, y: 10,
        rows: 5, cols: 5,
        tileSize: 64,
        tileSpace: 2,
        stretch: 0.7,
        tileMap: _=> resources["cell1"].texture,
    });
    var bg = new PIXI.Sprite(resources["bg2"].texture);
    bg.width = renderer.width;
    bg.height = renderer.height;

    ten24.grid.y = renderer.height/2 - ten24.grid.height/2;
    ten24.grid.x = renderer.width/2 - ten24.grid.width/2 - alt.grid.width/2;
    alt.grid.y = ten24.grid.y;

    alt.grid.x = ten24.grid.x + ten24.grid.width;
    ten24.start();

    //let button = Button.create({
    //    text: "new game",
    //    mouseup: () => {
    //        ten24.newGame();
    //    },
    //});
    //button.visible = true;
    //button.x = ten24.grid.x - button.width;
    //button.y = ten24.grid.y;
    //ten24.onGameOver = () => {
    //    button.visible = true;
    //    button.x = -500;
    //    button.y = renderer.height/2;
    //    Waypoint.move(button, {
    //        seconds: 1,
    //        pos: {x: ten24.grid.x + ten24.grid.width/2 - button.width/2, y: renderer.height/2},
    //        easeFn: EasingFn.easeOutElastic,
    //    });
    //}

    gameStage.addChild(bg);
    gameStage.addChild(alt.grid);
    gameStage.addChild(ten24.grid);
    //gameStage.addChild(button);
}

function dropGame({renderer, gameStage, algebra}) {
    let {
        Sprite,
        Container,
        loader: {resources},
    } = PIXI;
    let alt = GraphicTable.new(algebra, {
        x: 50, y: 10,
        tileSize: 32,
        tileSpace: 0.1,
        stretch: 0.9,
        //equals: resources["equals"].texture,
        tileMap: function(x, y, id) {
            return null;
        },
    });
    let game = Drop.new({
        algebra,
        x: 50, y: 10,
        rows: 20, cols: 10,
        tileSize: 32,
        tileSpace: 1,
        alpha: 0.8,
        tileMap: _=> resources["metile"].texture,
    });
    game.start();

    game.grid.y = renderer.height/2 - game.grid.height/2;
    game.grid.x = renderer.width/2 - game.grid.width/2 - alt.grid.width/2;
    alt.grid.x = game.grid.x + game.grid.width;
    alt.grid.y = game.grid.y;

    var bg = new PIXI.Sprite(resources["bg1"].texture);
    bg.width = renderer.width;
    bg.height = renderer.height;

    gameStage.addChild(bg);
    gameStage.addChild(alt.grid);
    gameStage.addChild(game.grid);
}

function notmain() {
    let {
        Sprite,
        Container,
        loader: {resources},
    } = PIXI;

    let garray = GameArray.new({
        rows: 7,
        cols: 5,
        nil: 0,
        data: [
            1, 0, 0, 1, 1,
            0, 1, 0, 0, 0,
            0, 1, 1, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
        ],
    });
    let vec = Vec.create;
    console.log(garray.toString());
    //garray.dropDown({apply: true, dir: vec(0, 1)});
    //console.log(garray.toString());
    console.log("**", garray.get({x: 1, y: 2}));
    garray.dropVertical({apply: true, dir: 1});
    console.log(garray.toString());
    garray.dropVertical({apply: true, dir: -1});
    console.log(garray.toString());
    garray.insert({
        points: Vec.array([2, 3], [2,4], [2,5], [1,4]),
        value: "a",
    });
    console.log(garray.toString());
    let translate = garray.rotate({
        points: Vec.array([2, 3], [2,4], [2,5], [1,4]),
        pivot: 1,
        apply: true,
    });
    let p = translate.map(([_, p]) => p);
    console.log(garray.toString());
    let diff = garray.move({
        points: p,
        dir: {x: 0, y: 1},
        apply: true,
    });
    console.log(garray.toString());

    // pivot = [cols/2, rows/2]
    // block = f(
    //  {cols: 3},
    //  [0, 0, 0,
    //   0, 1, 0,
    //   a, a, a],
    // );
    // block = f(
    //  {cols: 3}
    //  [0, 0, 0, 0],
    // );
    // block = f(
    //  {cols: 3, rotate: false}
    //  [0, 0, 
    //   0, 0] 
    // );
    // grid.move(dir, block) {
    //       points = block.getPoints()// [vec(1,2), (3,4)]
    //       ts = garray.move({points, {y: 1, x: 0})
    //       if (blah)
    //        block.pos = ts[block.pivot][1]
    //  }
    // grid.rotate(dir, block) {
    //       points = block.getPoints()// [vec(1,2), (3,4)]
    //       ts = garray.rotate({points, {y: 1, x: 0})
    //       if (blah)
    //        block.pos = ts[block.pivot][1]
    //  }

    // !!!!!!!!!!!!!!!!
    // !!!!!!!!!!!!!!!!
    // TODO:
    // makePoints({
    //      pivot: [3, 4],
    //      points: [[0, 1], [0,-1], [0, 2]] // relative to pivot
    // })
    //
    // rectPoints({
    //      start: [0, 0],
    //      end: [3, 3],
    // });

    // [0, 0, 0, 0, 
    //  0, 0, 0, 0,
    //  0, 0, 0, 0,
    //  0, 0, 0, 0]
    // spriteA, spriteB, spriteB
    //
    // block = createBlock({
    // })
    //
    // block.set(1, 1, spriteA)
    // block.set(2, 2, spriteB)
    // block.set(3, 2, spriteC)
    // grid.insertBlock(block);
    // [0, 0, 0, 0, 
    //  0, A, C, 0,
    //  0, 0, B, 0,
    //  0, 0, 0, 0]
    //  grid.rotate(block) // includes animation
    //  points_ = garray.rotate({block.points, apply})
    //  block.points = points_;
    //  garray.apply
    // [0, 0, A, 0, 
    //  0, B, C, 0,
    //  0, 0, 0, 0,
    //  0, 0, 0, 0]
    //  grid.rotate(block) 
    //  grid.rotate(block)
    // [0, 0, 0, 0, 
    //  0, 0, C, B,
    //  0, 0, A, 0,
    //  0, 0, 0, 0]
    //  grid.move(block, {y: -1}) // includes animation
    // [0, 0, C, B, 
    //  0, 0, A, 0,
    //  0, 0, 0, 0,
    //  0, 0, 0, 0]
    //  // suppose A,B  is placed outside the board
    // [0, 0, C, 0, 
    //  0, 0, 0, 0,               A
    //  0, 0, 0, 0,
    //  0, 0, 0, 0]        B
    //  grid.moveSpritesToGrid()
    // [0, 0, C, B, 
    //  0, 0, A, 0,
    //  0, 0, 0, 0,
    //  0, 0, 0, 0]

    let renderer = PIXI.autoDetectRenderer(800, 600);

    document.body.appendChild(renderer.view);
    renderer.view.oncontextmenu = e => e.preventDefault();
    let stage = new Container();
    //let worldStage = new Container();
    let worldStage = new Container();
    let uiStage = new Container();

    let zoom = 1.3;
    stage.addChild(worldStage);
    stage.addChild(uiStage);
    worldStage.scale.set(zoom);

    {
        let fpsText = new PIXI.Text();
        fpsText.style.fill = "red";
        let ticker = PIXI.ticker.shared;
        ticker.add(_ => fpsText.text = "FPS:" + Math.round(ticker.FPS));
        uiStage.addChild(fpsText);
    }


    //let bg = new Sprite(resources["sheet1"].textures["dungeon.png"]);
    let bg = new Sprite(resources["bg"].texture);
    bg.scale.set(1.0);

    let cat = new Sprite(resources["sheet1"].textures["explorer.png"]);
    Phys.init(cat);
    cat.stepSize = 1;
    cat.cof = 0.9;
    cat.anchor.set(0.5);
    cat.maxvel = Vec.create(10, 10);

    let camera = movBounds.create(
            cat.x, cat.y, 
            renderer.width*.5, renderer.height*.5, 
            {center: true}
    );
    //cat.bounds = movBounds.create(cat.x, cat.y, 200, 200, {center: true});

    Phys.init(camera);
    //cat.bounds.anchor.set(0.5);
    camera.stepSize = 2;
    camera.cof = 0.8;
    camera.maxvel = Vec.create(10, 10);

    camera.visible = false;
    var sel = SpriteSel.new({camera});

    let cat2 = new Sprite(resources["blob"].texture);
    Phys.init(cat2);
    cat2.stepSize = 1;
    cat2.cof = 0.9;
    cat2.anchor.set(0.5);
    cat2.maxvel = Vec.create(20, 20);
    
    //cat = syncMov(cat, ["x", "y"], cat2);

    let levelBounds = movBounds.create(0, 0, bg.width, bg.height, {fill: 0x880000});
    levelBounds.visible = false;

    cat.x = worldStage.width/2/zoom;
    cat.y = worldStage.height/2/zoom;
    cat2.x = renderer.width/2/zoom + 50;
    cat2.y = renderer.height/2/zoom + 50;

    let world = createTHINGY(worldStage);
    camera.viewport = renderer;
    camera.world = world;

    lookAt(camera, cat);
    //sel.select(cat);

    cat.interactive = true;
    cat2.interactive = true;

    //cat.bounds = syncMov(cat.bounds, ["x", "y"], world);
    //cat.bounds.syncObj = null;
    //cat.bounds.syncWith(world)

    let tile = Tileset.create({
        image: resources.castle_floors.texture, 
        data: resources.lpc_json.data,
        module: PIXI,
    });

    let grid = Grid.new({
        tileWidth: 64,
        tileHeight: 64,
        tileSpace: 10,
        cols: 5, rows: 5,
        tilesArray: [
            1,1,1,
            1,1,1,
            1,1,1,
        ],
        //tileMap: {
        //    1: tile.aaa,
        //},
        tileMap: function(x, y) {
            if (x%2 == 0)
                return tile.aaa;
            return tile.ccc;
        },
        defaultId: 1,
        //x: 100, y: 150,
    });
    grid.visible = false;
    //grid.setTileSize(64, 64);
    //console.log(grid.tileWidth, grid.__target.width);
    //grid.width = 350;
    ////grid.height = 240;
    //console.log(grid.tileWidth, grid.__target.width);

    //grid.test();
    //grid.setSprite(4, 1, cat2, true);
    grid.x = 50;
    grid.y = 50;
    //grid.y = 150;

    //grid.setTileSize(64, 64);
    //grid.arrangeTiles();

    //grid.A = 100;

    lookAt(camera, cat);

    // prox(grid, Grid)
    // grid.setSize(100, 100) => Grid.setSize(grid)


    //grid.XYZ = 1000;

    //grid.setItem(i, j, obj);
    //grid.addItem(i, j, obj);

    let inspector = Inspector.new(new PIXI.Text());
    inspector.setColor(0xddaa00);
    inspector.add(world, ["x", "y"], "world");
    inspector.add(camera, ["x", "y"], "camera");
    inspector.add(cat, ["x", "y"], "player");
    inspector.add(grid, ["x", "y"], "grid");
    inspector.x = 20;
    inspector.y = 20;
    //uiStage.addChild(inspector);

    worldStage.addChild(bg);
    worldStage.addChild(grid);
    worldStage.addChild(levelBounds);
    worldStage.addChild(cat);
    worldStage.addChild(cat2);
    worldStage.addChild(camera);
    worldStage.interactive = true;

    
    // move, rotate, drop
    // move(grid, [1, 0], [[1,1],[[2,2], [3,3]]]);
    // move(grid, [2, 0], [[1,1],[[2,2], [3,3]]]);
    //  == { pointsMoved: [...], trail: [[1,2,] -> [2,1]] }
    //

    worldStage.on("rightclick", function(e) {
        e.stopPropagation();
        //console.log(e);
        let {x, y} = e.data.global;
        let {x:sx, y:sy} = world.scale;
        let [gx,gy] = [(x+world.x)/sx, (y+world.y)/sy];
        //PixiUtil.point(worldStage, gx, gy);
        let sprite = sel.getSelected();
        if (sprite) {
            //moveStraight(sprite, Vec.create(gx, gy), 5);
            Waypoint.add(sprite, 
                    {pos: Vec.create(gx, gy), speed: 200,
                     easeFn: EasingFn.inOutQuart});
            Waypoint.start(sprite);
            //Waypoint.end = stopSync
        } else {
        }

        // Sprite Group movements
        //  Sync, Follow
        // Sync.to(sprite1, sprite2)
        // Sync.to(sprite1, sprite3)
        // Sync.to(sprite1, sprite4)
        // ...
        // Sync.to(sprite3, sprite4)
    });
    sel.onSpriteSelect = sprite => {
        lookAt(camera, sprite);
    }
    sel.addClickHandler(cat, camera);
    sel.addClickHandler(cat2, camera);
    sel.addRegionHandler(worldStage);

    //grid.setSprite(1, 1, cat,  false);
    //grid.setSprite(3, 3, cat2, false);
    grid.setSprite({
        x: 3, y: 3,
        sprite: cat2,
        fit: false,
    });
    grid.setSprite({
        x: 1, y: 1,
        sprite: cat,
        fit: false,
    });
    //grid.move({src: vec(3, 3), dest: vec(4,4)});
    //grid.move({src: vec(1, 1), dest: vec(4,2)});

    //Waypoint.move(cat, {
    //    pos: vec(450, 250), seconds: 1,
    //    easeFn: EasingFn.easeOutElastic,
    //}).then(_=> console.log("X"));

    let block = Block.create({
        pos: {x: 1, y: 1},
        data: [
            cat, cat2,
        ],
        cols: 2,
        rows: 1,
    });
    let algebra = Algebra.new({
        table: [
            ['a', 'a', 'b'],
            ['b', 'c', 'a'],
            ['c', 'c', 'c'],
        ],
    });

    let galge = GraphicAlgebra.new({
        algebra,
        textures: {
            a:  cat.texture,
            b:  cat2.texture,
            c:  resources["cat"].texture,
            equals: resources["equals"].texture,
            //op: resources["equals"].texture,
            //[GraphicAlgebra.EQUALS]: ,
        }
    });

    console.log("---------", galge.tileMap);

    //let algrid = Grid.new({
    //    cols: 3, rows: 3,
    //    tileSpace: 3,
    //    tileMap: function(x, y) {
    //        let elem = algebra.elemAt(x, y);
    //        return galge.getTexture(elem);
    //    },
    //});
    let alt = GraphicTable.new(galge, {
        x: 50, y: 90,
        tileSize: 60,
        tileSpace: 0.1,
        stretch: 0.7,
        //equals: resources["equals"].texture,
        tileMap: function(x, y, id) {
            if (Math.random() < 0.5)
                return tile.ccc;
            return tile.aaa;
        },
    });
    worldStage.addChild(alt.grid);
    let equals = new PIXI.Sprite(resources["equals"].texture);
    //world.addChild(equals);


    // let algebra = Algebra.create({
    //      table: [
    //          [a,b,c],
    //          [c,b,c],
    //          [a,c,c],
    //      ]
    // });
    // let ga = GraphicAlgebra({
    //      algebra, 
    //      {a: _=> new sprite1}, 
    //      {b: _=> new sprite2}, 
    //      {c: _=> new sprite3}, 
    // });
    // let z = ag.apply('a', 'b');
    // sprite = ag.createSprite(z);
    // let dropout = Dropout.create(ga);

    grid.insertBlock(block);
    //grid.placeSpritesToGrid()
    //    .then(_=> grid.rotateBlock({ dir: 1, block}))
    //    .then(_=> grid.moveBlock({ dir: {x: 1, y: 0}, block}))
    //    .then(_=> grid.rotateBlock({ dir: -1, block}))
    //    .then(_=> grid.rotateBlock({ dir: 1, block}))
    //    .then(_=> grid.moveBlock({ dir: {x: 2, y: 0}, block}))
    //    .then(_=> grid.rotateBlock({ dir: 1, block}));


    function thing() {
        return new Promise(resolve => 
            setTimeout(_=> resolve(1234), 3000)
        );
    }

    //async function blah() {
    //    await grid.placeSpritesToGrid();
    //    let x = await thing();
    //    console.log("X", x);
    //    await grid.rotateBlock({ dir: 1, block});
    //    await grid.moveBlock({ dir: {x: 1, y: 0}, block});
    //    await grid.rotateBlock({ dir: -1, block});
    //    await grid.rotateBlock({ dir: 1, block});
    //    await grid.moveBlock({ dir: {x: 2, y: 0}, block});
    //    await grid.rotateBlock({ dir: 1, block});
    //}
    //blah();

    //grid.setSprite(3, 3, cat2, true);
    //
    //grid.move(gpos(3, 3), gpos(1, 0));

    //sel.select(cat);

    // TODO
    // move(sprite, pos, {
    //      maxvel: Vec.create(10, 10),
    //      cof: 5,
    //      stepSize: 10,
    // });

    //move(cat, grid.tileMidXY(4, 4),
    //  {
    //      mass: 100,
    //      maxvel: Vec.create(40, 40),
    //  });

    // Just to defend my seemingly lack of ability
    // pursue my goal without deviations,
    // I actually do need to design a flexible 
    // gameframework so since I need to be able
    // to make gameplays on a whim.


    // TODO: drag and drop

    function moveStraight(sprite, destPos, stepSize=5) {
        let tick = new PIXI.ticker.Ticker();
        let dir = Vec.copy(destPos).sub(sprite.position);
        let dist = dir.len();
        dir.norm().mul(stepSize);

        tick.add(() => {
            Vec.add(sprite.position, dir);
            dist -= stepSize;
            if (dist <= 0) {
                tick.stop();
                sprite.position = destPos;
                console.log("done");
            }
        });
        tick.start();
    }

    //let vec = Vec.create;
    //let dist = Vec.create(1,2);
    //console.log(Vec.new(dist));
    //Vec.new(dist)
    //    .sub(Vec.create(2,1))
    //    .norm();
    //console.log(dist);

    // module has function with first arg as the context

    function move(sprite, destPos, phys) {
        // phys could also be a function
        // linear function:  move m times 
        //      where n = distance between points
        //            m = n/a

        let tick = new PIXI.ticker.Ticker();
        phys = Phys.init(phys);
        let target = Phys.init({
            mass: 1,
            position: destPos,
        });
        //let lastpos = Vec.copy(destPos);
        tick.add(() => {
            let force = Phys.attractTo(phys, target);
            //force.neg();
            Phys.applyForce(phys, force);
            Phys.update(sprite, phys);
            phys.position.x = sprite.x;
            phys.position.y = sprite.y;

            //v.x = sprite.x;
            //v.y = sprite.y;

            let dst = Vec.copy(destPos);
            let delta = Vec.len(Vec.sub(dst, sprite.position));
            //let delta = Vec.len(Vec.sub(lastpos, sprite.position));
            //console.log(delta, lastpos, sprite.position);
            //if (Math.abs(delta) < 0.1) {
            if (Math.abs(delta) < 1.0) {
                tick.stop();
                //Grid.setSprite(self, pos_.i, pos_.j, sprite);
                console.log("done moving");
            }
            //lastpos = Vec.copy(sprite.position);
        }, null, 0);
        tick.start();
    }

    // fit to screen
    //stage.width = renderer.width;
    //stage.height = renderer.height;

    //let map = new TiledMap('tilemap1');
    //window.map = map;
    //map.scale.set(2);
    //worldStage.addChild(map);

    //var tileMap = new PIXI.extras.TiledMap("map.tmx");
    //worldStage.addChild(tileMap);
    let state = {
        cat,
        cat2, 
        renderer,
        stage,
        worldStage,
        uiStage,
        levelBounds,
        inspector,
        world,
        lookAt,
        camera,
        sel,
        grid,

        Grid,
        Vec,
        block,

        sheet1: resources.sheet1,
        lpctiles: resources.lpctiles,

        //followCam: cat,

        //zoom, // yey for hacking to workdom
    }
    window.state = state;
    Object.assign(window, state);

    handleKeys(state);
    startGameLoop(state)
    renderer.render(stage);
}

function lookAt(cam, obj) {
    let {width: w, height: h} = cam;
    let {world, viewport} = cam;
    if (world && viewport) {
        //world.x = (obj.x - viewport.width/2);
        //world.y = (obj.y - viewport.height/2);
        world.x = obj.x*world.scale.x - viewport.width/2;
        world.y = obj.y*world.scale.y - viewport.height/2;
    }
    cam.x = (obj.x - w/2);
    cam.y = (obj.y - h/2);
}

function startGameLoop(state) {
    let {
        cat, 
        renderer, 
        stage, 
        worldStage, 
        keys,
        levelBounds,
        inspector,
        world,
        camera,
        //followCam,
        //zoom,
    } = state;

    let pushForce = Vec.create(0, 0);
    //Phys.addForce(cat, pushForce);
    //Phys.addForce(camera, pushForce); //!!!!!!!!!!

    let camsync = syncPos(world, camera); 

    function gameLoop() {
        let followCam = sel.getSelected();

        camsync.setLastPos();
        Vec.mul(pushForce, 0);

        //console.log(cat.vel.x, cat.vel.y, cat.cof);
        if (keys.left.isDown) {
            pushForce.x = -cat.stepSize;
            //Phys.applyForce(cat, Vec.create(-cat.stepSize, 0));
        } else if (keys.right.isDown) {
            pushForce.x = cat.stepSize;
            //Phys.applyForce(cat, Vec.create( cat.stepSize, 0));
        }
        if (keys.down.isDown) {
            pushForce.y = cat.stepSize;
            //Phys.applyForce(cat, Vec.create(0, cat.stepSize));
        } else if (keys.up.isDown) {
            pushForce.y = -cat.stepSize;
            //Phys.applyForce(cat, Vec.create(0,-cat.stepSize));
        }
        Vec.norm(pushForce);

        let diff;
        //let prevPos = Vec.copy(cat.position);

        if (followCam) {
            Phys.applyForce(followCam, pushForce);
            Phys.update(followCam);
            //if (followCam.parent == world) {
                Phys.update(camera);

                // hys.update(cat, phys)
                //Phys.update(cat.bounds, phys)

                //let diff = Vec.sub(Vec.copy(cat.position), prevPos); 

                movBounds.restrict(followCam, levelBounds);
                movBounds.restrict(camera, levelBounds);

                //prevPos = Vec.copy(cat.bounds.position);
                // lock cam to obj
                movBounds.contain(followCam, camera);
            //}
        }


        //diff = Vec.sub(Vec.copy(cat.bounds.position), prevPos); 
        
        //world.x += diff.x*zoom;
        //world.y += diff.y*zoom;

        camsync.update();
        // world.x += diff.x
        // world.x += diff.y

        //movBounds.clamp(worldStage,
                //vec.create(
        // (0, 0) -> (-w, -h)
        
        // !!!!!!!!!!
        // avoid allocating here
        movBounds.restrict(world, 
                new PIXI.Rectangle(0, 0, 
                    worldStage.width*2 - renderer.width, 
                    worldStage.height*2 - renderer.height)); 

                //new PIXI.Rectangle(0,0, 0,0));
                //new PIXI.Rectangle(-worldStage.width, -worldStage.height, 0, 0));

        //let a = wrap(cat, Rect);
        //let b = wrap(cat.bounds, Rect);
        //console.log(extract(a, "left", "up", "down", "right"));
        //console.log(extract(b, "left", "up", "down", "right"));
        //console.log("--------");

        inspector.update();
        //sel.update();

        //requestAnimationFrame(gameLoop);
        renderer.render(stage);
    }
    let tick = new PIXI.ticker.Ticker();
    tick.add(gameLoop);
    tick.start();
    //gameLoop();
}

function createTHINGY(world) {
    return new Proxy(
            world, 
            {
                get(obj, name) {
                    if (name == "x" || name == "y")
                        return -obj[name];
                    return obj[name];
                },// neat
                set(target, k, v, obj) {
                    target[k] = -v;
                    return true;
                }
            });
}

//function syncMov(obj, props, syncObj) {
//    let prox = new Proxy(obj,
//            {
//                set(target, k, v, obj) {
//                    if (k == "x")
//                        console.log(k, v);
//                    if (props.indexOf(k) < 0) {
//                        target[k] = v;
//                        return true;
//                    }
//                    let d = v-target[k];
//                    target[k] = v;
//
//                    syncObj = prox.syncObj;
//                    if (syncObj) {
//                        let s = syncObj.scale[k] || 1;
//                        syncObj[k] += d*s;
//                    }
//                    return true;
//                },
//            });
//    prox.syncObj = syncObj;
//    prox.original = obj;
//    return prox;
//}

// using proxy here may be inefficient
//camsync = syncPos(cat,bounds, world.x);
//or
// camsync.update()
function syncPos(obj, ref) {
    let {x, y} = ref;
    return {
        update() {
            let {x:sx, y: sy} = obj.scale;
            let {x: x_, y: y_} = ref;
            obj.x += (x_-x)*sx;
            obj.y += (y_-y)*sy;
            [x,y] = [x_, y_];
        },
        setLastPos() {
            ({x, y} = ref);
        },
    }
}

function handleKeys(state) {
    Keyboard(116).press = function() {
        window.location = window.location;
    }
    Keyboard(76).press = function(e) {
        if (e.ctrlKey) {
            window.location = window.location;
        }
    }

    let left = Keyboard(37);
    let up = Keyboard(38);
    let right = Keyboard(39);
    let down = Keyboard(40);

    state.keys = {
        left, right, up, down
    }

    let cat = state.cat;
    Keyboard(79).press = function(e) {
        state.worldStage.scale.x += 0.1;
        state.worldStage.scale.y += 0.1;
    }
    Keyboard(80).press = function(e) {
        state.worldStage.scale.x -= 0.1;
        state.worldStage.scale.y -= 0.1;
    }


    //left.press = function() { cat.acl.x = -d }
    //right.press = function() { cat.acl.x = d }
}


let movBounds = {
    create: function(x, y, w, h, args={}) {
        let {
            fill = 0x66ccff, 
            alpha = 0.5,
            center = false,
        } = args;

        let g = new PIXI.Graphics();
        g.beginFill(fill, alpha);
        g.lineStyle(0, 0xff3300, 1);
        g.drawRect(0, 0, w, h);
        g.endFill();

        if (center) {
            g.x = x - w/2;
            g.y = y - h/2;
        } else {
            g.x = x;
            g.y = y;
        }

        g.width = w;
        g.height = h;

        return g;
    },

    clamp: function(obj, lu, rd) {
        let pos = Util.wrap(obj, Rect);
        if (pos.right > rd.x)
            pos.right = rd.x;
        else if (pos.left < lu.x)
            pos.left = lu.x;
    },

    restrict: function(obj, container) {
        let pos = Util.wrap(obj, Rect);
        let r = Util.wrap(container, Rect);

        if (pos.right > r.right)
            pos.right = r.right;
        else if (pos.left < r.left)
            pos.left = r.left;

        if (pos.down > r.down)
            pos.down = r.down;
        else if (pos.up < r.up)
            pos.up = r.up;
    },

    contain: function(obj, bounds) {
        //let bounds = obj.bounds;
        //let {left, right, top, down} = Rect;
        //if (left(obj) < left(bounds))
        //    left(bounds, left(obj));
        obj = Util.wrap(obj, Rect);
        bounds = Util.wrap(bounds, Rect);

        if (obj.left < bounds.left)
            bounds.left = obj.left;
        else if (obj.right > bounds.right)
            bounds.right = obj.right;

        if (obj.up < bounds.up)
            bounds.up = obj.up;
        else if (obj.down > bounds.down)
            bounds.down = obj.down;
    },
}

function topLeftPos(obj) {
    let {x, y, width, height, anchor} = obj;
    if (!anchor)
        anchor = {x: 0, y: 0};
    x = x - anchor.x*width;
    y = y - anchor.y*height;
    return Vec.create(x, y);
}
window.onload = setup

