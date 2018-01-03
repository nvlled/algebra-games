let Util = require("src/client/algebra/Util");

let M = {
    create({label, val=0, size=10, format=x=>x} = {}) {
        let self = new PIXI.Text("*".repeat(size), {align: "left", fill: 0xffffff});

        self.format = format;
        self.value = format(val);
        self.label = label;
        setTimeout(function() {
            if (label != "")
                self.text = label+": " + self.value;
            else
                self.text = self.value;
        });

        return self;
    }
}
let proxy = Util.proximate(({setter, getter, forward}) => {
    return {
        value: {
            set(self, val) {
                self.value = val;
                if (self.label != "")
                    self.text = self.label+": " + self.format(val);
                else
                    self.text = self.format(self.value);
            },
        }
    }
});
M.new = Util.constructor(M, proxy);
module.exports = M;
