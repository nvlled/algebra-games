import app from 'src/server/App';
import * as main from "src/client/algebra/main.js";
//let Scratch = require("./scratch");

window["g"] = main;
window.onload = main.setup;
