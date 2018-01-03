let Util = require("src/client/algebra/Util");
let Table = require("src/client/algebra/Table");
let UI  = require("src/client/algebra/UI");
let Anima  = require("src/client/algebra/Anima");

let M = {
    create({
        title="",
        items=[],
        closed=()=>{},
    }={}) {
        let theme = {
            textArgs: {fill: 0xffeeee},
            tableArgs: {
                margin: 10,
            },
            btnArgs: {
                width: 40,
                height: 40,
            },
        }
        let ui = UI.new(theme);
        let {
            img,
            fill, size, map, center, centerX, left, top, right, bottom,
            row, col, textBig, text, textSmall, minWidth, fillX,
            and, btn,slide, root, btnImg,
        } = ui.funcs();

        let slideContent = slide({
            items,
            //items: [
            //    ui.build(_=> row(
            //        img("racoon", 200, 200),
            //        text(`
            //            |Controls:
            //            |Use the arrow keys to blah
            //            |and some other foo blah 
            //            `),
            //    )),
            //    text("slide 1"),
            //    text("slide 2\nasdf asidjfaisdjf jaisdjfaisdf\asidfjasdi"),
            //    text("slide 3\nasdfasd\nasdfasdf\nasdfasdfsdf\nxcvxzcv\nasdifjasdf aisdjf\nasdifjasid"),
            //],
        });

        let component = ui.build( ({id}) => root(
            map(textBig(title), and(center, left)),
            slideContent,
            map(
                row(
                    id(btnImg("close"), "close"),
                    id(btnImg("left"), "left"),
                    id(btnImg("right"), "right"),
                ),
                left,
            )
        ));
        let btnLeft = component.getByID("left");
        let btnRight = component.getByID("right");
        let updateVisibility = () => {
            btnLeft.visible = true;
            if (!slideContent.hasPrev())
                btnLeft.visible = false;
            btnRight.visible = true;
            if (!slideContent.hasNext())
                btnRight.visible = false;
        }
        btnLeft.tap = function() {
            slideContent.prev();
            updateVisibility();
        }
        btnRight.tap = function() {
            slideContent.next();
            updateVisibility();
        }
        updateVisibility();
        component.getByID("close").tap = async function() {
            closed();
            await Anima.fade(component, {end: 0});
            component.destroy({children: true});
        }
        return component;
    }
}
M.new = Util.constructor(M);
module.exports = M;
