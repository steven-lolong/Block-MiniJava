/**
 * CESK panel smoke: drives the real stepper panel end-to-end under jsdom —
 * load a program, click Step to completion, and assert that every CESK
 * column (Control, Stack+Environment, Store, Kontinuation) rendered content
 * and the machine finished with the right output.
 * Run with: npm test (or node test/dist/smoke.bundle.js after test:build).
 */
import './smoke-jsdom';
import * as Blockly from 'blockly';
import { defineMiniJavaBlocks } from '../src/core/blocks/minijavaBlocks';
import { parseMiniJavaTextToWorkspaceState } from '../src/core/parser/minijavaTextParser';
import { MINI_JAVA_RENDERER_NAME, registerMiniJavaRenderer } from '../src/core/renderer/minijavaRenderer';
import { initStepperPanel } from '../src/core/ui/stepperPanel';

defineMiniJavaBlocks();
registerMiniJavaRenderer();

const SRC = `class Main {
  public static void main(String[] args) {
    System.out.println(new Counter().bump(40));
  }
}
class Counter {
  int n;
  public int bump(int k) {
    int t;
    t = k + 2;
    return t;
  }
}`;

const ids = ['stepper-control', 'stepper-frames', 'stepper-heap', 'stepper-kont'];
document.body.innerHTML =
  `<button id="stepper-load"></button><button id="stepper-back"></button>
   <button id="stepper-step"></button><button id="stepper-play"></button>
   <button id="stepper-gc"></button>
   <input id="stepper-gc-auto-enabled" type="checkbox" /><input id="stepper-gc-threshold" type="number" value="50" />
   <span id="stepper-status"></span><svg id="stepper-arrows"></svg>
   ${ids.map((i) => `<div id="${i}"></div>`).join('')}
   <pre id="stepper-output"></pre><pre id="bottom-program-output"></pre>`;

/** The panel's `getWorkspace` getter is captured once by `initStepperPanel`;
 * swapping this variable and clicking Load again is how this file re-loads a
 * different program into the SAME panel instance, without double-registering
 * its button listeners by calling `initStepperPanel` twice. */
let activeWorkspace = new Blockly.Workspace();

function loadIntoActiveWorkspace(source: string): void {
  activeWorkspace = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(parseMiniJavaTextToWorkspaceState(source), activeWorkspace);
  // Headless blocks lack the SVG-only methods the panel calls for highlighting.
  for (const b of activeWorkspace.getAllBlocks(false)) {
    (b as any).setHighlighted = () => undefined;
  }
  (activeWorkspace as any).centerOnBlock = () => undefined;
  document.getElementById('stepper-load')!.dispatchEvent(new (globalThis as any).Event('click'));
}

initStepperPanel(() => activeWorkspace as any);
loadIntoActiveWorkspace(SRC);

let failures = 0;
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}`);
  if (!ok) failures++;
};

// Exercise the registered renderer rather than duplicating its shape data in
// the test. Formal parameters use a curved arch so they stay visibly different
// from both the class stack's box and variable declarations' angular zigzag.
const RendererClass = Blockly.registry.getClass(
  Blockly.registry.Type.RENDERER,
  MINI_JAVA_RENDERER_NAME
) as unknown as new (name: string) => Blockly.blockRendering.Renderer;
const renderer = new RendererClass(MINI_JAVA_RENDERER_NAME);
renderer.init(Blockly.Themes.Classic);
const constants = renderer.getConstants();
const verticalShape = (nonTerminal: string): Blockly.blockRendering.Notch =>
  constants.shapeFor({
    type: Blockly.ConnectionType.PREVIOUS_STATEMENT,
    getCheck: () => [nonTerminal],
    targetConnection: null,
    getSourceBlock: () => ({ type: '' })
  } as unknown as Blockly.RenderedConnection) as Blockly.blockRendering.Notch;
const classShape = verticalShape('ClassDeclaration');
const variableShape = verticalShape('VarDeclaration');
const formalShape = verticalShape('FormalParameter');

check(
  'FormalParameter connector is distinct from other declarations',
  formalShape.pathLeft !== classShape.pathLeft && formalShape.pathLeft !== variableShape.pathLeft
);
check(
  'FormalParameter connector has the only curved silhouette',
  formalShape.pathLeft.includes(' c ') &&
    !classShape.pathLeft.includes(' c ') &&
    !variableShape.pathLeft.includes(' c ')
);
check(
  'FormalParameter preserves declaration connector spacing',
  formalShape.width === classShape.width && formalShape.width === variableShape.width
);

const stepBtn = document.getElementById('stepper-step')!;
const seen = { control: false, kont: false, heap: false, frames: false };
for (let i = 0; i < 200; i++) {
  stepBtn.dispatchEvent(new (globalThis as any).Event('click'));
  if (document.querySelector('#stepper-control .stepper-control-card')) seen.control = true;
  if (document.querySelector('#stepper-kont .stepper-kont-entry')) seen.kont = true;
  if (document.querySelector('#stepper-heap .stepper-heap-box')) seen.heap = true;
  if (document.querySelectorAll('#stepper-frames .stepper-frame').length > 1) seen.frames = true;
}

check('C · control card rendered', seen.control);
check('S·E · nested call frame rendered', seen.frames);
check('S · store box rendered', seen.heap);
check('K · kontinuation entries rendered', seen.kont);
check('machine finished: status shows ✓', document.getElementById('stepper-status')!.textContent!.includes('✓'));
check('output rendered 42', document.getElementById('stepper-output')!.textContent!.trim() === '42');
check('bottom Output tool mirrors 42', document.getElementById('bottom-program-output')!.textContent!.includes('42'));

// -- Run GC end-to-end: rebind `junk` away from an old Cell (dropping it),
// click Run GC mid-method (deliberately before `return`, so the driver's own
// frame — self, `keep`, the new `junk` — are all still live roots); await the
// real mark/sweep animation timers; assert the heap shrank by exactly the
// dropped object and the program still finishes with the correct output
// afterward.
const GC_SRC = `class Main {
  public static void main(String[] args) {
    System.out.println(new GCDriver().run());
  }
}
class GCDriver {
  public int run() {
    Cell keep;
    Cell junk;
    int scratch;
    keep = new Cell();
    scratch = keep.set(7);
    junk = new Cell();
    scratch = junk.set(999);
    junk = new Cell();
    return keep.get();
  }
}
class Cell {
  int f;
  public int set(int v) {
    f = v;
    return 0;
  }
  public int get() {
    return f;
  }
}`;

const heapBoxCount = () => document.querySelectorAll('#stepper-heap .stepper-heap-box').length;
const statusText = () => document.getElementById('stepper-status')!.textContent ?? '';

async function runGCScenario(): Promise<void> {
  loadIntoActiveWorkspace(GC_SRC);

  // Step until all 4 objects exist: the GCDriver instance (self), `keep`'s
  // Cell, and both Cells that pass through `junk`. The instant the count
  // reaches 4, the new Cell is still only in-flight in `state.control` —
  // the pending assign hasn't written it into `junk` yet, so at THAT exact
  // step `junk` still points at the old (999) Cell and all 4 objects are
  // genuinely reachable. One more step commits `junk = <new Cell>`, which is
  // the step that actually drops the old Cell — that's the moment to GC.
  for (let i = 0; i < 500 && heapBoxCount() < 4; i++) {
    stepBtn.dispatchEvent(new (globalThis as any).Event('click'));
  }
  stepBtn.dispatchEvent(new (globalThis as any).Event('click'));
  check('GC scenario: all 4 objects allocated before GC (driver + 3 cells)', heapBoxCount() === 4);
  check(
    'GC scenario: the soon-to-be-garbage cell is present before GC',
    (document.getElementById('stepper-heap')!.textContent ?? '').includes('999')
  );

  document.getElementById('stepper-gc')!.dispatchEvent(new (globalThis as any).Event('click'));
  // GC_MARK_INTERVAL_MS=300 * up to 4 marks + GC_SWEEP_FADE_MS=450, plus slack.
  await new Promise((resolve) => setTimeout(resolve, 2200));

  check('GC scenario: heap shrank from 4 to 3 (only the unreachable cell swept)', heapBoxCount() === 3);
  check(
    'GC scenario: the swept cell is gone from the heap panel',
    !(document.getElementById('stepper-heap')!.textContent ?? '').includes('999')
  );
  check('GC scenario: status reports the GC summary, not a step count', statusText().startsWith('☠ GC complete'));

  // `keep` (read by the pending return) and `self` (the GCDriver receiving
  // `.get()`) must both have survived the sweep, or the program would get
  // stuck on the next step instead of finishing normally.
  for (let i = 0; i < 500 && !statusText().includes('✓') && !statusText().includes('⨯'); i++) {
    stepBtn.dispatchEvent(new (globalThis as any).Event('click'));
  }
  check('GC scenario: program still finishes (not stuck) after a mid-run GC', statusText().includes('✓'));
  check(
    'GC scenario: program still finishes with the right output after a mid-run GC',
    document.getElementById('stepper-output')!.textContent!.trim() === '7'
  );
}

runGCScenario().then(() => {
  if (failures) {
    console.log(`${failures} smoke failure(s)`);
    process.exitCode = 1;
  } else {
    console.log('CESK panel smoke CLEAN');
  }
});
