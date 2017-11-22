let Backgrounds = require("src/client/algebra/Backgrounds");

let Grid = require("src/client/algebra/Grid");
let GameStage = require("src/client/algebra/GameStage");
let GridTiles = require("src/client/algebra/GridTiles");
let PIXI = require("src/client/pixi");

let renderer = null;

function blah() {
    renderer = PIXI.autoDetectRenderer(800, 600);
    renderer.options.antialias = true;
    renderer.view.onmousedown = e => e.preventDefault();
    document.body.querySelector("div.game").appendChild(renderer.view);

    Backgrounds.loadTextures(PIXI.loader);
    GridTiles.loadTextures(PIXI.loader);
    PIXI.loader
        .add("fireball", "/static/images/fireball.png")
        .load(main);
}

function main() {
    let resources = PIXI.loader.resources;

    let size = {
        rows: 9, cols: 4,
    }
    let tileSize = 50;
    let tileSpace = 1;
    let {randomTexture} = GridTiles;
    let gridTile = randomTexture(PIXI.loader.resources);
    let grid = Grid.new({
        x: 50, y: 50, 
        rows: size.rows, cols: size.cols, 
        tileSize, tileSpace, 
        interactive: true, 
        alpha: 1,
        tileMap: _ => gridTile,
    });
    grid.setInteractive();

    //var fball = new PIXI.Sprite(resources["fireball"].texture);
    var gameStage = GameStage.new({
        view: renderer,
        width: renderer.width-1,
        height: renderer.height-1,
        background: Backgrounds.random(resources).texture,
    });
    gameStage.start();
    PIXI.ticker.shared.add(_=> renderer.render(gameStage));
    PIXI.ticker.shared.add(_=> {
        if (grid.x < 300)
            grid.x++;
    });

    gameStage.world.addChild(grid);
    //gameStage.world.addChild(fball);

}

window.onload = blah;



