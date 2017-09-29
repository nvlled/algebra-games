let PIXI = require("pixi.js");
let Util = require("src/Util");

// Button.create({
//  text: "testing",
//  textStyle: {
//      normal: {},
//      hover:
//      click:
//  }
//  rectStyle: {
//  }
// })
let M = {
    create({
        text,
        bgimage,
        padding=20,
        alpha=0.9,

        pointerdown=()=>{},
        pointerup=()=>{},
        
        textStyle={
            normal: 0xffffff,
            hover: 0xaaffaa,
            click: 0xaaffff,
        },
        rectStyle={
            normal: 0xaa0000,
            hover: 0xbb0000,
            click: 0xdd0000,
        }
    }) {
        let container = new PIXI.Container();
        let buttonText = new PIXI.Text(text, {
            fill: textStyle.normal,
        });

        let bounds = buttonText.getBounds();
        let pad = padding;
        let rect = new PIXI.Graphics();

        let drawRect = (state="normal") => {
            rect.beginFill(rectStyle[state], alpha);
            rect.drawRoundedRect(bounds.x-pad/2, bounds.y-pad/2, 
                    bounds.width+pad, bounds.height+pad, 10);
            rect.endFill();
        }
        drawRect();

        let hovered = false;
        buttonText.interactive = true;
        buttonText.on("pointerover", () => {
            hovered = true;
            buttonText.style.fill = textStyle.hover;
            drawRect("hover");
        });
        buttonText.on("pointerout", () => {
            hovered = false;
            buttonText.style.fill = textStyle.normal;
            drawRect("normal");
        });
        buttonText.on("pointerdown", () => {
            pointerdown();
            buttonText.style.fill = textStyle.click;
            drawRect("click");
        });
        buttonText.on("pointerup", () => {
            pointerup();
            console.log("blah");
            if (hovered) {
                buttonText.style.fill = textStyle.hover;
                drawRect("hover");
            } else {
                buttonText.style.fill = textStyle.normal;
                drawRect("normal");
            }
        });

        container.addChild(rect);
        container.addChild(buttonText);
        return container;
    },
}

M.new = Util.constructor(M);
module.exports = M;


