let Util = require("src/client/algebra/Util");
let lsNamespace = "algames";

let key = name => lsNamespace+"."+name;

let M = {
    create({name, length=10, scoreField="score", desc=true} = {}) {
        let data;
        try {
            let k = key(name);
            data = JSON.parse(localStorage[k]);
        } catch (e) {  }

        data = data && data.slice(0, length) || [];

        let self = {
            name,
            scoreField,
            length,
            data,
            desc,
        }
        M.sort(self);
        return self;
    },

    sort(self) {
        let k = self.scoreField;
        if (self.desc)
            self.data.sort((a,b) => b[k]-a[k]);
        else
            self.data.sort((a,b) => a[k]-b[k]);
    },

    isHighscore(self, score) {
        if (self.data.length < self.length)
            return true;

        let k = self.scoreField;
        let minScore = Util.last(self.data)[k];
        if (self.desc)
            return score > minScore;
        return score < minScore;
    },

    addEntry(self, entry) {
        let k = self.scoreField;
        if (!entry || !entry[k])
            return;
        self.data.push(entry)

        M.sort(self);
        self.data = self.data.slice(0, self.length);
        M.save(self);
    },

    save(self) {
        localStorage[key(self.name)] = JSON.stringify(self.data);
    },
}
M.new = Util.constructor(M);
module.exports = M;


