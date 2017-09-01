
let Actions = require("src/Actions");
let Algebra = require("src/Algebra");
let GraphicAlgebra = require("src/GraphicAlgebra");
let Anima = require("src/Anima");
let Waypoint = require("src/Waypoint");
let Util = require("src/Util");
let Vec = require("src/Vec");
let Grid = require("src/Grid");
let Block = require("src/Block");
let Keyboard = require("src/Keyboard");
let EasingFn = require("src/EasingFn");
let PIXI = require("pixi.js");

let GridTiles = require("src/GridTiles");

let TEAM = Symbol();
let TEAM1 = Symbol("T1");
let TEAM2 = Symbol("T2");

let M = {
    create({
        algebra,
        rows=8,
        cols=8,
        tileSize,
        tileSpace,
        //tileMap,
        x, y,
        speed=900,
        stretch=.8,
        //interactive,
        alpha,

        onGameOver=()=>{},
    } = {}) {
        let {randomTexture} = GridTiles;
        let tile1 = randomTexture(PIXI.loader.resources);
        let tile2 = randomTexture(PIXI.loader.resources, new WeakSet([tile1]));

        let tileMap = (x, y) => {
            if (y%2 == 0) { 
                if (x%2 == 0)
                    return tile1;
                return tile2;
            } else {
                if (x%2 == 0)
                    return tile2;
                return tile1;
            }
        }

        let grid = Grid.new({
            x, y, rows, cols, tileSize, tileSpace, tileMap,
            speed, stretch, interactive: true, alpha,
        });
        grid.setInteractive();
        
        let self = {
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
            actions: Actions.new({throttle: 350}),
            fixed: {},
        };

        return self;
    },

    async init(self) {
        M.setupTextures(self);

        self.grid.onTileClick = (pos) => {
            for (let p of points) {
                self.grid.tileAt(p).tint = 0xffffff;
            }
        }

        let srcPos = null;
        let dstPos = null;
        let sprite = null;
        let points = [];
        self.grid.onTileDown = (pos) => {
            sprite = self.grid.spriteAt(pos);
            if (!sprite)
                return;
            points = M.listNextPositions(self, pos);
            for (let p of points) {
                self.grid.tileAt(p).tint = 0xff0000;
            }
            srcPos = pos;
        }
        self.grid.onTileDrag = async (pos, __) => {
            for (let p of points) {
                self.grid.tileAt(p).tint = 0xffffff;
            }
            if (Vec.equals(srcPos, dstPos)) {
                return;
            }
            let dir = Vec.new(dstPos).sub(srcPos);
            let pos_ = Vec.new(pos).add(Vec.new(dir).idiv(2));
            let sprite_ = self.grid.spriteAt(pos_);
            if (sprite_ && Vec.dist(dstPos, srcPos) == 4) {

                // TODO: add textures for z or team3
                let zSprite = self.algebra.applySprites(sprite, sprite_);
                self.grid.setSprite({sprite, x: srcPos.x, y: srcPos.y});
                if (zSprite) {
                    zSprite[TEAM] = sprite[TEAM];
                    //M.tintSprite(self, zSprite);

                    Anima.boom(sprite_);
                    await self.grid.move({src: srcPos, dest: dstPos});
                    self.grid.removeSprite(pos_);
                    self.grid.removeSprite(srcPos);
                    self.grid.setSprite({sprite: zSprite, x: dstPos.x, y: dstPos.y});
                    Anima.fade(sprite, {end: 0});
                    await Anima.fade(zSprite, {end: 1, start: 0});
                    sprite_.destroy();
                    sprite.destroy();
                } else {
                    let pos = Vec.new(sprite.position);
                    await Anima.move(sprite, {end: sprite_.position, seconds: 0.1});
                    await Anima.move(sprite, {end: pos, seconds: 0.1});
                }
            }
        }
        self.grid.onTileDragging = (pos, pos_) => {
            if (!sprite || !pos_)
                return;
            for (let p of points) {
                if (Vec.equals(p, pos_)) {
                    self.grid.setSprite({sprite, x: pos_.x, y: pos_.y});
                    dstPos  = pos_;
                    break;
                }
            }
        }
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
        self.grid.clearSprites();
        M.start(self);
    },

    start(self) {
        M.randomize(self);
    },

    setupTextures(self) {
        let MonsterSprites = require("src/MonsterSprites").new();
        let CharSprites = require("src/CharSprites").new();

        let nchars = 6;
        let resources = PIXI.loader.resources;
        let monsters = MonsterSprites.getConstructors(resources);
        let chars = CharSprites.getConstructors(resources);
        let elems = Util.alphanum.split("").slice(0, nchars);

        let i = Math.floor(nchars/2);
        self.team1Elems = elems.slice(0, i);
        self.team2Elems = elems.slice(i);

        let alg = Algebra.new({
            table: M.randomTable(self),
            abelian: false,
        });

        let team1 = Util.randomPair(self.team1Elems, monsters);
        let team2 = Util.randomPair(self.team2Elems, chars);

        let galge = GraphicAlgebra.new({
            algebra: alg,
            textures: Object.assign({}, team1, team2),
        });
        self.algebra = galge;
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

    randomize(self) {
        let {algebra, grid} = self;
        let filled = {};
        let retries = 128;
        let elems = algebra.getElems();

        self.fixed = {};
        let rows = (grid.rows/2)-1;
        let cols = grid.cols;

        let fill = (startRow, team, tint) => {
            for (let y = startRow; y < startRow+rows; y++) {
                let x = 0;
                if (y%2 != 0)
                    x++;
                for (; x < cols; x+=2) {
                    let elems = team == TEAM1 ? 
                        self.team1Elems : self.team2Elems;
                    let [elem] = Util.randomSelect(elems);
                    let sprite = algebra.createSprite(elem);
                    sprite[TEAM] = team;
                    M.tintSprite(self, sprite);
                    grid.setSprite({sprite, x, y});
                }
            }
        }
        fill(0, TEAM1);
        fill(grid.rows-rows, TEAM2);
    },

    combineElements(self) {
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
    }
}

M.new = Util.constructor(M);
module.exports = M;
