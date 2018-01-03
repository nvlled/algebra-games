
let Util = require("src/client/algebra/Util");
let Table = require("src/client/algebra/Table");
let Bouton = require("src/client/algebra/Bouton");
let FixedContainer = require("src/client/algebra/FixedContainer");

let Slide = {
    create({items=[], width=0, height=0, wrap=false}) {
        for (let x of items) {
            width = Math.max(width, x.width || 0);
            height = Math.max(height, x.height || 0);
        }
        let self = FixedContainer.create(width, height);
        self.index = 0;
        self.items = items;
        self.addChild(items[0]);
        return self;
    },
    hasNext(self) {
        if (self.wrap)
            return true;
        return self.index < self.items.length-1;
    },
    hasPrev(self) {
        if (self.wrap)
            return true;
        return self.index > 0;
    },
    next(self) {
        self.index++;
        if (self.index >= self.items.length) {
            if (!self.wrap) {
                self.index = self.items.length-1;
                return;
            }
            self.index = 0;
        }
        let item = self.items[self.index];
        self.removeChildren();
        self.addChild(item);
    },
    prev(self) {
        self.index--;
        if (self.index < 0) {
            if (!self.wrap) {
                self.index = 0;
                return;
            }
            self.index = self.items.length-1;
        }
        let item = self.items[self.index];
        self.removeChildren();
        self.addChild(item);
    }
}
Slide.new = Util.constructor(Slide);

let Textbox = {
}
//let ui = UI.new( ({
//    row, textBig, text, textSmall, center
//    and, slide
//}) => slide(
//  col(
//      textBig("slide 1"),
//  ),
//  col(
//      textBig("slide 2"),
//  ),
//));

//let ui = UI.new( ({
//    row, textBig, text, textSmall, center
//    and,
//}) => col(
//    map(h1("Options"), and(center, left)),
//    line,
//    row(
//        id(btnLeft, "left"),
//        container,
//        btnRight,
//    ),
//), {
//    textArgs,
//    tableArgs,
//});
// 
// let btnLeft = ui.getByID("left");
// btnLeft.tap = ...

//let row = (...args)

// UI.create(({
//      row,col,align
// }) => row(
//  text("a"),
//  btn("a"),
// ));

let add = (...objs) => Object.assign(...objs);

let IDS = Symbol();
let M = {
    funcs(self) {
        let args = self.theme;

        let img = (path, width, height) => {
            let sprite = PIXI.Sprite.fromImage(path);
            if (width != null) {
                if (height == null)
                    height = width;
                sprite.width = width;
                sprite.height = height;
            }
            return sprite;
        };

        let textBig   = text => new PIXI.Text(Util.trimIndent(text), add({fontSize: 25}, args.textArgs));
        let textSmall = text => new PIXI.Text(Util.trimIndent(text), add({fontSize: 17}, args.textArgs));
        let text      = text => new PIXI.Text(Util.trimIndent(text), add({fontSize: 20}, args.textArgs));

        let btnImg = path => Bouton.new(add({
            image: path,
            stretchImage: false,
        }, args.btnArgs));
        let btn = (text) => Bouton.new(add({
            text,
        }, args.btnArgs));
        let btnCheck = (text) => Bouton.new(add({
            text,
            toggle: true,
        }, args.btnArgs));

        let root = (...items) => Table.column(add(args.tableArgs, {overlay: true}), items);
        let col = (...items) => Table.column(add(args.tableArgs, {overlay: false}), items);
        let row = (...items) => Table.row(add(args.tableArgs, {overlay: false}), items);

        let slide = (...args) => Slide.new(...args);

        let and = Util.compose;
        let tableFuncs = add({}, Table.Align.funcs);
        return add(tableFuncs, {
            img,
            and,
            slide,
            col, row, root,
            btn, btnCheck, btnImg,
            textBig, textSmall, text,
        })
    },

    create(theme={
        textArgs: {fill: 0xffeeee},
        tableArgs: {
            margin: 10,
        },
        btnArgs: {
            width: 40,
            height: 40,
        },
    }) {
        return {
            theme,
        }
    },

    build(self, ctor) {
        let ids = {};
        let component = ctor(add({
            id: (obj, id) => {
                ids[id] = obj;
                return obj;
            },
        }, M.funcs(self)));
        //component[IDS] = ids;
        component.getByID = id => ids[id];
        return component;
    },

    //create(ctor, args={}) {
    //    args = M.createFuncs(args);
    //    let self = ctor(args);

    //    self[IDS] = ids;

    //    if (!self) {
    //        throw "ctor forgot to return an object";
    //    }
    //    return self;
    //},
}

M.new = Util.constructor(M);
module.exports = M;
