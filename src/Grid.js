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

let POS = Symbol("Tile Pos");

let M = {
    new(...args) {
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
        interactive=false,
        highlight=0xdd0000,
        
        onTileDown=({x, y})=>console.log("tile down: ", x, y),
        onTileDrag=(pos, pos_, dir)=> {
            console.log("drag: ", pos, "->", pos_, ", dir: ", dir.x, dir.y);
        },
        onTileDragging=(pos, pos_, dir)=> {
        },
        onTileClick=({x, y})=>console.log("tile click: ", x, y),
        onTileOut=({x, y})=>console.log("tile out: ", x, y),

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
                sprite[POS] = {x: j, y: i};
                sprite.alpha = alpha;
                sprite.anchor.set(0.5);
                tiles.push(sprite);
            }
        }

        let gameArray = GameArray.new({rows, cols});

        Object.assign(container, {
            onTileClick,
            onTileDrag,
            onTileDragging,
            onTileDown,
            x, y,
            speed,
            cols, rows, 
            tileWidth, tileHeight, tileSpace,
            fit, stretch,
            tiles,
            gameArray,
            operations: [],
            actions: [],
        });
        return container;
    },

    getTilePos(self, tile) {
        if (tile)
            return tile[POS];
    },

    setInteractive(self) {
        let start = null;
        let end = null;

        function clearListeners(sprite) {
            sprite.removeListener("pointerupoutside", onUp);
            sprite.removeListener("pointerup", onClick);
            sprite.removeListener("pointermove", onMove);
        }
        let onMove = function(e){
            let dir = null;
            end = M.globalToGridPos(self, e.data.global);
            if (end)
                dir = Vec.new(end).sub(start).norm();
            self.onTileDragging(start, end, dir);
        }
        let onDown = function(e){
            let tile = this;
            start = tile[POS];
            end = start;
            self.onTileDown(start);
            tile.on("pointerupoutside", onUp);
            tile.on("pointerup", onClick);
            tile.on("pointermove", onMove);
        }
        let onUp = function(e) {
            clearListeners(this);
            
            if (end) { 
                let dir = Vec.new(end).sub(start).norm();
                self.onTileDrag(start, end, dir);
            } else {
                self.onTileDrag(start, null, null);
            }

            start = end = null;
        }

        let onClick = function(e) {
            clearListeners(this);
            self.onTileClick(this[POS]);
        }

        let {rows, cols} = self;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let tile = M.tileAt(self, {x, y});
                tile.interactive = true;
                tile.on("pointerdown", onDown);
            }
        }
    },

    getRow(self, y, withNil=true) {
        let elems = [];
        for (let x = 0; x < self.cols; x++) {
            let sprite = M.spriteAt(self, {x, y});
            if (sprite || withNil) {
                elems.push({x, y});
            }
        }
        return elems;
    },

    getColumn(self, x, withNil=true) {
        let elems = [];
        for (let y = 0; y < self.rows; y++) {
            let sprite = M.spriteAt(self, {x, y});
            if (sprite || withNil) {
                elems.push({x, y});
            }
        }
        return elems;
    },

    clearHighlights(self, points) {
        let {rows, cols} = self;
        if (points) {
            points.forEach(p => {
                let tile = M.tileAt(self, p);
                tile.tint = 0xffffff;
            });
        } else {
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    let tile = M.tileAt(self, {x, y});
                    tile.tint = 0xffffff;
                }
            }
        }
    },

    hightlightTiles(self, points, highlight=0x00aaaa) {
        let {rows, cols} = self;
        for (let p of points) {
            let tile = M.tileAt(self, p);
            tile.tint = highlight;
        }
    },

    hightlightRange(self, start, end, highlight=0x00aaaa) {
        start = Vec.new(start);
        end = Vec.new(end);
        if (end.lessThan(start))
            [start, end] = [end, start];
        for (let y = start.y; y <= end.y; y++) {
            for (let x = start.x; x <= end.x; x++) {
                let tile = M.tileAt(self, {x, y});
                tile.tint = highlight;
            }
        }
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

        if (sprite.parent == null)
            self.addChild(sprite);

        if (fit) {
            sprite.width = tile.width * stretch;
            sprite.height = tile.height * stretch;
        }

        sprite.anchor.set(0.5);
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
            x: baseX + tile.x,
            y: baseY + tile.y,
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
                    gameArray.apply(paths);
                    if (block)
                        block.points = points_;
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
            _ => self.gameArray.dropVertical({ dir }));
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

    drop(self, {
        dir
    } = {}) {
        return M.performBlockAction(self, 
            null,
            _ => self.gameArray.drop({ dir })
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
        return Waypoint.move(sprite, {pos: pos_, speed: self.speed});
    },

    placeSprite(self, {sprite, dest}) {
        let getpos = M.getSpritePos;
        let pos = getpos(self, {sprite, x: dest.x, y: dest.y});
        let i = M.indexOfSprite(self, sprite);
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

    indexOf(self, {x, y}) {
        return self.gameArray.indexOf({x, y});
    },

    isFull(self) {
        return self.gameArray.isFull();
    },

    globalToGridPos(self, {x, y}) {
        let {x: bx, y: by} = self;
        let {tileWidth, tileHeight, tileSpace} = self;
        x = Math.floor((x - bx + tileWidth*.5)/(tileWidth+tileSpace));
        y = Math.floor((y - by + tileHeight*.5)/(tileHeight+tileSpace));
        if (self.gameArray.outbounds({x, y}))
            return null;
        return {x, y};
    },
}

M.Proto = Util.prototypify(M);

module.exports = M;



