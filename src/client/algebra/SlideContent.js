let Layout = require("src/client/algebra/Layout");
let Util = require("src/client/algebra/Util");
let Button = require("src/client/algebra/Button");
let Anima = require("src/client/algebra/Anima");

let M = {
    create(...contents) {
        return {
            index: 0,
            contents,
        }
    },

    dialog(args = {}) {
        let {
            title,
            content,
            buttons,
            width=500,
            textStyle={
                fontSize: 30,
            },
            buttonStyle={
                width: 200,
            },
            parent,
        } = args;

        let text = (text,size=17) => {
            let textArgs = Object.assign({
                fill: 0xdddddd,
                padding: 10,
                wordWrap: true,
                wordWrapWidth: width,
                fontSize: size,
            }, textStyle);
            return new PIXI.Text(text, textArgs);
        }

        let rows = [
            text(title, textStyle.fontSize+10),
            text(content),
        ];

        let diag;
        let btn = (text, handler) => {
            return Button.new(Object.assign({
                fontSize: 23,
                width: 100,
                height: 35,
                text: text,
                bgStyle: {
                    normal: "",
                },
                pointerup: () => {
                    handler(diag);
                }
            }, buttonStyle));
        }

        let btns = [];
        for (let [txt, handler] of Object.entries(buttons)) {
            btns.push(btn(txt, handler));
        }
        let btnPanel = Layout.row({}, ...btns);

        diag = Layout.col(
            {
                padding: 20,
                color: 0x111111,
                alpha: 0.7,
                margin: 10,
                center: false,
                stretch: false,
            },
            ...rows,
            btnPanel
        );
        Layout.center({centerY: false}, btnPanel);
        if (parent) {
            parent.addChild(diag);
        }
        Layout.centerOf({}, parent, diag);
        return Anima.fade(diag, {start: 0, end: 1});
    },


};

M.new = Util.constructor(M);
module.exports = M;
