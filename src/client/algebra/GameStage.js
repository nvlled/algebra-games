let PIXI = require("src/client/pixi");
let Util = require("src/client/algebra/Util");
let Anima = require("src/client/algebra/Anima");
let Bouton = require("src/client/algebra/Bouton");
let Table = require("src/client/algebra/Table");
let PixiUtil = require("src/client/algebra/PixiUtil");
let Layout = require("src/client/algebra/Layout");
let Menu = require("src/client/algebra/Menu");
let FixedContainer = require("src/client/algebra/FixedContainer");
let Sound = require("src/client/algebra/Sound");

let gridSize = 50;
let M = {
    create({
        view,
        resources,
        width=600,
        height=400,
        background="", 
    } = {}) {
        let {Container, Graphics, Sprite} = PIXI;
        let self = new Container();

        self.view = view;
        self.resources = resources;
        self.worldWidth  = width;
        self.worldHeight = height;

        self.grid = new Graphics();
        self.world = FixedContainer.create(width, height);

        //let mask = PixiUtil.roundedRect({
        //    width: 100, height: 100,
        //});
        //self.world.mask = mask;
        //self.world.addChild(mask);

        self.ui = FixedContainer.create(width, height);

        self.grid = FixedContainer.create(width, height);

        self.addChild(self.world);
        self.addChild(self.ui);
        self.bg = new Sprite(background);
        if (background) {
            // TODO: move background on separate layer
            self.world.addChild(self.bg);
            self.bg.width = width;
            self.bg.height = height;
        }
        self.world.addChild(self.grid);

        self.grid.x = 0;
        self.grid.y = 0;

        self.watchSprite = null;
        self.spriteOffset = {x: 0, y: 0};

        self.menu = null;
        self.modules = [];
        self.showHelp = () => {};

        return self;
    },

    startModule(self, mod) {
        let game = mod.new({
            gameStage: self,
            resources: self.resources,
        });
        self.fadeInBackground();
        let curMod = Util.last(self.modules);
        if (curMod && curMod.pause) {
            curMod.pause();
        }
        self.modules.push(game);
        game.init();
        game.start();
        setTimeout(function() {
            Sound.playMusic();
        }, 1000);
    },

    exitModule(self) {
        let mod = Util.last(self.modules);
        if (mod) {
            if (mod.stop)
                mod.stop();
            self.modules.pop();
        }
        M.fadeOutBackground(self);
        mod = Util.last(self.modules);
        if (mod && mod.resume) {
            mod.resume();
        }
    },

    createMenuBar(self) {
        let w = 29;
        let h = 29;
        let bgcolor  = 0xdddd00;
        let bgcolor2 = 0xffff00;
        let btnMenu = Bouton.new({
            color: 0x0000dd,
            alpha: 1.0,
            width: w,
            height: h,
            image: "menu",
            bgcolor,
            bgcolor2,
            //bgalpha: 0,
            bgalpha2: 9,
            toggle: true,
            stretchImage: false,
            tap() {
                M.showMenu(self);
            },
        });

        let btnHelp = Bouton.new({
            color: 0x0000dd,
            alpha: 1.0,
            width: w,
            height: h,
            image: "help",
            bgcolor,
            bgcolor2,
            stretchImage: false,
            //toggle: true,
            tap() {
                if (self.showHelp)
                    self.showHelp();
            },
        });

        let btnSound = Bouton.new({
            color: 0x0000dd,
            alpha: 1.0,
            width: w,
            height: h,
            image: "soundon",
            image2: "soundoff",
            bgcolor,
            bgcolor2,
            toggle: true,
            stretchImage: false,
            tap() {
                if (btnSound.checked) {
                    Sound.unmuteMusic();
                } else {
                    Sound.muteMusic();
                }
                //console.log("X");
            },
        });

        let menuBar = Table.row({margin: 15}, 
            [btnMenu, btnHelp, btnSound]);
        menuBar.border.width = self.world.width;

        //let btn = Bouton.new({
        //    color: 0xffff00,
        //    image: "static/images/gui/transparentLight/transparentLight31.png",
        //    fitImage: true,
        //    width: 45,
        //    height: 45,
        //    alpha: 0,
        //    color: 0x0000dd,
        //    alpha: 1.0,
        //    width: 25,
        //    height: 25,
        //    image: "menu",
        //    bgcolor: 0xffff00,
        //    bgcolor2: 0x33aa33,
        //    bgalpha: 0,
        //    bgalpha2: 9,
        //    //toggle: true,
        //    tap() {
        //    },
        //});
        //btn.scale.set(0.5);
        //let menuBar = PixiUtil.roundedRect({
        //    color: 0x222222,
        //    width: self.world.width, height: 30, alpha: 0.4,
        //    x: 0,
        //    y: 0,
        //    radius: 0,
        //});
        //btn.x = 0;
        //btn.y = 0;
        //btn.pointerup = _=> {
        //    M.showMenu(self);
        //};
        //Layout.row(
        //    { container: menuBar,
        //        stretch: false,
        //     margin: 5},
        //    btn);
        self.menuBar = menuBar;
        M.addUI(self, menuBar);
    },

    showMenuBar(self, animate=true) {
        let {menuBar} = self;
        menuBar.visible = true;
        if (animate) {
            return Anima.move(menuBar, {
                start: {y: -menuBar.height}, 
                end: {x: menuBar.marginX/2, y: menuBar.marginY/2},
            });
        }
    },

    hideMenuBar(self, animate=true) {
        let {menuBar} = self;
        if (animate) {
            return Anima.move(menuBar, 
                       { 
                           end: {y: -menuBar.height},
                           start: {x: menuBar.marginX/2, y: menuBar.marginY/2}, 
                           seconds: 0.5,
                       })
                 .then(_=> menuBar.visible = false);
        }
    },

    createMenu(self, opts, items) {
        let oldMenu = self.menu
        if (oldMenu) {
            (async () => {
                if (oldMenu.hideAnima) {
                    await oldMenu.hideAnima();
                } else {
                    await Anima.slideOut(oldMenu, {end: {y:-1}});
                }
                oldMenu.destroy(true);
            })();
        }
        let menu = Menu.create(opts, items);
        menu.onShow = opts.onShow;
        menu.onHide = opts.onHide;
        menu.showAnima = opts.showAnima;
        menu.hideAnima = opts.hideAnima;
        self.menu = menu;
        if (!opts.hide)
            M.showMenu(self);
        return menu;
    },

    setMenu(self, menu, animation=null) {
        let oldMenu = self.menu
        if (oldMenu) {
            Anima.fade(oldMenu, {end: 0})
                 .then(_=> {
                     oldMenu.destroy(true);
                 });
        }
        self.menu = menu;
        M.showMenu(self, animation);
    },

    hideMenu(self, {showMenuBar=true, animation=null} = {}) {
        if (showMenuBar)
            M.showMenuBar(self);
        let menu = self.menu;
        if (!menu)
            return;
        if (menu.onHide)
            menu.onHide();

        animation = animation || menu.hideAnima;
        if (typeof animation == "function") {
            return animation(self.menu);
        } else {
            return Anima.slideOut(menu, {end: {y: -1}});
        }
        //return Anima.move(menu, {end: {y: -menu.height*1.1}});
    },

    showMenu(self, animation=null) {
        let menu = self.menu;
        if (!menu)
            return;

        M.hideMenuBar(self);
        M.addUI(self, menu);
        Layout.centerOf({animate: false}, self.ui, menu);
        if (menu.onShow)
            menu.onShow();

        animation = animation || menu.showAnima;
        if (typeof animation == "function") {
            return animation(self.menu);
        } else {
            //menu.y = -menu.height;
            //return Layout.centerOf({animate: true}, self.ui, menu);
            return Anima.slideIn(menu, {start: {y: -1}});
        }
    },

    clearWorld(self) {
        for (let s of self.world.children) {
            if (s == self.bg)
                continue;
            s.destroy({children: true});
        }
    },

    setBackground(self, imgPath) {
        self.bg.texture = PIXI.Texture.from(imgPath);
    },

    async changeBackground(self, imgPath) {
        await M.fadeOutBackground(self, 0.5);
        await M.fadeInBackground(self,  0.5, imgPath);
    },

    fadeOutBackground(self, seconds=1) {
        return Anima.fade(self.bg, {end: 0, seconds});
    },
    fadeInBackground(self, seconds=1, imgPath=null) {
        if (imgPath) {
            M.setBackground(self, imgPath);
        }
        return Anima.fade(self.bg, {end: 1, seconds});
    },

    drawGrid(self, g) {
        let {worldWidth, worldHeight} = self;
        g.lineStyle(1, 0xFF0000, 1);
        let x, y;
        for (x = 0.5; x < worldWidth; x+=gridSize) {
            for (y = 0.5; y < worldHeight; y+=gridSize) {
                g.moveTo(x, 0);
                g.lineTo(x, worldHeight);
                g.moveTo(0, y);
                g.lineTo(worldWidth, y);
            }
        }
        g.moveTo(x, 0);
        g.lineTo(x, worldHeight);
        g.moveTo(0, y);
        g.lineTo(worldWidth, y);
    },

    zoom(self, {x=self.scale.x, y=self.scale.y}) {
    },

    zoomBy(self, {step=0, x=step, y=step}) {
        let world = self.world;
        world.scale.x += x;
        world.scale.y += y;
    },
    move(self, {x=self.x, y=self.y}) {
        let world = self.world;
        world.x = -x*world.scale.x;
        world.y = -y*world.scale.y;
    },
    moveBy(self, {step=0, x=step, y=step}) {
        let world = self.world;
        world.x += x*world.scale.x;
        world.y += y*world.scale.y;
    },

    rotate(self, angle) {
        let world = self.world;
        world.rotation = angle;
    },
    rotateBy(self, step) {
        let world = self.world;
        world.rotation += step;
    },

    lookAt(self, sprite) {
    },

    async watch(self, sprite, seconds) {
        if (seconds == null) {
            self.watchSprite = sprite;
            return;
        }

        let {view, world} = self;
        let {x: sx, y: sy} = self.world.scale;
        let {width, height} = self.view;
        let sb = sprite.getBounds();

        let start = {x: self.world.x, y: self.world.y};
        let end = {
            x: -(sb.x-world.x) + width/2 - sb.width/2,
            y: -(sb.y-world.y) + height/2 - sb.height/2,
        }
        self.watchSprite = sprite;
        self.moving = true;
        await Anima.move(world, {start, end, seconds});
        self.watchSprite = sprite;
        self.moving = false;
    },

    add(self, sprite) {
        self.world.addChild(sprite);
    },

    addUI(self, sprite) {
        self.ui.addChild(sprite);
    },

    //update(self) {
    //    let view = self.view;
    //    let sprite = self.watchSprite;
    //    if (sprite) {
    //        let {x: sx, y: sy} = self.world.scale;
    //        let {width, height} = self.view;
    //        let x = -sprite.x*sx + width/2;
    //        let y = -sprite.y*sy + height/2;
    //        self.world.x += (x-self.world.x/sx)*0.05;
    //        self.world.y += (y-self.world.y/sy)*0.05;
    //    }
    //},
    update2(self) {
        let view = self.view;
        let sprite = self.watchSprite;
        if (sprite) {
            let {x: sx, y: sy} = self.world.scale;
            let {width, height} = self.view;
            //self.world.pivot.set(-width/2/sx, -height/2/sy);
            //self.world.x = -sprite.x*sx;
            //self.world.y = -sprite.y*sy;
            self.world.x = -sprite.x*sx + width/2 - sprite.width*sx/2;
            self.world.y = -sprite.y*sy + height/2 - sprite.height*sx/2;
            //self.world.x = (sprite.x)/self.world.scale.x;
            //self.world.y = (sprite.y)/self.world.scale.y;
        }
    },

    update(self) {
        if (self.moving)
            return;
        let {view, watchSprite: sprite, world} = self;
        if (sprite && !sprite._destroyed) {
            let {x: sx, y: sy} = self.world.scale;
            let {width, height} = self.view;
            let sb = sprite.getBounds();

            let oldPos = {x: self.world.x, y: self.world.y};
            
            self.world.x = -(sb.x-world.x) + width/2 - sb.width/2;
            self.world.y = -(sb.y-world.y) + height/2 - sb.height/2;
        } else {
            self.watchSprite = null;
            self.world.x = 0;
            self.world.y = 0;
        }
    },

    toWorldPos(self, {x, y}) {
        let [sx, sy] = [1, 1];
        let [px, py] = [0, 0];
        let {scale,position} = self.world;
        [sx, sy] = [scale.x, scale.y];
        [px, py] = [position.x, position.y];

        x /= sx;
        y /= sy;
        x += px;
        y += py;

        return {x, y};
    },

    start(self) {
        if (self._update)
            return;
        self._update = _=> M.update(self);
        PIXI.ticker.shared.add(self._update);
    },
    stop(self) {
        PIXI.ticker.shared.remove(self._update);
        self._update = null;
    },
}
M.new = Util.constructor(M);
module.exports = M;
