let Util = require("src/client/algebra/Util");
let Table = require("src/client/algebra/Table");
let Highscore = require("src/client/algebra/Highscore");
let Bouton = require("src/client/algebra/Bouton");
let lsNamespace = "algames";

let key = name => lsNamespace+"."+name;

let M = {
    create({data, button={}, excl={}} = {}) {
        let fn = Table.Align.funcs;
        let sp = name => PIXI.Sprite.fromImage(name);
        let text = (t,size=18) => new PIXI.Text(t, {fill: 0xffffff, fontSize: size});

        //let header = [];
        //let headerNames = Object.keys(data[0] || {});
        //if (headerNames.length > 0) {
        //    header = headerNames.map(f => text(f+"", 18));
        //}
        let userRows = data.map((user,i) => {
            return [text(`(${i+1})`)]
                .concat(Object.keys(user).map((k,j) => {
                    let f = user[k];
                    if (excl[j] || excl[k])
                        return null;
                    return f && text(f+"");
                }).filter(x => x));
                //.concat(Object.values(user).map((f,j) => {
                //    if (!excl[j])
                //        return f && text(f+""))
                //}).filter(x => x);
        });

        let buttonRow = [];
        if (button.text && button.tap) {
            buttonRow = [fn.map(Bouton.new(button), fn.left)];
        }

        let self = Table.new({
            marginX: 20,
            marginY: 15,
            tableFn: Util.compose(fn.left, fn.centerY),
        }, ({map, size, fill}) => [
            [text("Highscore", 22)],
            //[...header],
            ...userRows,
            [userRows.length == 0 ? text("(no record)") : text("") ],
            buttonRow,
        ]);
        return self;
    },
}

M.new = Util.constructor(M);
module.exports = M;

