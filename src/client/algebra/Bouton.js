
let PIXI = require("src/client/pixi");
let Vec = require("src/client/algebra/Vec");
let Block = require("src/client/algebra/Block");
let Util = require("src/client/algebra/Util");
let Rect = require("src/client/algebra/Rect");
let Phys = require("src/client/algebra/Phys");
let Waypoint = require("src/client/algebra/Waypoint");
let Tileset = require("src/client/algebra/Tileset");
let Inspector = require("src/client/algebra/Inspector");
let PixiUtil = require("src/client/algebra/PixiUtil");
let SpriteSel = require("src/client/algebra/SpriteSel");
let GameArray = require("src/client/algebra/GameArray");
let Algebra = require("src/client/algebra/Algebra");
let GraphicAlgebra = require("src/client/algebra/GraphicAlgebra");
let GraphicTable = require("src/client/algebra/GraphicTable");
let EasingFn = require("src/client/algebra/EasingFn");
let Grid = require("src/client/algebra/Grid");
let Button = require("src/client/algebra/Button");
let TextureSet = require("src/client/algebra/TextureSet");
let AniSprite = require("src/client/algebra/AniSprite");
let GameStage = require("src/client/algebra/GameStage");
let FixedContainer = require("src/client/algebra/FixedContainer");
let Sound = require("src/client/algebra/Sound");

let M = {
    create({
        width=null,
        height=null,
        text,
        color=0xffffff,
        radius,
        bgcolor=0xbbbb11,
        bgcolor2=~bgcolor,
        bgalpha=1,
        bgalpha2=1,

        bgImageSize,
        image,
        image2,

        btnGroup=[],
        toggle=false,
        checked=true,

        stretchImage=true,
        fontSize=17,
        alpha=0.97,
        tint,
        fontStyle={},
        rectStyle={},
        pointerdown=Util.noop,
        pointerup=Util.noop,
        tap=Util.noop,

        pressDelay=500,

    } = {}) {
        fontStyle = Object.assign(
            fontStyle,
            {
                fill: color,
                fontSize,
            },
        );

        let pad = 1.5;
        let textObj = new PIXI.Text(text, fontStyle);
        width = Math.max(width, textObj.width*pad);
        height = Math.max(height, textObj.height*pad);

        textObj.wordWrapWidth = width;
        textObj.wordWrap = true;

        let rect = PixiUtil.roundedRect(Object.assign(rectStyle, {
            color: bgcolor,
            width,
            height,
            alpha,
            radius,
        }));
        textObj.anchor.set(0.5);
        rect.anchor.set(0.5);
        rect.interactive = true;
        rect.buttonMode = true;
        rect.alpha = bgalpha;

        let bgImage = new PIXI.Sprite();
        let bgMask = PixiUtil.roundedRect({
            width,
            height,
            alpha: 1,
            color: 0xffffff,
        });
        bgMask.anchor.set(0.5);

        if (image) {
            bgImage.texture = PIXI.Texture.from(image);
        }

        bgImage.anchor.set(0.5);
        bgImage.alpha = 1;
        if (bgImageSize) {
            bgImage.width = bgImageSize.width;
            bgImage.height = bgImageSize.height;
        } else if (stretchImage) {
            bgImage.width = width;
            bgImage.height = height;
        }
        bgImage.mask = bgMask;
        bgImage.addChild(bgMask);

        let self = new PIXI.Sprite();

        self.addChild(rect);
        if (bgImage)
            self.addChild(bgImage);
        self.addChild(textObj);

        //self.onResize = function(w, h) {
        //    rect.width = w;
        //    rect.height = h;
        //    bgMask.width = w;
        //    bgMask.height = h;
        //    if (stretchImage && bgImage) {
        //        bgImage.width = w*1.2;
        //        bgImage.height = h*1.2;
        //    }
        //    textObj.style.wordWrapWidth = w;
        //}

        self = Object.assign(self, {
            //container,
            rect,
            imagePath1: image,
            imagePath2: image2,
            bgcolor,
            bgcolor2,
            bgalpha,
            bgalpha2,
            bgImageSize,

            img: bgImage,
            text: textObj,
            bgMask,
            stretchImage,
            pad,
            pointerdown,
            pointerup,
            tap,
            alpha,
            tint,

            toggle,
            checked,
            btnGroup,
            pressDelay,
        });

        let lastClick = 0;
        M.resize(self, rect.width, rect.height);
        {
            rect.pointerdown = () => {
                if ((new Date() - lastClick) < self.pressDelay)
                    return;
                rect.color = self.bgcolor2
                rect.alpha = 1;
                if (self.pointerdown)
                    self.pointerdown(self);
            }
            rect.pointerup = () => {
                if ((new Date() - lastClick) < self.pressDelay)
                    return;
                rect.color = self.bgcolor;
                rect.alpha = self.alpha;

                if (self.toggle) {
                    self.checked = !self.checked;
                    if (self.checked) {
                        M.setChecked(self);
                    }
                }
                M.update(self);

                if (self.pointerup)
                    self.pointerup(self);
                if (self.tap)
                    self.tap(self);
                Sound.play("click");
                lastClick = new Date();
            }
            rect.pointerupoutside = () => {
                rect.color = self.bgcolor;
                rect.alpha = self.alpha;
            }
        }
        M.update(self);

        {
            //rect.pointerover = () => {
            //    rect.alpha *= 0.9;
            //    bgImage.alpha *= 0.9;
            //}
            //rect.pointerout = () => {
            //    rect.alpha = self.alpha;
            //    bgImage.alpha = self.alpha;
            //}
        }

        return self;
    },

    setImage(self, path) {
        self.img.texture = PIXI.Texture.from(path);
    },

    setBgcolor(self, color) {
        self.rect.tint = color;
    },

    setChecked(self) {
        for (let btn of self.btnGroup || []) {
            if (btn != self) {
                btn.checked = false;
                M.update(btn);
            }
        }
        self.checked = true;
        M.update(self);
    },

    update(self) {
        if (!self.toggle)
            return;

        let {
            imagePath1, imagePath2,
            bgcolor, bgcolor2,
            bgalpha, bgalpha2
        } = self;

        if (!self.checked) {
            if (imagePath2)
                M.setImage(self, imagePath2)
            if (bgcolor2)
                M.setBgcolor(self, bgcolor2)
            if (bgalpha2 != null)
                self.rect.alpha = bgalpha2;
        } else {
            if (imagePath1)
                M.setImage(self, imagePath1)
            if (bgcolor)
                M.setBgcolor(self, bgcolor)
            if (bgalpha != null)
                self.rect.alpha = bgalpha;
        }
    },

    resize(self, w, h) {
        let {rect, bgMask, img, text} = self;
        rect.width = w;
        rect.height = h;
        bgMask.width = w;
        bgMask.height = h;
        if (self.stretchImage) {
            img.width = w*1.0;
            img.height = h*1.0;
        } else {
            self.img.width = w*0.7;
            self.img.height = h*0.7;
        }

        let w2 = w/2;
        let h2 = h/2;
        rect.x = w2;
        rect.y = h2;
        text.x = w2;
        text.y = h2;
        img.x = w2;
        img.y = h2;

        text.style.wordWrapWidth = w;
    },

    resizeToText(self) {
        self.rect.width = self.text.width*self.pad;
        self.rect.height = self.text.height*self.pad;
    },
}

let proxy = Util.proximate(({setter, getter, forward}) => {
    return {
        //x: forward("container"),
        //y: forward("container"),

        width: {
            set: (self, val) => M.resize(self, val, self.rect.height),
            get: (self) => self.rect.width,
        },
        height: {
            set: (self, val) => M.resize(self, self.rect.width, val),
            get: (self) => self.rect.height,
        },

        tint: {
            get(self) {
                return self.rect.tint;
            },
            set(self, val) {
                self.rect.tint = val;
                if (self.img)
                    self.img.tint = val;
            },
        },
    }
});

M.new = Util.constructor(M, proxy);
module.exports = M;

