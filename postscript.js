let fs = require('fs');
let ohm = require('ohm-js');
let assert = require('assert');
let contents = fs.readFileSync('postscript.ohm');
let parser = ohm.grammar(contents);

let _x = 0;
let _y = 0;
let o = [];
let code = {
    pop: () => o.pop(),
    exch: () => { o = o.concat(o.splice(o.length-2).reverse()) },
    dup: () => o.push(o[o.length-1]),
    copy: () => { let n = o.pop(); o = o.concat(o.slice(o.length-n)) },
    index: () => { let n = o.pop(); o.push(o[o.length - n - 1]) },
    //roll: () => {},
    clear: () => o.length = 0,
    count: () => o.push(o.length),
    
    // Canvas doesn't provide the ability to draw text along a
    // curve so we need to implement basic text another way and
    // just not support curved text yet.
    show: () => c.fillText(o.pop(), _x, _y),
    moveto: () => { _y = o.pop(); _x = o.pop(); c.moveTo(_x, _y) },
    newpath: () => c.beginPath(),
    stroke: () => c.stroke(),
    lineto: () => c.lineTo(o.pop(), o.pop()),
    curveto: () => c.bezierCurveTo(o.pop(), o.pop(), o.pop(), o.pop(), o.pop(), o.pop()),
    closepath: () => c.closePath(),
};

function* pop(n) {
    for (n; n>0; n--) yield o.pop()
}

code['roll'] = function() {
    let [j, n] = pop(2)
    if (j < 0) o = o.concat(o.splice(-n, -j))
    if (j > 0) o.splice(-n+j, 0, ...o.splice(-j))
}

function call(e) {
    console.log(`Calling ${e.sourceString}`)
    if (code[e.sourceString])
	code[e.sourceString](_x, _y)
    else
	console.log(`Operator ${e.sourceString} not defined`)
}

let semantics = parser.createSemantics()
semantics.addOperation('eval', {
    Exp: e => e.eval(),
    PriExp: e => e.eval(),
    PriExp_neg: (sign, e) => -e.eval(),
    word: (left, right) => left.eval() + right.eval(),
    number_fract: (a, b, c) => parseFloat(a.sourceString + '.' + c.sourceString),
    number_whole: e => parseInt(e.sourceString),
    string: (left, e, right) => e.sourceString,
})

function run(unparsed, stack) {
    o.length = 0
    let m = parser.match(unparsed)
    if (m.succeeded()) {
	semantics(m).run()
	console.log(o)
	assert.deepEqual(o, stack)
	return
    }
    console.log(m)
}

function push(a) {
    console.log(`Pushing ${a}`)
    return o.push(a)
}

semantics.addOperation('run', {
    PriExp_neg: (sign, e) => push(-e.eval()),
    number: e => push(e.eval()),
    string: (a, b, c) => push(b.sourceString),
    operator: e => call(e),
})

run('8 (a) (b) (c) 3 1 roll', [8, 'c', 'a', 'b'])
run('8 (a) (b) (c) 3 0 roll', [8, 'a', 'b', 'c'])
run('8 (a) (b) (c) 3 -1 roll', [8, 'b', 'c', 'a'])

run('1 2 3 4 pop', [1, 2, 3])
run('1 2 3 4 exch', [1, 2, 4, 3])
run('1 2 3 4 dup', [1, 2, 3, 4, 4])
run('1 2 3 4 3 copy', [1, 2, 3, 4, 2, 3, 4])
run('(a) (b) (c) (d) 0 index', ['a', 'b', 'c', 'd', 'd'])
run('(a) (b) (c) (d) 3 index', ['a', 'b', 'c', 'd', 'a'])
run('1 2 3 4 clear', [])
run('1 1 1 1 count', [1, 1, 1, 1, 4])


