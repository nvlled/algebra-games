let Util = require("src/client/algebra/Util");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Table = require("src/client/algebra/Table");
let Bouton = require("src/client/algebra/Bouton");

let M = {
    create(args = {}) {
        let {
            color=0xdddddd,
            bgColor,
            size=15,
            textPrompt="Enter input:",
            buttonPrompt="confirm",
            column=true,
            textSize=18,
            titleSize=textSize*1.2,
            tap,
        } = args;

        let textBox = new PIXI.Text("", {
            fontSize: textSize,
            fill: color,
        });
        let cursor = new PIXI.Text("", {
            fill: color,
            fontSize: textSize,
        });
        let button = Bouton.new({
            text: buttonPrompt,
            fontSize: textSize,
            width: 110,
            tap,
        });

        textBox.text = "*".repeat(size);
        cursor.text = "|"

        //textBox = PixiUtil.fixSize(textBox);
        textBox.addChild(cursor);

        let loop = Util.loop(async function() {
            await Util.sleep(500);
            cursor.visible = !cursor.visible;
        });

        let {map, left, center, centerX} = Table.Align.funcs;
        let ctor = column ? Table.column : Table.row;
        let self = ctor(
            {margin: 20}, 
            [
                new PIXI.Text(textPrompt, { fill: color, fontSize: titleSize }),
                textBox,
                map(button, Util.compose(center)),
            ]
        );
        self.loop = loop;

        setTimeout(_=> {
            textBox.text = "";
            cursor.x = textBox.width;
        });

        //Layout.center({centerY: false}, button);
        window.addEventListener("keydown", function(e) {
            if ( ! self.loop.isRunning())
                return;

            let t = textBox.text;
            if (e.key.length == 1) {
                if (t.length <= size-1)
                    textBox.text += e.key;
            } else if (e.key == "Backspace") {
                textBox.text = t.slice(0, t.length-1);
            }
            cursor.x = textBox.width+1;
            cursor.y = textBox.height-cursor.height;
        });
        self.textBox = textBox;

        return self; 
    },

    getValue(self) {
        return self.textBox.text;
    },

    start(self) {
        self.loop.start();
    },

    stop(self) {
        self.loop.stop();
    },
}

let proxy = Util.proximate(({setter, getter, forward}) => {
});

M.new = Util.constructor(M, proxy);
module.exports = M; 
