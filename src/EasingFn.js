
// source: https://gist.github.com/gre/1650294
/*
 * Easing Functions - inspired from http://gizma.com/easing/
 * only considering the t value for the range [0, 1] => [0, 1]
 */
let EasingFunctions = {
    // no easing, no acceleration
    linear: function (t) { return t },
    // accelerating from zero velocity
    inQuad: function (t) { return t*t },
    // decelerating to zero velocity
    outQuad: function (t) { return t*(2-t) },
    // acceleration until halfway, then deceleration
    inOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
    // accelerating from zero velocity 
    inCubic: function (t) { return t*t*t },
    // decelerating to zero velocity 
    outCubic: function (t) { return (--t)*t*t+1 },
    // acceleration until halfway, then deceleration 
    inOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
    // accelerating from zero velocity 
    inQuart: function (t) { return t*t*t*t },
    // decelerating to zero velocity 
    outQuart: function (t) { return 1-(--t)*t*t*t },
    // acceleration until halfway, then deceleration
    inOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
    // accelerating from zero velocity
    inQuint: function (t) { return t*t*t*t*t },
    // decelerating to zero velocity
    outQuint: function (t) { return 1+(--t)*t*t*t*t },
    // acceleration until halfway, then deceleration 

    outElastic(t) {
        var p = 0.3;
        return Math.pow(2,-10*t) * Math.sin((t-p/4)*(2*Math.PI)/p) + 1;
    },
}

module.exports = EasingFunctions;
