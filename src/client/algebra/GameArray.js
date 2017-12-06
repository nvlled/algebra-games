let Vec = require("src/client/algebra/Vec");
let Util = require("src/client/algebra/Util");

// Decoupled array operations
// drop(→)
// drop(↓)
// 0 0 0 0 0 0 0
// 0 0 1 0 0 0 0
// 0 1 1 1 0 0 0
// 0 0 X 0 0 0 0
// 0 0 0 0 0 0 0
// 0 0 0 1 0 0 0
// 0 1 1 1 0 0 0

// 0 1 2 3 4 5 6
// 0 0 0 0 0 0 0 0
// 0 0 0 1 1 0 0 1
// 0 0 0 1 0 0 0 2
// 0 0 0 0 0 0 0 3

// the algorithm doesn't
// work on disjoint block
// 0 1 2 3 4 5 6
// 0 1 0 0 0 0 0 0
// 1 0 0 0 0 0 0 1
// 0 0 0 0 1 0 0 2
// 0 0 0 1 0 0 1 3
// 1 1 0 0 0 0 0 4
// 0 0 0 1 1 0 0 5
//
// rotation:
// 0 1 2 3 4 5 6
// 0 0 0 0 0 0 0 0
// 0 0 1 0 0 0 0 0
// 0 0 1 x 1 0 0 2
// 0 0 0 0 0 0 0 3
// 0 0 0 1 1 0 0 4
// 0 0 0 x 0 0 0 5
// 0 0 0 1 0 0 0 6
// 0 0 0 0 0 0 0 7

// drop algorithm
// lowest = dir.scale(rows-1)

// It's like group by column, only more general
let GROUPIDX = Symbol();
function groupBy(dir, points) {
    dir = Vec.new(dir).rotateRight();
    let groupMap = {};
    let i = 0;
    for (let p of points) {
        let k = Vec.dot(dir, p);
        if (!groupMap[k])
            groupMap[k] = [];
        groupMap[k].push(p);
        p[GROUPIDX] = i;
        i++;
    }
    let groups = [];
    for (let [_, group] of Object.entries(groupMap)) {
        // sort each group so that the first elem
        // of each group is the farthest towards dir
        group.sort((a, b) => {
            return Vec.dot(dir, b) - Vec.dot(dir, a);
        });
        groups.push(group);
    }
    return groups;
}

//
// Friendly reminder: floor the numbersss
//
let M = {
    // note to self:
    // always take an object as a parameter on create()

    new(obj) {
        return Util.wrap(M.create(obj), M.Proto);
    },

    create({
        rows=3,
        cols=3,
        nil,
        data=[]
    } = {}) {
        data.length = rows*cols;
        return {rows, cols, nil, data};
    },

    async generateMaze(self, {
        viewerFn= _=>Promise.resolve(),
    } = {}) {
        let dirs = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
        let vec = Vec.new;
        let indexOf = pos => M.indexOf(self, pos);
        let visited = {};
        let isVisited = pos => !! visited[indexOf(pos)];
        let visit = (pos) => {
            visited[indexOf(pos)] = true;
            M.remove(self, pos);
        }
        let canVisit = pos => !isVisited(pos) && !M.outbounds(self, pos);
        let peek = xs => xs[xs.length-1];

        let stack = [vec(M.randomPos(self))];

        while (stack.length > 0) {
            let pos = peek(stack);
            if (!isVisited(pos)) {
                await viewerFn(pos);
                visit(pos);
            }

            let deadEnd = true;
            for (let dir of Util.shuffle(dirs)) {
                let pos_ = vec(pos).add(vec(dir).mul(2));
                if (canVisit(pos_)) {
                    let wallPos = vec(pos).add(dir);
                    await viewerFn(wallPos);
                    visit(wallPos);
                    stack.push(pos_);
                    deadEnd = false;
                    break;
                }
            }

            if (deadEnd)
                stack.pop();
        }
    },

    moveToCollision(self, {
        points=[],        // [{x,y} ...]
        dir={x: 0, y: 0}, // {x, y}
        rigid=true,
        apply=false
    } = {}) {
        M.detachPoints(self, points);
        let srcPoints = points;
        while (true) {
            let points_ = points.map(p => p.new().add(dir));
            if (points_.some(p => M.isOccupied(self, p)))
                break;
            points = points_;
        }
        let paths = srcPoints.map((p, i) => [p, points_[i]]);
        if (apply)
            M.apply(self, paths);
    },

    detachPoints(self, points) {
        let values = [];
        points.forEach(p => {
            values.push(M.get(self, p));
            M.remove(self, p);
        });
        return values;
    },

    move(self, {
        points=[],        // [{x,y} ...]
        dir={x: 0, y: 0}, // {x, y}
        rigid=true,
        apply=false
    } = {}) {
        let pointset = {};
        points.forEach(p => pointset[M.indexOf(self, p)] = true);
        let points_ = points.map(p => p.new().add(dir));
        let occupied = p => M.isOccupied(self, p) && !pointset[M.indexOf(self, p)]
        if (points_.some(occupied)) {
            return [];
        }
        let paths = points.map((p, i) => [p, points_[i]]);
        if (apply)
            M.apply(self, paths);
        return paths;
    },

    isFull(self) {
        for (let elem of self.data) {
            if (elem == self.nil) {
                console.log("isFull", elem, self.nil);
                return false;
            }
        }
        return true;
    },


    // I'm not sure how grouping will behave
    // on diagonal movements but oh well...
    //
    // dir = [0, 1]
    // [3,1].[1, 0] = 3*1 + 1*0 = 3
    // [3,2].[1, 0] = 3*0 + 2*0 = 3
    // dir = [0, 9]
    // [3,1].[1, 1] = 3*1 + 1*1 = 4
    // [3,2].[1, 1] = 3*1 + 2*1 = 5
    // [4,1].[1, 1] = 4*1 + 1*1 = 5
    // groupBy(rotate(dir)
    move2(self, {
        points=[],        // [{x,y} ...]
        dir={x: 0, y: 0}, // {x, y}
        rigid=true,
        apply=false
    } = {}) {

        let pointset = {};
        points.forEach(p => pointset[M.indexOf(self, p)] = true);

        // group by X=dot(rotate(dir), pos)
        // sort descending group by Y=dot(pos)
        // move only first elem of each group
        let points_ = [];
        for (let group of groupBy(dir, points)) {
            // BIG NOTE: checking for the first elem
            // only works for dir.len() == 1
            // Do a loop later, but keep things simple for now
            let head = group[0];
            if (!head) {
                continue;
            }

            let head_ = Vec.new(head).add(dir);
            if (!M.isOccupied(self, head_) ||
                    pointset[M.indexOf(self, head_)]) {
                for (let p of group) {
                    let i = p[GROUPIDX];
                    let p_ = Vec.new(p).add(dir);

                    if (M.outbounds(self, p_))
                        return [];

                    if (typeof i == "number")
                        points_[i] = [p, p_];
                    else
                        points_.push([p, p_]);
                };
            } else if (rigid) {
                return [];
            }
        }
        if (apply)
            M.apply(self, points_);
        return points_;
    },

    //embed(self, {
    //    pos={x: 0, y: 0},
    //    values=[],
    //    cols=0,
    //    rows=values.length/cols,
    //} = {}) {
    //},

    // insert({
    //  points: [vec(1, 0), vec(0, 1)],
    //  values: ['x', 'y', 'z'],
    //  value: 'w',
    //  )
    insert(self, {
        points=[],        // [{val, x,y} ...]
        data=[],
        nil='X'
    } = {}) {
        for (let i = 0; i < points.length; i++) {
            let v = data[i] == null ? nil : data[i];
            M.set(self, points[i], v);
        }
    },

    rotate(self, {
        points=[],        // [{x,y} ...]
        dir=1,
        pivot=0,          // the first element is the pivot by default
        //rigid=true,
        square=false,
        apply=false
    } = {}) {
        let pivotPoint = points[pivot];
        if (!pivotPoint) {
            console.log("invalid pivot:"+pivot);
            return [];
        }
        let pointset = {};
        points.forEach(p => pointset[M.indexOf(self, p)] = true);
        let occupied = p => M.isOccupied(self, p) && !pointset[M.indexOf(self, p)]

        let points_ = [];
        let rotate = Vec["rotate"+(dir > 0 ? "Right" : "Left")];

        if (square) {
            let indx = p => M.indexOf(self, p);
            points.forEach((p, i) => {
                let n = points.length;
                let p_ = points[(i+1)%n];
                points_.push([p, p_]);
            });
        } else {
            for (let p of points) {
                p = Vec.new(p);
                let v = rotate(p.new().sub(pivotPoint));
                let p_ = v.new().add(pivotPoint);
                if (M.outbounds(self, p_) || occupied(p_))
                    return [];
                points_.push([p, p_]);
            }
        }


        if (apply)
            M.apply(self, points_);
        return points_;
    },

    indexOf(self, {x, y}) {
        if (M.outbounds(self, {x, y}))
            return -1;
        return y*self.cols + x;
    },

    get(self, {x, y}) {
        if (M.outbounds(self, {x, y}))
            return self.nil;
        let i = M.indexOf(self, {x, y});
        return self.data[i];
    },

    set(self, {x, y}, item) {
        let i = M.indexOf(self, {x, y});
        if (i >= 0)
            self.data[i] = item;
    },

    remove(self, {x, y}) {
        if (M.outbounds(self, {x, y}))
            return;
        let i = M.indexOf(self, {x, y});
        let item = self.data[i];
        self.data[i] = self.nil;
        return item;
    },

    isOccupied(self, {x, y}) {
        if (M.outbounds(self, {x, y}))
            return true;
        let nil = self.nil;
        return M.get(self, {x, y}) != nil;
    },

    outbounds(self, {x, y}) {
        let {cols, rows} = self;
        let outY = y < 0 || y >= rows;
        let outX = x < 0 || x >= cols;
        return outX || outY;
    },

    randomPos(self) {
        let x = Math.floor(Math.random()*self.cols);
        let y = Math.floor(Math.random()*self.rows);
        return {x, y};
    },

    toString(self, ch) {
        let {data, cols, rows} = self;
        let lines = [];
        let size = cols*rows;

        data = data.slice();
        lines = ["#" + Util.range(cols).join(", ")];
        for (let i = 0; i < size; i+=cols) {
            let row = data.slice(i, i+cols);
            let pref = i == 0 ? "[" : " ";
            let suf  = i == cols*(rows-1) ? "]" : " #"+i/cols;
            lines.push(pref + row.map(p => {
                if (p == null)
                    return "X";
                if (ch != null)
                    return ch;
                return p;
            }).join(", ") + suf);
        }
        return lines.join("\n");
    },

    apply(self, paths) {
        paths = paths.filter(p => p);
        let values = M.detachPoints(self, paths.map(([p]) => p));
        paths.forEach(([_, p], i) => {
            M.set(self, p, values[i]);
        });
    },

    drop(self, {
        apply=false,
        dir,
    } = {}) {
        if (Vec.isHorizontal(dir))
            return M.dropHorizontal(self, {dir: dir.x, apply});
        else if (Vec.isVertical(dir))
            return M.dropVertical(self,   {dir: dir.y, apply});
        return [];
    },

    getNeighbours(self, {x, y}) {
        return [ Vec.left, Vec.right, Vec.down, Vec.up]
            .map(f => f({x, y}));
    },

    findPath(self, args) {
        var current = args.current;
        var start = args.start;
        var end = args.end;
        var fn = args.fn || function(_, cc) { cc() };
        var done = args.done || function(result) {};
        var speed = args.speed || 500;
        var trace = {};
        var visited = {};
        var frontier = [start];

        let indexOf = pos => M.indexOf(self, pos);
        function tracePath(pos) {
            var path = [pos];
            while(true) {
                var k = indexOf(pos);
                var prev = trace[k];
                if (!prev)
                    break;
                path.unshift(prev);
                pos = prev;
            }
            return path;
        }

        function isVisisted(pos) {
            var k = indexOf(pos);
            return visited[k] != null;
        }
        function visit(pos) {
            var k = indexOf(pos);
            visited[k] = true;
        }

        visit(start);

        function loop() {
            if (frontier.length <= 0) {
                done(null);
                return;
            }
            // FIX: trace[pos] = ...
            var pos = frontier.shift();
            fn(tracePath(pos), function() {
                if (Vec.equals(pos, end)) {
                    done(tracePath(pos));
                    return;
                }
                // TODO: add priorities
                var neighbours =
                    M.getNeighbours(self, pos)
                    .filter(function(pos) {
                        return !isVisisted(pos) && !M.isOccupied(self, pos);
                    });

                neighbours.forEach(function(pos_) {
                    var idx = indexOf(pos_);
                    trace[idx] = pos;
                    visit(pos_);
                });
                frontier = frontier.concat(neighbours);
                setTimeout(loop, speed);
            });
        }
        loop();
    },

    dropHorizontal(self, {
        limit=0,
        apply=false,
        dir=1,
    } = {}) {
        let {cols, rows} = self;
        let startX = dir > 0 ? cols : -1;

        let lastOccupied = [];
        {
            let x = startX-dir;
            for (let y = 0; y < rows; y++) {
                if (M.isOccupied(self, {x, y}))
                    lastOccupied[y] = x;
                else
                    lastOccupied[y] = x+dir;
            }
        }

        let points_ = [];
        let i = 0;
        for (let x = startX-dir*2; x >= 0 && x < cols; x-=dir) {
            for (let y = 0; y < rows; y++) {
                if (!M.isOccupied(self, {x, y}))
                    continue;
                let x_ = lastOccupied[y]-dir;
                if ((dir > 0 && x < x_)
                    || (dir < 0 && x > x_)) {
                    points_[i] = [
                        {x, y},
                        {x: x_, y},
                    ];
                    lastOccupied[y] = x_;
                } else {
                    lastOccupied[y] = x;
                }
                i++;
            }
        }
        if (apply)
            M.apply(self, points_);
        return points_;
    },

    dropVertical(self, {
        limit=0,
        apply=false,
        dir=1,
    } = {}) {
        let {cols, rows} = self;
        let startY = dir > 0 ? rows : -1;
        //let endX = dir > 0 ? 0 : cols;

        let lastOccupied = [];
        {
            let y = startY-dir;
            for (let x = 0; x < cols; x++) {
                if (M.isOccupied(self, {x, y}))
                    lastOccupied[x] = y;
                else
                    lastOccupied[x] = y+dir;
            }
        }

        let points_ = [];
        let i = 0;
        for (let y = startY-dir*2; y >= 0 && y < rows; y-=dir) {
            for (let x = 0; x < cols; x++) {
                if (!M.isOccupied(self, {x, y}))
                    continue;
                let y_ = lastOccupied[x]-dir;
                if ((dir > 0 && y < y_)
                    || (dir < 0 && y > y_)) {
                    points_[i] = [
                        {x, y},
                        {x, y: y_},
                    ];
                    lastOccupied[x] = y_;
                } else {
                    lastOccupied[x] = y;
                }
                i++;
            }
        }
        if (apply)
            M.apply(self, points_);
        return points_;
    },

}
M.Proto = Util.prototypify(M);

module.exports = M;
