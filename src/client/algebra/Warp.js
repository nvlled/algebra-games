
let M = {
    new(obj, module) {
        return M.create(obj, module)
    },
    create(obj, module) {
        let proxy;
        let result = null;
        let fn = x=>x;

        let fns = {
            result() { return result },
            //new() { obj = module.new(obj); return proxy; },
        }
        let method = (...args) => {
            result = fn(obj, ...args);
            return proxy;
        }
        proxy = new Proxy(
            obj, 
            {
                get(obj, name) {
                    let fn_ = fns[name];
                    if (typeof fn_ == "function") {
                        return fn_;
                    }
                    fn_ = module[name];
                    if (typeof fn_ != "function") {
                        throw name + " is not a method of the module ";
                    }
                    fn = fn_;
                    return method;
                },
                set(obj, name) {
                    if (name != "result")
                        throw "cannot assign to module wrapper: " + name;
                },
            }
        );
        return proxy;
    }
}

module.exports = M;

