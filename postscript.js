let fs = require('fs');
let ohm = require('ohm-js');
let assert = require('assert');
let contents = fs.readFileSync('postscript.ohm');
let parser = ohm.grammar(contents);

let _x = 0;
let _y = 0;
let o = [];
let pop = () => { return o.pop() };
let code = {
    // Canvas doesn't provide the ability to draw text along a
    // curve so we need to implement basic text another way and
    // just not support curved text yet.
    show: () => c.fillText(pop(), _x, _y),
    moveto: () => { _y = pop(); _x = pop(); c.moveTo(_x, _y) },
    newpath: () => c.beginPath(),
    stroke: () => c.stroke(),
    lineto: () => c.lineTo(pop(), pop()),
    pop: () => pop(),
    exch: () => { o = o.concat(o.splice(o.length-2).reverse()) },
    dup: () => o.push(o[o.length-1]),
    copy: () => { let n = pop(); o = o.concat(o.slice(o.length-n)) },
    index: () => { let n = pop(); o.push(o[o.length - n - 1]) },
    // TODO: roll
    clear: () => o.length = 0,
    count: () => o.push(o.length),
    
    curveto: () => c.bezierCurveTo(pop(), pop(), pop(), pop(), pop(), pop()),
    closepath: () => c.closePath(),
};

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
    PriExp_neg: (sign, e) => -1 * e.eval(),
    word: (left, right) => left.eval() + right.eval(),
    operator: e => call(e),
    number_fract: (a, b, c) => parseFloat(a.sourceString + '.' + c.sourceString),
    number_whole: e => parseInt(e.sourceString),
    string: (left, e, right) => e.sourceString,
})

function confirm(unparsed, stack) {
    v = semantics(parser.match(unparsed)).eval()
    assert.deepEqual(v, stack)
}

confirm('33', [33])
confirm('-33', [-33])
confirm('32.1', [32.1])
confirm('-33.1', [-33.1])
confirm('0 -33.1', [0, -33.1])

semantics.addOperation('run', {
    number: e => o.push(e.eval()),
    operator: e => call(e),
})

function run(unparsed, stack) {
    o.length = 0
    semantics(parser.match(unparsed)).run()
    console.log(o)
    assert.deepEqual(o, stack)
}

run('1 2 3 4 pop', [1, 2, 3])
run('1 2 3 4 exch', [1, 2, 4, 3])
run('1 2 3 4 dup', [1, 2, 3, 4, 4])
run('1 2 3 4 3 copy', [1, 2, 3, 4, 2, 3, 4])
run('1 2 3 4 3 index', [1, 2, 3, 4, 1])
run('1 2 3 4 clear', [])
run('1 1 1 1 count', [1, 1, 1, 1, 4])
