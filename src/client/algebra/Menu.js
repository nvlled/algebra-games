
let Layout = require("src/client/algebra/Layout");
let Button = require("src/client/algebra/Button");
let PixiUtil = require("src/client/algebra/PixiUtil");

let M = {
    create(opts, items) {
        let {
            title,
            textStyle={},
            showBg=false,
        } = opts;
        let {Text, Container} = PIXI;

        let buttons = [];
        for (let [text, fn] of Object.entries(items)) {
            let btn = Button.new({
                text,
                bgStyle: { normal: 0x222222},
            });
            btn.pointerup = fn;
            buttons.push(btn);
        }
        if (title) {
            let titleText = new Text(title, Object.assign({
                fill: 0xffffff,
                fontSize: 80,
                fontFamily: "Arial",
                align: "center",
                stroke: '#332200',
                strokeThickness: 5,
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 20,
                dropShadowAngle: Math.PI / 6,
                dropShadowDistance: 6,
                wordWrap: true,
                wordWrapWidth: 440
            }, textStyle));
            buttons.unshift(titleText);
        }

        let menu = new Container();
        let btnContainer = Layout.col({}, ...buttons);
        let margin = 1.5;
        let bg = PixiUtil.roundedRect({
            alpha: 0.5,
            color: 0x111111,
            width: btnContainer.width*margin,
            height: btnContainer.height*margin,
            x: -btnContainer.width*(margin-1)*0.5,
            y: -btnContainer.height*(margin-1)*0.5,
        });
        if (opts.showBg)
            menu.addChild(bg);
        menu.addChild(btnContainer);

        menu.buttons = btnContainer;
        return menu;
    },
}

module.exports = M;



