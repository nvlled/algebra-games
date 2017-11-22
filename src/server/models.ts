//import {Sequelize} from "sequelize";
let Sequelize = require("sequelize");

let sequelize = new Sequelize("alg", "nvlled", "123", {
    host: "localhost",
    dialect: "postgres",
});


let User = sequelize.define("User", {
    username: {
        type: Sequelize.STRING,
        primaryKey: true,
    },
    fullname: Sequelize.STRING,
    password: Sequelize.TEXT,
});

export { sequelize, User };
