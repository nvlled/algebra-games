let Util = require("src/client/algebra/Util"); 
let GameArray = require("src/client/algebra/GameArray"); 
let Waypoint = require("src/client/algebra/Waypoint"); 
let Vec = require("src/client/algebra/Vec"); 
let Block = require("src/client/algebra/Block"); 
let Phys = require("src/client/algebra/Phys"); 
let Anima = require("src/client/algebra/Anima"); 
let PixiUtil = require("src/client/algebra/PixiUtil");
let PIXI = require("src/client/pixi");
let {markGetterSetter} = Util;

function indexToXY({i, cols}) {
    return {
        x: i % cols,
        y: Math.floor(i / cols),
    }
}

let MASK = Symbol("Mask");
let POS = Symbol("Tile Pos");
let BORDER = Symbol("Border");
let ISTILE = Symbol("Tile Marker");

let M = {
    new(...args) {
        let grid = Util.wrap(M.create(...args), M.Proto);
        return grid;
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
        tileRadius,

        wrapDrag=false,

        defaultId=0,
        nil,
        fit=true,
        stretch=1.0,
        speed=300,
        alpha=0.7,
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
                sprite.x = tileWidth*.5 + (j * (tileWidth+tileSpace));
                sprite.y = tileHeight*.5 + (i * (tileHeight+tileSpace));
                sprite[POS] = {x: j, y: i};
                sprite[ISTILE] = true;
                sprite.alpha = alpha;
                sprite.anchor.set(0.5);

                //if (tileRadius != null) {
                //    // TODO: fix
                //    let w = sprite.width;
                //    let scale = sprite.scale.x;
                //    let size = (tileWidth)*scale;
                //    let args = Object.assign(
                //        {
                //            radius: 1,
                //            x: 0,
                //            y: 0,
                //            width: tileWidth,
                //            height: tileHeight,
                //        },
                //    );
                //    let mask = PixiUtil.roundedRect(args);
                //    mask.width = w;
                //    mask.height = w;
                //}

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
            wrapDrag,
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
        let dir = null;
        let wrapped = false;

        function clearListeners(sprite) {
            sprite.removeListener("pointerupoutside", onUp);
            sprite.removeListener("pointerup", onClick);
            sprite.removeListener("pointermove", onMove);
        }
        let onMove = function(e){
            [end, wrapped] = M.globalToGridPos(self, e.data.global);
            if (end) {
                dir = Vec.new(end).sub(start).norm();
                if (wrapped)
                    dir.neg();
            }
            self.onTileDragging(start, end, dir);
        }
        let onDown = function(e){
            let tile = this;
            start = tile[POS];
            end = start;
            dir = {x: 0, y: 0};
            self.onTileDown(start);
            tile.on("pointerupoutside", onUp);
            tile.on("pointerup", onClick);
            tile.on("pointermove", onMove);
        }
        let onUp = function(e) {
            clearListeners(this);
            
            if (end) { 
                self.onTileDrag(start, end, dir, wrapped);
            } else {
                self.onTileDrag(start, null, dir);
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
                tile.buttonMode = true;
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

    hightlightTiles(self, points, highlight=0x00aaaa, add=false) {
        let {rows, cols} = self;
        for (let p of points) {
            let tile = M.tileAt(self, p);
            if (!tile)
                continue;
            if (add && tile.tint != 0xffffff)
                tile.tint |= highlight;
            else
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


    eachSprite(self, fn) {
        let {rows, cols} = self;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let sprite = M.spriteAt(self, {x: j, y: i});
                if (sprite)
                    fn(sprite, j, i);
            }
        }
    },

    clearSprites(self, destroy=false) {
        for (let sprite of self.gameArray.data) {
            if (!sprite)
                continue;
            if (sprite.parent == self)
                self.removeChild(sprite);
            if (destroy) {
                sprite.destroy();
            }
        }
        for (let sprite of self.children) {
            if (!sprite[ISTILE])
                sprite.destroy();
        }
        self.gameArray.data.splice(0);
    },

    removeSprite(self, sprite, destroy=false) {
        let pos;
        if (sprite[POS])
            pos = sprite[POS];
        else
            pos = sprite;

        sprite = self.gameArray.remove(pos);
        if (sprite && destroy) {
            sprite.visible = false;
            sprite.destroy();
        }
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
        sprite[POS] = {x, y};
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

        let {tileHeight, tileWidth, tileSpace} = self;
        let pos = M.spritePos(self, sprite);

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

    spritePos(self, sprite) {
        if (sprite)
            return sprite[POS];
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

        let hasCollision = false;
        let i = 0;
        for (let p of block.points) {
            p.x += dx;
            p.y += dy;
            hasCollision = hasCollision || M.hasSprite(self, p);

            let sprite = block.data[i];
            if (sprite)
                M.setSprite(self, {x: p.x, y: p.y, sprite});
            else
                M.removeSprite(self, {x: p.x, y: p.y});
            i++;
        }
        return hasCollision;
    },

    flashBlocks(self, points, tint=0xff0000) {
        return PixiUtil.flashSprites(points.map(p => {
            if (p)
                return M.spriteAt(self, p) || M.tileAt(self, p);
        }, tint));
    },

    performBlockAction(self,  {block, speed}, action) {
        let {gameArray} = self;
        let paths = action();

        if (paths.length > 0) {
            let promises =  [];
            let points_ = [];
            for (let path of paths) {
                if (path == null)
                    continue;
                let [p, p_] = path;
                promises.push(M.move(self, {src: p, dest: p_, force: true, speed}));
                points_.push(p_);
            }
            return Promise.all(promises)
                .then(_=> {
                    M.updatePositions(self, paths);
                    gameArray.apply(paths);

                    if (block)
                        block.points = points_;
                    return Promise.resolve(points_);
                });
        }
        return Promise.resolve(false);
    },

    updatePositions(self, paths) {
        for (let path of paths) {
            if (path == null)
                continue;
            let [p, p_] = path;
            let sprite = M.spriteAt(self, p);
            if (sprite) {
                var nope = sprite[POS];
                sprite[POS] = p_;
            }
        }
    },

    moveBlock(self, {
        dir={x: 0, y: 0},
        block,
        speed,
    } = {}) {
        // update block points
        return M.performBlockAction(self, 
            {
                block,
                speed,
            },
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
        speed,
    }) {
        return M.performBlockAction(self, 
            {speed, block,},
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
        speed,
    } = {}) {
        if (block.noRotate)
            return Promise.resolve();
        return M.performBlockAction(self, 
            {speed, block,},
            _=> self.gameArray.rotate({
                dir, 
                square: block.square,
                points: block.points,
                pivot: block.pivot,
            })
        );
    },

    dropVertical(self, {
        dir=1,
        speed,
    } = {}) {
        return M.performBlockAction(self, 
            {speed},
            _ => self.gameArray.dropVertical({ dir }));
    },

    dropHorizontal(self, {
        dir=1,
        speed,
    } = {}) {
        return M.performBlockAction(self, 
            {speed},
            _ => self.gameArray.dropHorizontal({
                dir, 
            })
        );
    },

    drop(self, {
        dir,
        speed,
    } = {}) {
        return M.performBlockAction(self, 
            {speed},
            _ => self.gameArray.drop({ dir })
        );
    },

    //placeSpritesToGrid(self) {
    //    let i = -1;
    //    let promises = [];
    //    let {gameArray} = self;
    //    for (let sprite of gameArray.data) {
    //        i++;
    //        if (!sprite)
    //            continue;
    //        let {x, y} = indexToXY({i, cols: self.cols});
    //        ({x, y} = M.getSpritePos(self, {x, y, sprite}));
    //        promises.push(Waypoint.move(sprite, { pos: {x, y}}));
    //    }
    //    return Promise.all(promises);
    //},

    fillArray(self, fn) {
        let {rows, cols} = self;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let sprite = fn();
                M.setSprite(self, {sprite, x: j, y: i});
            }
        }
    },

    async move(self, {sprite, src, dest, force=false, apply=false, speed, jump=false}) {
        if (sprite && sprite[POS])
            src = sprite[POS];
        else
            sprite = M.spriteAt(self, {x: src.x, y: src.y});

        if (!sprite)
            return;
        if (self.gameArray.isOccupied({x: dest.x, y: dest.y}) && !force) {
            console.log("move cancelled, tile is occupied");
            return;
        }

        let getpos = M.getSpritePos;
        let pos = getpos(self, {sprite, x: src.x, y: src.y});
        let pos_ = getpos(self, {sprite, x: dest.x, y: dest.y});

        speed = speed || self.speed;
        if (jump)
             await Anima.teleport(sprite, {end: pos_, seconds: 0.3});
        else
            await Anima.move(sprite, {end: pos_, speed: speed})

        if (apply) // whew
            M.setSprite(self, {sprite, x: dest.x, y: dest.y});
        return Promise.resolve();
    },

    //placeSprite(self, {sprite, dest}) {
    //    let getpos = M.getSpritePos;
    //    let pos = getpos(self, {sprite, x: dest.x, y: dest.y});
    //    let i = M.indexOfSprite(self, sprite);
    //    Waypoint.move(sprite, {pos})
    //        .then(_=> M.setSprite(self, {sprite, x: dest.x, y: dest.y}));
    //},

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

    toPixel(self, {x, y}) {
        let {tileWidth: w, tileHeight: h, tileSpace: size} = self;
        return Vec.new({x,y}).times({x: w+size, y: h+size});
    },

    setBorder(self, {x, y, color, v=1, l=v,r=v,t=v,b=v, neg=false}={}) {
        if (neg) {
            [l,r,t,b] = [l,r,t,b].map(t => !t);
        }

        let tile = M.tileAt(self, {x, y});
        if (!tile)
            return;

        let border = new PIXI.Graphics();
        let {tileWidth: w, tileHeight: h, tileSpace: size} = self;
        let line = (p1, p2) => {
            PixiUtil.line({
                g: border,
                container: self,
                p1, p2,
                color: color || 0x000055,
                lineWidth: size/2,
                alpha: 0.8,
            });
        }
        let tl = M.toPixel(self, {x, y}).add({x: -size*.25, y: -size*.25});
        let bl = Vec.new(tl).add({y: h+size/2});
        let br = Vec.new(bl).add({x: h+size/2});
        let tr = Vec.new(tl).add({x: w+size/2});

        if (t)
            line(tl, tr);
        if (l)
            line(tl, bl);
        if (b)
            line(br, bl);
        if (r)
            line(br, tr);

        if (tile[BORDER])
            tile[BORDER].destroy();
        tile[BORDER] = border;
    },

    surroundBorder(self, points, {color, alpha}={}) {
        let minX=null, minY=null, maxX=null, maxY=null;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        points.forEach(p => {
            M.setBorder(self, {
                v: 0,
                x: p.x,
                y: p.y,
                t: p.y == minY,
                b: p.y == maxY,
                l: p.x == minX,
                r: p.x == maxX,
                color,
                alpha,
            });
        });
    },

    getEmptyPoints(self) {
        let points = [];
        self.tiles.forEach(t => {
            let pos = M.getTilePos(self, t);
            if (!M.isOccupied(self, pos))
                points.push({
                    x: pos.x,
                    y: pos.y,
                });
        });
        return points;
    },

    wrapPos(self, {x, y}) {
        let {rows, cols} = self;
        if (x < 0) {
            x = cols + x%cols;
        } else if (x >= cols) {
            x = x%cols;
        }
        if (y < 0) {
            y = rows + y%rows;
        } else if (y >= rows) {
            y = y%rows;
        }
        return {x, y};
    },

    indexOf(self, {x, y}) {
        return self.gameArray.indexOf({x, y});
    },

    isFull(self) {
        return self.gameArray.isFull();
    },

    isOccupied(self, pos) {
        return self.gameArray.isOccupied(pos);
    },

    globalToGridPos(self, {x, y}) {
        let [sx, sy] = [1, 1];
        let [px, py] = [0, 0];
        if (self.parent) {
            let {scale,position} = self.parent;
            [sx, sy] = [scale.x, scale.y];
            [px, py] = [position.x, position.y];
        }

        let {x: bx, y: by} = self;
        bx *= sx;
        by *= sy;
        bx += px;
        by += py;

        let {tileWidth, tileHeight, tileSpace} = self;
        tileWidth *= self.scale.x * sx;
        tileHeight *= self.scale.x * sx;
        tileSpace *= self.scale.x * sx;
        x = Math.floor((x - bx)/(tileWidth+tileSpace));
        y = Math.floor((y - by)/(tileHeight+tileSpace));

        let wrapped = false;
        if (self.gameArray.outbounds({x, y})) {
            if (!self.wrapDrag) {
                return null;
            }
            let {rows, cols} = self;
            let x_ = x;
            let y_ = y;
            if (x >= cols)
                x_ = 0;
            else if (x < 0)
                x_ = cols-1;
            if (y >= rows)
                y_ = 0;
            else if (y< 0)
                y_ = rows-1;
            wrapped = x != x_ || y != y_;
            x = x_;
            y = y_;
        }
        return [{x, y}, wrapped];
    },

    hideTiles(self, ...indices) {
        indices.forEach(i => self.tiles[i].visible = false);
    },
}

M.Proto = Util.prototypify(M);
module.exports = M;
