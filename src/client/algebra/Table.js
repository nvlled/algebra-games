let Util = require("src/client/algebra/Util");
let PixiUtil = require("src/client/algebra/PixiUtil");

let add = (obj, obj_) => {
    if (!obj) {
        obj = {
            x: 0,
            y: 0,
            fillX: false,
            fillY: false,
            spanX: false,
            spanY: false,
            minWidth: 0,
            minHeight: 0,
        }
    }
    return Object.assign({}, obj, obj_);
}

let fillX = (val=true) => obj => add(obj, {fillX: val});
let fillY = (val=true) => obj => add(obj, {fillY: val});
let fill  = (val=true) => obj => add(obj, {fillX: val, fillY: val});

let center  = obj => add(obj, {x: 0, y: 0});
let centerX = obj => add(obj, {x: 0});
let centerY = obj => add(obj, {y: 0});
let left    = obj => add(obj, {x: -1});
let right   = obj => add(obj, {x:  1});
let top     = obj => add(obj, {y: -1});
let bottom  = obj => add(obj, {y:  1});

let topLeft = Util.compose(top, left);
let bottomRight = Util.compose(bottom, right);

let minWidth  = val => obj => add(obj, {minWidth: val});
let minHeight = val => obj => add(obj, {minHeight: val});
let size      = (w, h) => obj => {
    return add(obj, {minWidth: w, minHeight: h});
}

let empty = (width, height) => {
    return { width, height };
}

let map = (obj, ...fns) => ({obj, fn: Util.compose(...fns)});

// let {centerX, centerY, left, right} = Table.propFns;
// let t = Table.new({
// }, [
//      [right(right(a)), left(b)], 
//      [c, map(d, left, right)], 
//      [left(e)], 
// ]);
// t.mapRow(0, compose(centerX, left))
// tableFn(rowFn(colFn(obj))) // nope, tableFn now takes priority
// compose(indexFn, rowFn, colFn, tableFn)
//
// let {centerX, left, right} = Align.funcs;
// let {x, y} = Align.compute(obj, container, centerX, {
//      outside: true,
// });

let Align = {
    funcs: {
        center, centerX, centerY,
        left, right, top, bottom,
        minWidth, minHeight, size,
        fillX, fillY, fill,
        map,
    },

    // what if container is smaller than obj?
    compute(obj, container, alignFn, args={}) {
        let {
            margin=0,
            marginX=margin,
            marginY=margin,
            outside=false,
            outsideX=outside,
            outsideY=outside,
            isContained=false,
        } = args;
        let al = alignFn();

        if (al.fillX)
            obj.width = container.width-marginX*2;
        if (al.fillY)
            obj.height = container.height-marginY*2;

        let containerPos = PixiUtil.topLeft(container);

        let {x: ax=0, y: ay=0} = obj.anchor || {};
        let aw = obj.width  * ax;
        let ah = obj.height * ay;

        let x = containerPos.x + aw;
        let y = containerPos.y + ah;

        if (al.x < 0) {         // left
            if (outsideX) {
                x = x - obj.width - marginX;
            } else {
                x += marginX;
            }
        } else if (al.x == 0) { // center
            x += (container.width - obj.width)/2;
        } else if (al.x > 0) {  // right
            if (outsideX) {
                x += container.width + marginX;
            } else {
                x += container.width - obj.width - marginX;
            }
        }

        if (al.y < 0) {         // top
            if (outsideY) {
                y = y - obj.height - marginY;
            } else {
                y += marginY;
            }
        } else if (al.y == 0) { // center
            y += (container.height - obj.height)/2;
        } else if (al.y > 0) {  // bottom,
            if (outsideY) {
                y += container.height + marginY;
            } else {
                y += container.height - obj.height - marginY;
            }
        }
        if (isContained) {
            x -= container.x;
            y -= container.y;
        }
        return {x, y};
    },

    apply(obj, container, alignFn, args) {
        let {x, y} = Align.compute(obj, container, alignFn, args);
        obj.x = x;
        obj.y = y;
    },

    placeOut(obj, alignFn, args={}) {
        args.outside = true;
        Align.apply(obj, obj.parent, alignFn, args);
    },

    center(obj, alignFn=center, args={}) {
        Align.apply(obj, obj.parent, alignFn, args);
    },
}

let IDX = Symbol();

let M = {
    Align,

    create(args, fn) {
        args = args || {};
        let {
            overlay=true,
            margin=0,
            marginX=margin,
            marginY=margin,
            tableFn=Util.compose(left, top),
        } = args;


        let table = [];
        if (typeof fn == "function") {
            table = fn(Align.funcs);
        } else {
            table = fn;
        }

        let objFn = new Map();
        table = table
            .filter(row => row.length > 0)
            .map((row, i) => {
                return row.map((elem, j) => {
                    let {obj, fn} = elem;
                    if (obj && fn) {
                        obj[IDX] = {i, j};
                        objFn.set(obj, fn);
                        return obj;
                    } else {
                        elem[IDX] = {i, j};
                        return elem;
                    }
                });
            });

        let self = Object.assign(new PIXI.Container(), {
            x: 0,
            y: 0,
            lastSize: {
                width: 0,
                height: 0,
            },
            parent: null,
            marginX,
            marginY,
            tableFn,
            rowFn: [],
            colFn: [],
            objFn,
            table,
        });

        for (let row of table) {
            for (let obj of row) {
                self.addChild(obj);
            }
        }
        M.apply(self);

        if (overlay) {
            let border = PixiUtil.overlay(self, {marginX, marginY, radius: 5});
            self.addChildAt(border, 0);
            border.width = self.lastSize.width-marginX/2;
            border.height = self.lastSize.height-marginY/2;
            self.x += marginX/2;
            self.y += marginY/2;
            self.border = border;
        }

        return self;
    },

    row(args, items) {
        let table = [items];
        return M.new(args, table);
    },

    column(args, t) {
        let table = t.map(x => [x]);
        return M.new(args, table);
    },

    dimension(self) {
        let {table} = self;
        let rows = 0;
        let cols = 0;
        for (let row of table) {
            rows++;
            cols = Math.max(cols, row.length);
        }
        return {rows, cols};
    },

    size(self) {
        let {table} = self;
        let rowHeight = {};
        let colWidth = {};
        for (let i = 0; i < table.length; i++) {
            let row = table[i] || [];
            rowHeight[i] = Math.max(...row.map(obj => {
                if (!obj)
                    return 0;
                let props = M.getFn(self, obj)();
                return Math.max(obj.height, props.minHeight);
            }));

            for (let j = 0; j < row.length; j++) {
                let obj = row[j];
                if (!obj)
                    continue;
                let props = M.getFn(self, obj)();
                let w = Math.max(obj.width, props.minWidth);
                colWidth[j] = Math.max(colWidth[j] || 0, w);
            }
        }
        return {rowHeight, colWidth};
    },

    mapTable(self, fn) {
        self.tableFn = fn;
    },

    mapRow(self, rowno, fn) {
        self.rowFn[rowno] = fn 
    },

    mapCol(self, colno, fn) {
        self.colFn[colno] = fn 
    },

    mapObj(self, obj, fn) {
        self.objFn.set(obj, fn);
    },

    get(self, j, i) {
        let row = self.table[i];
        if (!row)
            return null;
        return row[j];
    },

    compute(self) {
        let table = {self};
        let {rows, cols} = M.dimension(self);
        let {rowHeight, colWidth} = M.size(self);

        let result = new Map();

        let y =  0;
        let {marginX, marginY} = self;
        for (let i = 0; i < rows; i++) {
            let height = rowHeight[i];
            let x = 0;
            for (let j = 0; j < cols; j++) {
                let obj = M.get(self, j, i);
                let width = colWidth[j];
                result.set(obj, {x,y,height, width});
                x += width+marginX;
            }
            y += height+marginY;
        }
        return result;
    },

    //addAllToContainer(self, container) {
        //for (let row of self.table) {
        //    for (let obj of row) {
        //        self.addChild(obj);
        //        //container.addChild(obj);
        //    }
        //}
        //container.addChild(self);

        //self.parent = new Proxy(container, {
        //    get(_, name) {
        //        if (name == "width")
        //            return self.width;
        //        else if (name == "height")
        //            return self.height;
        //        else if (name == "x")
        //            return self.x;
        //        else if (name == "y")
        //            return self.y;
        //        return self[name];
        //    }
        //});
    //},

    getFn(self, obj) {
        let {i, j} = obj[IDX];
        let fn = Util.compose(
            self.objFn.get(obj),
            self.rowFn[i],
            self.colFn[j],
            self.tableFn,
        );
        return fn;
    },

    // I won't use the code here in critical sections (i.e., frame loops)
    // so it's okay to use fancy FP stuffs...?
    apply(self) {
        let result = M.compute(self);
        self.sizes = result;
        let {rows, cols} = M.dimension(self);

        let {marginX, marginY} = self;
        let width = 0;
        let height = 0;
        for (let i = 0; i < rows; i++) {
            let h = 0;
            let w = 0;
            for (let j = 0; j < cols; j++) {
                let obj = M.get(self, j, i);
                if (!obj) {
                    w += marginX;
                    continue;
                }
                let fn = M.getFn(self, obj);
                let container = result.get(obj);
                Align.apply(obj, container, fn, { });
                w += container.width+marginX;
                h = Math.max(h, container.height+marginY);
            }
            width = Math.max(width, w);
            height += h;
        }
        width += marginX;
        height += marginY;
        self.lastSize = {width, height};
    },

    //setPosition(self, {x=self.x, y=self.y}) {
    //    let dx = x-self.x;
    //    let dy = y-self.y;
    //    for (let row of self.table) {
    //        for (let obj of row) {
    //            if (!obj)
    //                continue;
    //            obj.x += dx;
    //            obj.y += dy;
    //        }
    //    }
    //    self.x += dx;
    //    self.y += dy;
    //},
}

let proxy = Util.proximate(({setter, getter, forward}) => {
    return {
        //x: setter((self, val) => self.x = val+self.marginX/2),
        //y: setter((self, val) => self.y = val+self.marginY/2),

        width: getter((self) => self.lastSize ? self.lastSize.width : 0),
        height: getter((self) => self.lastSize ? self.lastSize.height : 0),
    }
});

M.new = Util.constructor(M, proxy);
module.exports = M;


