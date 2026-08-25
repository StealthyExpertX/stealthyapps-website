const fs = require('fs');
const path = require('path');
const csstree = require('css-tree');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules']);
const WRITE = process.argv.includes('--write');

function sourceFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(target, output);
    } else if (/\.(?:html|js)$/.test(entry.name)) {
      output.push(target);
    }
  }
  return output;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
}

const corpus = sourceFiles(ROOT)
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
const stylesheetPath = path.join(ROOT, 'styles.css');
const stylesheet = fs.readFileSync(stylesheetPath, 'utf8');
const ast = csstree.parse(stylesheet, { positions: true });
const classes = new Map();

csstree.walk(ast, {
  visit: 'ClassSelector',
  enter(node) {
    classes.set(node.name, (classes.get(node.name) || 0) + 1);
  },
});

const missing = [...classes]
  .filter(([className]) => {
    const boundary = new RegExp(
      '(^|[^A-Za-z0-9_-])' + escapeRegex(className) + '([^A-Za-z0-9_-]|$)',
    );
    return !boundary.test(corpus);
  })
  .sort((left, right) => right[1] - left[1]);
const missingNames = new Set(missing.map(([className]) => className));
const optimizedAst = csstree.clone(ast);

csstree.walk(optimizedAst, {
  visit: 'Rule',
  enter(node, item, list) {
    if (!node.prelude || node.prelude.type !== 'SelectorList') return;
    node.prelude.children.forEach((selector, selectorItem, selectorList) => {
      var impossible = false;
      csstree.walk(selector, {
        visit: 'ClassSelector',
        enter(classNode) {
          if (missingNames.has(classNode.name)) impossible = true;
        },
      });
      if (impossible) selectorList.remove(selectorItem);
    });
    if (node.prelude.children.isEmpty) list.remove(item);
  },
});

const optimized = csstree.generate(optimizedAst);

if (WRITE && missing.length) {
  const edits = [];
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      if (!node.prelude || node.prelude.type !== 'SelectorList') return;
      const selectors = [];
      node.prelude.children.forEach((selector) => {
        let impossible = false;
        csstree.walk(selector, {
          visit: 'ClassSelector',
          enter(classNode) {
            if (missingNames.has(classNode.name)) impossible = true;
          },
        });
        selectors.push({ impossible, source: csstree.generate(selector) });
      });
      const retained = selectors.filter((selector) => !selector.impossible);
      if (retained.length === selectors.length) return;
      if (!retained.length) {
        edits.push({ start: node.loc.start.offset, end: node.loc.end.offset, value: '' });
        return;
      }
      edits.push({
        start: node.prelude.loc.start.offset,
        end: node.prelude.loc.end.offset,
        value: retained.map((selector) => selector.source).join(',\n'),
      });
    },
  });

  edits.sort((left, right) => right.start - left.start);
  const overlap = edits.some((edit, index) => {
    const previous = edits[index - 1];
    return previous && edit.end > previous.start;
  });
  if (overlap) throw new Error('Refusing overlapping CSS cleanup edits');

  let cleaned = stylesheet;
  edits.forEach((edit) => {
    cleaned = cleaned.slice(0, edit.start) + edit.value + cleaned.slice(edit.end);
  });
  fs.writeFileSync(stylesheetPath, cleaned);
}

console.log(
  JSON.stringify(
    {
      totalClasses: classes.size,
      missingClasses: missing.length,
      missingSelectorReferences: missing.reduce(
        (total, entry) => total + entry[1],
        0,
      ),
      sourceBytes: Buffer.byteLength(stylesheet),
      optimizedBytes: Buffer.byteLength(optimized),
      wroteCleanup: WRITE && missing.length > 0,
      missing,
    },
    null,
    2,
  ),
);

if (!WRITE && missing.length) process.exitCode = 1;
