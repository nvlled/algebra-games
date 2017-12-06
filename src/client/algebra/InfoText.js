let PIXI = require("src/client/pixi");
let Util = require("src/client/algebra/Util");
let Layout = require("src/client/algebra/Layout");

let M = {
    create({
        ref,
        font,
        bg,
        keyLen=0,
        valueLen=5,
    } = {}) {
        let textObjs = {};
        font.fontFamily = "Monospace";

        for (let [k, v] of Object.entries(ref)) {
            keyLen = Math.max(k.length, keyLen);
            valueLen = Math.max((v+"").length, valueLen);
        }

        console.log(keyLen, valueLen);
        let makeText = (k, v) => {
            let n = (v.toString()).length;
            return Util.rightpad(k+": ", keyLen+2)
                + Util.leftpad(v.toString(), valueLen);
        }
        for (let [k, v] of Object.entries(ref)) {
            let txt = makeText(k, v);
            textObjs[k] = new PIXI.Text(txt, font);
        }
        let container = Layout.col(
            {
                center: false,
                align: "left",
                stretch: false,
                color: bg.color,
                alpha: bg.alpha,
            }, 
            ...Object.values(textObjs));

        let self = {
            ref: new Proxy(ref, {
                set(_, name, val) {
                    let textObj = textObjs[name];
                    if (textObj) {
                        textObj.text = makeText(name, val);
                    }
                    ref[name] = val;
                    return true;
                },
            }),
            textObjs,
            container,
        }
        return self;
    },
}

M.new = Util.constructor(M);
module.exports = M;
