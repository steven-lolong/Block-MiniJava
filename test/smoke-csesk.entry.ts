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
   <span id="stepper-status"></span><svg id="stepper-arrows"></svg>
   ${ids.map((i) => `<div id="${i}"></div>`).join('')}
   <pre id="stepper-output"></pre><pre id="bottom-program-output"></pre>`;

const ws = new Blockly.Workspace();
Blockly.serialization.workspaces.load(parseMiniJavaTextToWorkspaceState(SRC), ws);
// Headless blocks lack the SVG-only methods the panel calls for highlighting.
for (const b of ws.getAllBlocks(false)) {
  (b as any).setHighlighted = () => undefined;
}
(ws as any).centerOnBlock = () => undefined;

initStepperPanel(() => ws as any);
document.getElementById('stepper-load')!.dispatchEvent(new (globalThis as any).Event('click'));

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

if (failures) {
  console.log(`${failures} smoke failure(s)`);
  process.exitCode = 1;
} else {
  console.log('CESK panel smoke CLEAN');
}
