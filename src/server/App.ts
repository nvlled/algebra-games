import * as express from 'express'
import * as path from "path";
import * as models from "./models";

let bodyParser = require("body-parser");
let {sequelize, User} = models;

let routes = {
    "/initdb": function(req, res) {
        sequelize.authenticate()
            .error(_=> res.send("database nope"))
            .then(_=> {
                User.sync({force: true});
                res.send("database ok");
            });
    },

    "/login": function(req, res) {
        if (res.method == "POST") {
        }

        res.render("login", {
            username: req.query.username,
            password: "",
        });
    },

    "/mapeditor": require("./pages/mapeditor").router,

    "/register": async function(req, res) {
        async function postHandler(): Promise<string> {
            let {User} = models;
            let {username, password, password2} = req.body;

            if (username == "" || username == null) {
                return "username is required";
            }
            if (password == "") {
                return "password is required";
            }
            if (password != password2) {
                return "password does not match";
            }

            let usernameTaken = !! await User.findById(username);

            if (usernameTaken) {
                return "username is not available: " + username; 
            }

            User.create({
                username,
                password,
            });
            return "";
        }

        let msg = "";
        if (req.method == "POST") {
            msg = await postHandler();
        }
        if (msg) {
            res.render("register", {
                data: req.body,
                msg,
            });
        } else {
            res.redirect("/");
        }
    },
}

class App {
  public express

  constructor () {
    this.express = express()
    this.express.set("view engine", "ejs");
    this.mountRoutes()
  }

  private mountRoutes (): void {
    const router = express.Router()

    let dir = __dirname;
    router.get('/', (req, res) => {
        res.locals.dirname = "blah";
        res.locals.title = "some title";
        res.render("index");
    });
      
    //   router.all("/pages/:name", function(req, res) {
    //       res.render("pages/"+req.params.name, {
    //           models,
    //           data: req.query,
    //           req,
    //           res,
    //       });
    //   });




         router.get('/play', (req, res) => {
             res.render("play");
         });
      //    router.get('/:name.json', (req, res) => {
      //      res.json({
      //        message: req.params.name + ' Hello World!'
      //      })
      //    });
      //

    this.express.set("views", ["./views", "src/server/pages"]);
    this.express.engine("html", require("ejs").renderFile);
    this.express.use(bodyParser.urlencoded({ extended: true }));

    this.express.use('/', router);
    for (let path of Object.keys(routes)) {
        let handler = routes[path];
        if (handler.all != null)
            this.express.use(path, handler);
        else
            router.all(path, handler);
    }
    this.express.use('/static', express.static("static"));


  }
}

export default new App().express



