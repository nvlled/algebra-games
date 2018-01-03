let Layout = require("src/client/algebra/Layout");
let PIXI = require("src/client/pixi");
let Util = require("src/client/algebra/Util");
let Sound = require("src/client/algebra/Sound");

let defaultHandler = btnText => { };

let M = {
    create({
        text,
        fontSize=24,
        fontFamily="",
        align="center",

        width,
        height,
        bgimage,
        alpha=0.7,
        image="",
        fitImage=false,

        pointerdown=defaultHandler,
        pointerup=defaultHandler,
        press=defaultHandler,

        fgStyle={},
        bgStyle={},
        pressDelay=500,

    }) {
        let self = {};
        let fgNormal = fgStyle.normal || 0xeeeeee;
        let bgNormal = bgStyle.normal || 0x003366;

        fgStyle = Util.extend({
            normal: fgNormal,
            hover:  fgNormal+0x111111,
            click:  ~fgNormal,
        }, fgStyle);

        bgStyle = Util.extend({
            normal: bgNormal,
            hover:  bgNormal+0x222222,
            click:  ~bgNormal,
        }, bgStyle);

        //if (pointerup && !press)
        //    press = pointerup;
        if (pointerup == defaultHandler &&
            press != defaultHandler) {
            pointerup = press;
        }


        let container = new PIXI.Container();
        container.pointerup = pointerup;
        container.pointerdown = pointerdown;

        let buttonText = new PIXI.Text(text, {
            fill: fgStyle.normal,
            fontSize,
            fontFamily,
            align,

            stroke: '#333300',
            strokeThickness: 5,
            dropShadow: true,
            dropShadowColor: '#001100',
            dropShadowBlur: 12,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
            wordWrap: true,
            wordWrapWidth: width,
        });

        let bgImage = PIXI.Sprite.fromImage(image);

        let bounds = buttonText.getBounds();
        let rect = new PIXI.Graphics();
        let bgImageMask = new PIXI.Graphics();

        if (width == null)
            width = bounds.width*1.5;
        if (height == null)
            height = bounds.height*1.5;

        bgImage.width = width;
        bgImage.height = height;

        let drawRect = (state="normal") => {
            let draw = r => {
                r.clear();
                r.beginFill(bgStyle[state], alpha);
                r.drawRoundedRect(0, 0,
                    width, height, 15);
                r.endFill();
            }
            //Layout.centerOf(container, bgImage);
            if (fitImage) {
                bgImage.width = width;
                bgImage.height = height;
            }

            bgImage.mask = bgImageMask;
            draw(bgImageMask);
            draw(rect);
        }
        drawRect();

        let hovered = false;
        //buttonText.interactive = true;
        //buttonText.buttonMode = true;
        rect.interactive = true;
        rect.buttonMode = true;

        let lastClick = 0;
        self.pressDelay = pressDelay;
        rect.on("pointerover", () => {
            hovered = true;
            buttonText.style.fill = fgStyle.hover;
            bgImage.tint = fgStyle.hover;
            drawRect("hover");
        });
        rect.on("pointerout", () => {
            hovered = false;
            buttonText.style.fill = fgStyle.normal;
            bgImage.tint = fgStyle.normal;
            drawRect("normal");
        });
        rect.on("pointerdown", () => {
            if ((new Date() - lastClick) < self.pressDelay)
                return;
            container.pointerdown(text, self);
            buttonText.style.fill = fgStyle.click;
            bgImage.tint = fgStyle.click;
            drawRect("click");
        });
        rect.on("pointerup", () => {
            if ((new Date() - lastClick) < self.pressDelay)
                return;
            container.pointerup(text, self);

            bgImage.tint = fgStyle.normal;
            if (hovered) {
                buttonText.style.fill = fgStyle.hover;
                drawRect("hover");
            } else {
                buttonText.style.fill = fgStyle.normal;
                drawRect("normal");
            }
            Sound.play("click");
            lastClick = new Date();
        });
        container.setSize = function(args) {
            if (args.width)
                 width =  args.width;
            if (args.height)
                 height =  args.height;
            drawRect();
            Layout.centerOf({}, rect, buttonText);
        }

        bgImage.tint = fgStyle.normal;
        bgImage.mask = bgImageMask;
        container.addChild(rect);
        container.addChild(bgImage);
        container.addChild(bgImageMask);
        container.addChild(buttonText);
        container.setSize({width, height});
        container.text = text;

        self = new Proxy(container, {
            set(target, name, value) {
                if (name == "alpha") {
                    container.alpha = value;
                    rect.alpha = value;
                    buttonText.alpha = value;
                //} else if (name == "pointerdown") {
                //    rect.pointerdown = value;
                //} else if (name == "pointerup") {
                //    rect.pointerup = pointerup;
                } else if (name == "click") {
                    container.pointerdown = ()=>{};
                    container.pointerup = value;
                } else if (name == "width") {
                    //rect.width = value;
                    container.setSize({width: value});
                } else if (name == "height") {
                    container.setSize({height: value});
                } else {
                    target[name] = value;
                }
                return true;
            },
        });
        return self;
    },
}

M.new = Util.constructor(M);
module.exports = M;
