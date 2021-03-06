let fs = require('fs');
let ohm = require('ohm-js');
let assert = require('assert');
let Canvas = require('canvas');
//let contents = fs.readFileSync('postscript.ohm');

let contents = `
Postscript {
  Program = Exp+
  Exp = PriExp | word | operator | string
  PriExp
    = "-" number -- neg
    | number
  number
    = digit* "." digit+  -- fract
    | digit+             -- whole
  word            = "/" letter+
  operator        = letter+
  string          = "(" not_right_paren+ ")"
  not_right_paren = escaped_paren | ~")" any
  escaped_paren   = "\\\\" ")"
}
`

let parser = ohm.grammar(contents);

let _x = 0;
let _y = 0;
let o = [];
Image = Canvas.Image;
canvas = new Canvas(200, 200, 'svg');
var c = canvas.getContext('2d');
// Use capital letter for peeks instead of pops
let squashed = `
pop: a
exch: p a p b
dup: p A
copy: p slice -a
add: p a+b
div: p b/a
`
let code = {
    // Operand stack manipulation operators
    pop: () => o.pop(),
    exch: () => { o = o.concat(o.splice(o.length-2).reverse()) },
    dup: () => o.push(o[o.length-1]),
    copy: () => { let n = o.pop(); o = o.concat(o.slice(o.length-n)) },
    index: () => { let n = o.pop(); o.push(o[o.length - n - 1]) },
    roll: () => {
	let [j, n] = pop(2)
	if (j < 0) o.splice(n, 0, ...o.splice(-n, -j))
	if (j > 0) o.splice(-n+j, 0, ...o.splice(-j))
    },
    clear: () => o.length = 0,
    count: () => o.push(o.length),
    mark: () => o.push('['),
    cleartomark: () => { do { a = o.pop() } while (a != '[') },
    counttomark: () => { o.push(o.length-o.lastIndexOf('[')-1) },

    // Arithmetic and math operators
    add: () => o.push(o.pop() + o.pop()),
    div: () => {exch(); o.push(o.pop() / o.pop()) },
    ldiv: () => {exch(); o.push(Math.trunc(o.pop() / o.pop())) },
    mod: () => {exch(); o.push(o.pop() % o.pop()) },
    mul: () => o.push(o.pop() * o.pop()),
    sub: () => {exch(); o.push(o.pop() - o.pop()) },
    
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

function exch() { code['exch']() }
    
function* pop(n) {
    for (n; n>0; n--) yield o.pop()
}

function call(e) {
    console.log(`Calling ${e.sourceString}`)
    if (code[e.sourceString])
	code[e.sourceString](_x, _y)
    else
	console.log(`Operator ${e.sourceString} not defined`)
}

var semantics = parser.createSemantics()
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
	//assert.deepEqual(o, stack)
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

run('1 2 3 4 mark', [1, 2, 3, 4, '['])
run('1 2 3 4 mark 5 6 7 cleartomark', [1, 2, 3, 4])
run('1 2 3 mark 5 6 7 counttomark', [1, 2, 3, '[', 5, 6, 7, 3])

run(`newpath
     1  1 moveto
     91  1 lineto
     91 91 lineto
     1 91 lineto
     1  1 lineto
     91 91 lineto
     stroke
`)
fs.writeFile('out.svg', canvas.toBuffer());
