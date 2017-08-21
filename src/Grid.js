let Util = require("src/Util"); 
let GameArray = require("src/GameArray"); 
let Waypoint = require("src/Waypoint"); 
let Vec = require("src/Vec"); 
let Block = require("src/Block"); 
let Phys = require("src/Phys"); 
let PixiUtil = require("src/PixiUtil");
let PIXI = require("pixi.js");
let {markGetterSetter} = Util;

function indexToXY({i, cols}) {
    return {
        x: i % cols,
        y: Math.floor(i / cols),
    }
}

let M = {
    new(...args) {
        //return Util.prox(M.create(...args), M.Proto);
        //return Util.prox(M.create(...args), M);
        return Util.wrap(M.create(...args), M.Proto);
    },
    create({
        x=0,y=0,
        cols,
        rows,
        tilesArray=[],
        tileMap,
        container,
        tileSize=32,
        tileWidth=tileSize||32,
        tileHeight=tileSize||32,
        tileSpace=1,
        defaultId=0,
        nil,
        fit=true,
        stretch=1.0,
        speed=300,
        alpha,
    }={}) {
        let {Container, Sprite, Rectangle} = PIXI;
        if (!container)
            container = new PIXI.Container();

        let tiles = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let idx = i*cols + j;
                let id = tilesArray[idx] || defaultId;

                let texture = null;
                if (typeof tileMap == "function") {
                    texture = tileMap(j, i, id) || nil;
                } else if (tileMap) {
                    texture = tileMap[id] || nil;
                } else {
                    texture = nil;
                }

                let sprite = new Sprite(texture);
                container.addChild(sprite);
                sprite.width = tileWidth;
                sprite.height = tileHeight;
                sprite.x = (j * (tileWidth+tileSpace));
                sprite.y = (i * (tileHeight+tileSpace));
                sprite.alpha = alpha;
                //sprite.anchor.set(0.5);
                tiles.push(sprite);
            }
        }

        let gameArray = GameArray.new({rows, cols});

        //container.x = x;
        //container.y = y;
        Object.assign(container, {
            x, y,
            speed,
            cols, rows, 
            tileWidth, tileHeight, tileSpace,
            fit, stretch,
            //tilesArray, 
            tiles,
            //sprites: [],
            //sprites: gameArray.data,
            gameArray,
            operations: [],
            actions: [],
        });
        return container;
    },

    eachRowIndex(self, fn) {
        for (let y = 0; y < self.rows; y++)
            fn(y);
    },

    arrangeTiles(self) {
        let {
            rows, cols, 
            tiles, tileSpace,
            tileWidth, tileHeight,
        } = self;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let idx = i*cols + j;
                let sprite = tiles[idx];

                sprite.width = tileWidth;
                sprite.height = tileHeight;
                sprite.x = (j * (tileWidth+tileSpace));
                sprite.y = (i * (tileHeight+tileSpace));
            }
        }
    },

    setGridSize(self, width, height) {
        self.tileWidth = width/self.cols - self.tileSpace;
        self.tileHeight = height/self.rows - self.tileSpace;
        M.arrangeTiles(self);
    },

    setTileSize(self, width, height) {
        self.tileWidth = width;
        self.tileHeight = height;
        M.arrangeTiles(self);
    },

    width: markGetterSetter((self, val) => {
        if (val) {
            self.tileWidth = val/self.cols - self.tileSpace;
            M.arrangeTiles(self);
        }
        return (self.tileWidth+self.tileSpace)*self.cols;
    }),

    height: markGetterSetter((self, val) => {
        if (val) {
            self.tileHeight = val/self.rows - self.tileSpace;
            M.arrangeTiles(self);
        }
        return (self.tileHeight+self.tileSpace)*self.rows;
    }),


    clearSprites(self) {
        for (let sprite of self.gameArray.data) {
            if (sprite && sprite.parent == self)
                self.removeChild(sprite);
        }
        self.gameArray.data.splice(0);
    },

    removeSprite(self, {x, y}) {
        //let tile = M.tileAt(self, {x, y});
        //if (!tile) 
        //    return;
        //let idx = y*self.cols + x;
        //self.sprites[idx] = null;
        self.gameArray.remove({x, y});
    },

    setSprite(self, {x, y, sprite, fit, stretch}) {
        fit = Util.or(fit, self.fit);
        stretch = Util.or(stretch, self.stretch);

        let tile = M.tileAt(self, {x, y});
        if (!tile) 
            return;

        let sprites = self.gameArray.data;
        let i = M.indexOfSprite(self, sprite);
        if (i >= 0)
            sprites[i] = null;

        let idx = y*self.cols + x;
        sprites[idx] = sprite;
        if (!sprite)
            return;


        //if (self.gameArray.outbounds({x, y}))
        //    return;
        if (sprite.parent == null)
            self.addChild(sprite);

        if (fit) {
            sprite.width = tile.width * stretch;
            sprite.height = tile.height * stretch;
        }
        let {x: sx, y: sy} = M.getSpritePos(self, {x, y, sprite});
        sprite.x = sx;
        sprite.y = sy;
    },

    getSpritePos(self, {x, y, sprite}) {
        let tile = M.tileAt(self, {x, y});
        if (!tile)
            return;
        let {x: ax, y: ay} = sprite && sprite.anchor || {x: 0, y: 0};
        let {x: baseX, y: baseY} = self;
        if (sprite.parent == self)
            [baseX, baseY] = [0, 0];

        return {
            x: baseX + tile.x + ax*(tile.width) + (tile.width-sprite.width)/2,
            y: baseY + tile.y + ay*(tile.height)+ (tile.height-sprite.height)/2,
        }
    },

    tileMidXY(self, {x, y}) {
        let tile = M.tileAt(self, {x, y});
        let {x: tx, y: ty} = tile.getGlobalPosition();
        return Vec.create(
            tx+tile.width/2, 
            ty+tile.height/2,
        );
    },

    //addSprite(self, {x, y, sprite}) {
    //    let tile = M.tileAt(self, {x, y});
    //    if (tile) {
    //        tile.addChild(sprite);
    //    }
    //},
    //removeSprite(self, {x, y, sprite}) {
    //    let tile = M.tileAt(self, {x, y});
    //    if (tile) {
    //        tile.removeChild(sprite);
    //    }
    //},

    tileAt(self, {x, y}) {
        let idx = y*self.cols + x;
        return self.tiles[idx];
    },

    spriteAt(self, {x, y}) {
        if (self.gameArray.outbounds({x, y}))
            return null;
        let idx = y*self.cols + x;
        return self.gameArray.data[idx];
    },

    hasSprite(self, {x, y}) {
        return self.gameArray.isOccupied({x, y});
    },

    insertBlock(self, block, pos={x: 0, y: 0}) {
        let basePos = block.points[0];
        let [dx, dy] = [0, 0];
        if (basePos.x == 0 && basePos.y == 0) {
            dx = pos.x;
            dy = pos.y;
        }

        let i = 0;
        for (let p of block.points) {
            p.x += dx;
            p.y += dy;
            let sprite = block.data[i];
            if (sprite)
                M.setSprite(self, {x: p.x, y: p.y, sprite});
            else
                M.removeSprite(self, {x: p.x, y: p.y});
            i++;
        }
    },

    performBlockAction(self,  block, action) {
        let {gameArray} = self;
        let paths = action();

        if (paths.length > 0) {
            //block.points = paths.map(([_, p]) => p);
            let promises =  [];
            let points_ = [];
            for (let path of paths) {
                if (path == null)
                    continue;
                let [p, p_] = path;
                promises.push(M.move(self, {src: p, dest: p_, force: true}));
                points_.push(p_);
            }
            return Promise.all(promises)
                .then(_=> {
                    //gameArray.detachPoints(block.points);
                    gameArray.apply(paths);
                    if (block)
                        block.points = points_;
                    //M.insertBlock(self, block);
                    return Promise.resolve(points_);
                });
        }
        return Promise.resolve(false);
    },

    moveBlock(self, {
        dir={x: 0, y: 0},
        block,
    } = {}) {
        // update block points
        return M.performBlockAction(self, 
            block,
            _=> self.gameArray.move({
                dir, 
                rigid: block.rigid,
                points: block.points,
            })
        );
    },

    moveToCollision(self, {
        dir={x: 0, y: 0},
        block,
    }) {
        return M.performBlockAction(self, 
            block,
            _=> self.gameArray.moveToCollision({
                dir, 
                rigid: block.rigid,
                points: block.points,
            })
        );
    },

    rotateBlock(self, {
        dir=1,
        block,
    } = {}) {
        if (block.noRotate)
            return Promise.resolve();
        return M.performBlockAction(self, 
            block,
            _=> self.gameArray.rotate({
                dir, 
                points: block.points,
                pivot: block.pivot,
            })
        );
    },

    dropVertical(self, {
        dir=1,
    } = {}) {
        return M.performBlockAction(self, 
            null,
            _ => self.gameArray.dropVertical({
                dir, 
            })
        );
    },

    dropHorizontal(self, {
        dir=1,
    } = {}) {
        return M.performBlockAction(self, 
            null,
            _ => self.gameArray.dropHorizontal({
                dir, 
            })
        );
    },

    placeSpritesToGrid(self) {
        let i = -1;
        let promises = [];
        let {gameArray} = self;
        for (let sprite of gameArray.data) {
            i++;
            if (!sprite)
                continue;
            let {x, y} = indexToXY({i, cols: self.cols});
            ({x, y} = M.getSpritePos(self, {x, y, sprite}));
            promises.push(Waypoint.move(sprite, { pos: {x, y}}));
        }
        return Promise.all(promises);
    },

    move(self, {src, dest, force=false}) {
        let sprite = M.spriteAt(self, {x: src.x, y: src.y});
        if (!sprite)
            return;
        if (self.gameArray.isOccupied({x: dest.x, y: dest.y}) && !force) {
            console.log("move cancelled, tile is occupied");
            return;
        }

        let getpos = M.getSpritePos;
        let pos = getpos(self, {sprite, x: src.x, y: src.y});
        let pos_ = getpos(self, {sprite, x: dest.x, y: dest.y});
        return Waypoint.move(sprite, {pos: pos_, speed: self.speed})
            .then(_=> {
                //M.removeSprite(self, src);
                //M.setSprite(self, {sprite, x: dest.x, y: dest.y});
            });
    },

    placeSprite(self, {sprite, dest}) {
        let getpos = M.getSpritePos;
        let pos = getpos(self, {sprite, x: dest.x, y: dest.y});
        let i = M.indexOfSprite(self, sprite);
        //if (i >= 0)
        //    self.sprites[i] = null;
        Waypoint.move(sprite, {pos})
            .then(_=> M.setSprite(self, {sprite, x: dest.x, y: dest.y}));
    },

    indexOfSprite(self, sprite) {
        let sprites = self.gameArray.data;
        return sprites.indexOf(sprite);
    },

    toXY(self, idx) {
        return {
            y: Math.floor(idx/self.cols),
            x: Math.floor(idx%self.cols),
        }
    },

    isFull(self) {
        return self.gameArray.isFull();
    },

    //get X() { }
    //set X() { }
    //X: __(function(self, v) {  ... }),
    //
    // M.X()
    // M.X(v)
    // let m = M.create()
    // m.X()
    // m.X(v)
    //
    // m.X = v

    //getXY(i, j) {
    //},
}

M.Proto = Util.prototypify(M);

//M.Pos = {
//    create(i, j) {
//        let v = new Vec.create(i, j);
//        let m = {
//            get i()  { return v.y; },
//            get j()  { return v.x; },
//            get x()  { return v.x; },
//            get y()  { return v.y; },
//            set i(n) { return v.y = n; },
//            set j(n) { return v.x = n; },
//            set y(n) { return v.y = n; },
//            set x(n) { return v.x = n; },
//            toString() { return `GridPos(${m.y}, ${m.x})`},
//        }
//        Object.setPrototypeOf(m, v);
//        return m;
//        return new Proxy(
//            new Vec.create(i, j),
//            {
//
//            }
//        );
//    },
//}

module.exports = M;
