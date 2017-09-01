let Util = {};

Util.extract = function(obj, ...keys) {
    return keys.map(k => obj[k]);
}

// underscore's extend
Util.extend = function(obj, ...sources) {
    sources.forEach(source => {
        let descriptor, prop;
        if (source) {
            for (prop in source) {
                descriptor = Object.getOwnPropertyDescriptor(source, prop);
                Object.defineProperty(obj, prop, descriptor);
            }
        }
    });
    return obj;
}
//Util.extend = Object.assign;

Util.wrap = function(obj, ext) {
    let m = Util.extend({}, ext);
    Object.setPrototypeOf(m, obj);
    return m;
}

Util.wrapAll = function(obj, ...exts) {
    let m = {};
    for (let ext of exts) {
        Util.extend({}, ext);
    }
    Object.setPrototypeOf(m, obj);
    return m;
}

Util.markWrap = function(fn) {
    fn.__wrappable__ = true;
    return fn;
}

Util.contextualize = function(fn) {
    return function(...args) {
        return fn(this, ...args);
    }
}

Util.doWhile = function(cond, body) {
    return new Promise(resolve => {
        let ticker = new PIXI.ticker.Ticker();
        let time = 0;
        let loop = _ => {
            let elapsed = ticker.elapsedMS;
            body(elapsed, time);
            if (!cond(elapsed, time)) {
                ticker.remove(loop);
                ticker.stop();
                resolve();
            }
            time += elapsed;
            //console.log(">", elapsed, time);
        }
        ticker.add(loop);
        ticker.start();
    });
}

//function injectProto(pu, newProto) {
//    let proto = pu.__proto__;
//    pu.__proto__ = extend({}, newProto);
//    pu.__proto__.__proto__ = proto; // puprrroto
//    return pu;
//}

//function prototypify__(mod) {
//    let mod_ = {};
//    Object.keys(mod).forEach(function(k) {
//        let prop = mod[k];
//        mod_[k] = contextualize(prop);
//    });
//    return mod_;
//}

Util.markGetterSetter = function(fn) {
    fn.___whatareyoudoingahaha___ = "html";
    return fn;
}
Util.isGetterSetter = function(fn) {
    return !! fn.___whatareyoudoingahaha___;
}

Util.prototypify = function(mod, shouldWrap = _=>true) {
    let mod_ = {};
    Object.keys(mod).forEach(function(k) {
        let prop = mod[k];
        if (typeof prop != "function") {
            mod_[k] = prop;
            return;
        }
        if (shouldWrap(k, prop)) {
            let prop_ = Util.contextualize(prop);
            if (Util.isGetterSetter(prop)) {
                Object.defineProperty(mod_, k, {
                    get: prop_,
                    set: prop_,
                    enumerable: true,
                });
            } else {
                mod_[k] = prop_;
            }
        }
    });
    return mod_;
}

Util.compose = function(...fs) {
    return function(...args) {
        let result = args
        for (let f of fs) {
            if (typeof f == "function")
                result = f(...result);
        }
        return result;
    }
}

Util.partial = function(fn, obj) {
    return function(...args) {
        return fn(obj, ...args);
    }
}

Util.prox = function(obj, proto) {
    let proxy = new Proxy(
        obj, 
        {
            get(obj, name) {
                let desc = Object.getOwnPropertyDescriptor(proto, name);
                if (desc && desc.get) 
                    return desc.get.call(obj);

                let val = obj[name]
                if (val != null)
                    return val;
                let prop = proto[name];
                return prop;
            },
            set(obj, name, val) {
                let desc = Object.getOwnPropertyDescriptor(proto, name);
                if (desc && desc.set)
                    desc.set.call(obj, val);
                else
                    obj[name]  = val;
                return true;
            },
        }
    );
    proxy.__target = obj;
    proxy.__proto = proto;
    return proxy;
}
Util.prox2 = function(obj, proto) {
    return new Proxy(
        obj, 
        {
            get(obj, name) {
                let val = obj[name]
                if (val != null)
                    return val;
                let prop = proto[name];
                if (typeof prop == "function")
                    return Util.partial(prop, obj);
            },
        }
    );
}

Util.remove = function(array, obj) {
    let i = array.indexOf(obj);
    if (i < 0)
        return;
    array.splice(i, 1);
}

Util.range = function(n) {
    let xs = [];
    for (let i = 0; i < n; i++)
        xs.push(i);
    return xs;
}

Util.or = function(...args) {
    for (let x of args)
        if (x != null)
            return x;
    return null;
}

Util.constructor = function(module) {
    if (typeof module.create != "function")
        throw "invalid module, need create function";
    if (! module.Proto)
        module.Proto = Util.prototypify(module);
    return function(...args) {
        return Util.wrap(module.create(...args), module.Proto);
    }
}

Util.rightpad = function(str, n, ch) {
    if (str.length > n)
        return str;
    return str + ch.repeat(n-str.length);
}

Util.leftpad = function(str, n, ch) {
    if (str.length > n)
        return str;
    return ch.repeat(n-str.length) + str;
}

Util.randomIndex = function(array) {
    return Math.floor(Math.random()*array.length);
}

Util.isSet = function(obj) {
    return obj instanceof WeakSet ||
        obj instanceof Set;
}

Util.randomSelect = function(array, exclude={}, fail=true) {
    let i = 0;
    let n = array.length*3;
    while (n) {
        let idx = Util.randomIndex(array);
        let x = array[idx];
        if (Util.isSet(exclude)) {
            if (!exclude.has(x) && !exclude.has(idx))
                return [x, idx];
        } else {
            if (!exclude[x] && !exclude[idx])
                return [x, idx];
        }
        i++;
    }
    if (fail)
        throw "failed to select a random element";
    return [];
}

Util.randomPair = function(keys, vals) {
    let pairs = {};
    let exclude = {};

    let n = Math.min(keys.length, vals.length);
    if (keys.length > vals.length)
        throw "overabundance of keys";
    //keys.splice(n);
    //vals.splice(n);

    for (let k of keys) {
        let [val, idx]  = Util.randomSelect(vals, exclude);
        pairs[k] = val;
        exclude[idx] = true;
    }
    return pairs;
}

Util.parseQueryParams = function(paramStr) {
    let pairs = window.location.search
        .slice(1)
        .split("&")
        .map(e => e.split("="));

    let params = {};
    for (let [k, v] of pairs) {
        params[k] = v;
    }
    return params;
}

Util.nextItem = function(array, x, wrap=false) {
    let i = array.indexOf(x);
    if (i < 0)
        return null;
    i++;
    if (i < array.length)
        return array[i];
    if (wrap)
        return array[0];
    return null;
}

// lazy shuffling
Util.shuffle = function(array) {
    for (let i = 0; i < array.length; i++) {
        let a = Util.randomIndex(array);
        let b = Util.randomIndex(array);
        let [x,y] = [array[a], array[b]];
        [array[a], array[b]] = [x, y];
    }
}

Util.pickIndices = function(array, indices) {
    return array.filter((_, i) => indices.indexOf(i) >= 0);
}

Util.sleep = function(millis) {
    return new Promise(resolve => {
        setTimeout(resolve, millis);
    });
}

Util.a2z = "abcdefghijklmnopqrstuvwxyz";
Util.nums = "0123456789";
Util.alphanum = Util.a2z+Util.nums;

Util.stateName = function(vec) {
    if (vec.x == 0 && vec.y < 0)
        return "up";
    if (vec.x == 0 && vec.y > 0)
        return "down";
    if (vec.y == 0 && vec.x > 0)
        return "right";
    if (vec.y == 0 && vec.x < 0)
        return "left";
    return "idle";
};

function fluent(module, obj) {
    return new Proxy(
            obj,
            {
                get(obj, k, receiver) {
                    let f = module[k];
                    if (typeof f !== "function")
                        return f;
                    return function(...args) {
                        f(obj, ...args);
                        return receiver;
                    }
                },
            });
}

function leftBind(module, obj) {
    return new Proxy(
            obj,
            {
                get(obj, k, receiver) {
                    let f = module[k];
                    return function(...args) {
                        return f(obj, ...args);
                    }
                },
            });
}

module.exports = Util; 
