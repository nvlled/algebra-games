let Util = require("src/client/algebra/Util");

let SEP = "»»";
let concat = (...args) => args.join(SEP);

let M = {
    create({
        identity,
        table = [],
        strict = false,
        abelian = true,
    } = {}) {

        let SEP = "✗";

        let map = {};
        let arglenSet = new Set();
        let elemSet = new Set();
        let elemArgSet = new Set();

        table.forEach(args => {
            args.forEach(e => elemSet.add(e));
            if (args.length > 1)  {
                args.slice(0, args.length-1)
                    .forEach(e => elemArgSet.add(e));
            }

            args = args.slice();
            let z = args.pop();
            if (abelian) {
                args.sort();
            }
            arglenSet.add(args.length);
            let k = concat(...args);
            map[k] = z;
        });
        elemSet.delete(identity);

        let elems = Array.from(elemSet);
        let elemArgs = Array.from(elemArgSet);

        if (identity == null)
            identity = elems[0];
        else
            elems.push(identity);

        let arglens = [];
        for (let [x] of arglenSet.entries()) {
            arglens.push(x);
        }

        return {
            table,
            abelian,
            elems,
            elemArgs,
            identity,
            strict,
            map,
            arglens,
            maxarglen: Math.max(...arglens),
        };
    },

    elemAt(self, j, i) {
        let row = self.table[i];
        if (row) 
            return row[j];
        return null;
    },

    toString(self) {
        let colsizes = [];
        M.each(self, (x, _, j) => {
            let s = x+"";
            colsizes[j] = s.length;
        });

        let str = "";
        let i = 0;
        for (let row of self.table) {
            let j = 0;
            let array = [];
            for (let x of row) {
                array.push(Util.rightpad(x, colsizes[j], " "));
                j++;
            }
            str += array.join(" | ") + "\n";
            i++;
        }
        return str;
    },

    each(self, fn) {
        let i = 0;
        for (let row of self.table) {
            let j = 0;
            for (let x of row) {
                fn(x, i, j);
                j++;
            }
            i++;
        }
    },

    getMaxArgLen(self) {
        return self.maxarglen;
    },

    randomElement(self, withIdentity=true) {
        if (withIdentity)
            return Util.randomSelect(self.elems)[0];
        return Util.randomSelect(self.elems, {[self.identity]: true})[0];
    },

    getSize(self) {
        let {table} = self;
        let rows = table.length;
        let cols = table[0].length;
        return {rows, cols};
    }, 

    apply(self, ...elems) {
        if (self.abelian)
            elems = elems.sort();

        let k = concat(...elems);
        let z = self.map[k];

        if (z == null && self.strict)
            throw `undefined operation for (${elems})`; 

        return z;
    },
}
M.new = Util.constructor(M);

module.exports = M;
