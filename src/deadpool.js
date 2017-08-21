
let deadpool = new WeakSet();

module.exports = {
    create() {
        if (
        let obj = {};
        return obj;
        //deadpool.add(obj);
    },
    free(obj) {
        deadpool.add(obj);
    },
}
