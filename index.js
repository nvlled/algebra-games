
import * as PIXI from "pixi.js";
import catpng from "./images/cat.png";
import Keyboard from "src/Keyboard";
import Phys from "src/Phys";

console.log(Keyboard);

function setup() {
    PIXI.loader
        .add("cat", catpng)
        .add("sheet1", "images/treasureHunter.json")
        .load(function() {
            let {
                Sprite,
                Container,
                loader: {resources},
            } = PIXI; 

            let renderer = PIXI.autoDetectRenderer(1000, 900);
            let stage = new Container();
            let cat = new Sprite(resources["sheet1"].textures["explorer.png"]);
            stage.addChild(cat);
            renderer.render(stage);

            document.body.appendChild(renderer.view);
        });
}

window.onload = setup;
