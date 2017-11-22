let Util = require("src/client/algebra/Util");

let Inspector = {
    new(...args) {
        return Util.wrap(Inspector.create(...args), Proto);
    },

    create(textObj) {
        let m = {
            pixiText: textObj,
            items: [],
        }

        Object.setPrototypeOf(m, textObj);
        return m;
        //textObj.items = [];
        //return textObj;
    },

    add(self, obj, props, caption) {
        self.items.push([obj, props, caption]);
    },

    update(self) {
        let t = self;
        t.text = "";
        for (let [obj, props, name=""] of self.items) {
            t.text += name+": " + props.map(p => {
                let v = obj[p];
                if (v.toFixed)
                    v = v.toFixed(2);
                return p+"="+v;
            }).join(", ").trim() + "\n";
        }
    },

    setColor(self, color) {
        self.style.fill = color;
    }
}
let Proto = Util.prototypify(Inspector, function(k, v) {
    return ["new", "create"].indexOf(k) < 0;
});

module.exports = Inspector;



