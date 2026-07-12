import * as Blockly from 'blockly';
import { BLOCKLY_RENDERER, createBlocklyTheme } from '../renderer/theme';
import {
  arrangeBlocksVertically,
  arrangeTopBlocks,
  renderCopiedReductionRoot,
  renderMiniJavaReduction,
  type BlockOrder
} from '../semantics/minijavaReduction';
import type { ReductionKind } from '../semantics/minijavaRuntime';
import { resetStepperFromDock, setStepperTabVisible } from './stepperPanel';
import { resetCompareFromDock, setCompareTabVisible } from './comparePanel';
import { disposeSubstWorkspace, resetSubstFromDock, setSubstTabVisible } from './substPanel';

export type VizKind = ReductionKind | 'machine' | 'compare' | 'subst';

const KINDS: ReductionKind[] = ['structure', 'value'];
const ALL_KINDS: VizKind[] = ['structure', 'value', 'machine', 'compare', 'subst'];
const TITLE: Record<VizKind, string> = {
  structure: 'Call-by-Structure',
  value: 'Call-by-Value',
  machine: 'CSESK machine · Model A — Control · Stack · Environment · Store · Kontinuation',
  compare: 'A vs B · one program, two value models, lockstep',
  subst: 'Rewrite · substitution semantics (Model B, pure fragment)'
};

function isWorkspaceKind(kind: VizKind): kind is ReductionKind {
  return kind === 'structure' || kind === 'value';
}

interface View {
  workspace: Blockly.WorkspaceSvg | null;
  block: Blockly.BlockSvg | null;
  order: BlockOrder | null;
}

const views: Record<ReductionKind, View> = {
  structure: { workspace: null, block: null, order: null },
  value: { workspace: null, block: null, order: null }
};

let active: VizKind = 'structure';
let onLayoutChange: () => void = () => {};


function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function dock(): HTMLElement {
  return byId<HTMLElement>('viz-dock');
}

function hostOf(kind: VizKind): HTMLElement {
  const host = document.querySelector<HTMLElement>(`.viz-host[data-kind="${kind}"]`);
  if (!host) throw new Error(`Missing visualization host ${kind}`);
  return host;
}

function tabOf(kind: VizKind): HTMLElement {
  const tab = document.querySelector<HTMLElement>(`.viz-tab[data-kind="${kind}"]`);
  if (!tab) throw new Error(`Missing visualization tab ${kind}`);
  return tab;
}

function currentTheme(): 'dark' | 'light' {
  return document.body.dataset.theme === 'light' ? 'light' : 'dark';
}

function injectVisualizationWorkspace(host: HTMLElement): Blockly.WorkspaceSvg {
  return Blockly.inject(host, {
    renderer: BLOCKLY_RENDERER,
    theme: createBlocklyTheme(currentTheme()),
    trashcan: false,
    comments: true,
    collapse: true,
    disable: true,
    grid: { spacing: 20, length: 3, snap: true },
    move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false },
    zoom: { controls: true, wheel: true, startScale: 1, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2, pinch: true }
  });
}

function ensureWorkspace(kind: ReductionKind): Blockly.WorkspaceSvg {
  if (!views[kind].workspace) views[kind].workspace = injectVisualizationWorkspace(hostOf(kind));
  return views[kind].workspace!;
}

function resizeActive(delay = 0): void {
  if (!isWorkspaceKind(active)) return;
  const workspace = views[active].workspace;
  if (workspace) window.setTimeout(() => Blockly.svgResize(workspace), delay);
}

function updateInfo(): void {
  if (!isWorkspaceKind(active)) {
    byId<HTMLDivElement>('viz-dock-info').textContent = TITLE[active];
    return;
  }
  const view = views[active];
  byId<HTMLDivElement>('viz-dock-info').textContent = view.block ? `${TITLE[active]} · ${view.block.type}` : '';
}

function setActive(kind: VizKind): void {
  active = kind;
  for (const k of ALL_KINDS) {
    hostOf(k).dataset.active = String(k === kind);
    tabOf(k).setAttribute('aria-selected', String(k === kind));
  }
  byId<HTMLDivElement>('viz-empty').hidden = isWorkspaceKind(kind) ? !!views[kind].block : true;
  setStepperTabVisible(kind === 'machine');
  setCompareTabVisible(kind === 'compare');
  setSubstTabVisible(kind === 'subst');
  updateInfo();
  resizeActive(0);
}

export function isVizOpen(): boolean {
  return dock().dataset.open === 'true';
}

export function setVizOpen(open: boolean): void {
  dock().dataset.open = String(open);
  const toggle = document.getElementById('toggle-viz-dock');
  if (toggle) toggle.setAttribute('aria-pressed', String(open));
  onLayoutChange();
  if (open) resizeActive(40);
}

function renderView(kind: ReductionKind): void {
  const view = views[kind];
  if (!view.block) return;
  const workspace = ensureWorkspace(kind);
  workspace.clear();
  view.order = null;
  try {
    view.order = view.block.type === 'mj_expr_method_call'
      ? renderMiniJavaReduction(view.block, workspace, kind)
      : renderCopiedReductionRoot(view.block, workspace, kind);
  } catch (error) {
    console.error('[B-MJ] visualization failed', error);
  }
  Blockly.svgResize(workspace);
  updateInfo();
}

export function openVisualization(kind: ReductionKind, block: Blockly.BlockSvg): void {
  views[kind].block = block;
  setActive(kind);
  setVizOpen(true);
  renderView(kind);
}

export function disposeVizWorkspaces(): void {
  const reopen = isVizOpen() && isWorkspaceKind(active) && !!views[active].block;
  for (const kind of KINDS) {
    if (views[kind].workspace) {
      try {
        views[kind].workspace!.dispose();
      } catch {
        /* Ignore Blockly disposal edge cases during theme switches. */
      }
      views[kind].workspace = null;
    }
    hostOf(kind).innerHTML = '';
  }
  disposeSubstWorkspace();
  if (reopen && isWorkspaceKind(active)) renderView(active);
}

function initResizer(): void {
  const resizer = byId<HTMLDivElement>('viz-resizer');
  const root = document.documentElement;

  const applyHeight = (height: number): void => {
    const clamped = Math.max(160, Math.min(height, Math.round(window.innerHeight * 0.7)));
    root.style.setProperty('--viz-height', `${clamped}px`);
    onLayoutChange();
    resizeActive(0);
  };

  const start = (clientY: number): void => {
    const initialHeight = dock().getBoundingClientRect().height;
    const onPointerMove = (event: PointerEvent): void => applyHeight(initialHeight + (clientY - event.clientY));
    const onPointerUp = (): void => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    start(event.clientY);
  });
  resizer.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowUp' ? 24 : event.key === 'ArrowDown' ? -24 : 0;
    if (!step) return;
    event.preventDefault();
    applyHeight(dock().getBoundingClientRect().height + step);
  });
}

export function initVisualizationPanel(layoutChange: () => void): void {
  onLayoutChange = layoutChange;
  for (const kind of ALL_KINDS) tabOf(kind).addEventListener('click', () => setActive(kind));
  byId<HTMLButtonElement>('viz-rerun').addEventListener('click', () => {
    if (!isWorkspaceKind(active)) {
      if (active === 'machine') resetStepperFromDock();
      else if (active === 'compare') resetCompareFromDock();
      else resetSubstFromDock();
      return;
    }
    renderView(active);
  });
  byId<HTMLButtonElement>('viz-arrange').addEventListener('click', () => {
    if (!isWorkspaceKind(active)) return;
    const view = views[active];
    if (!view.workspace) return;
    if (view.order) arrangeBlocksVertically(view.workspace, view.order, 32);
    else arrangeTopBlocks(view.workspace);
    Blockly.svgResize(view.workspace);
  });
  byId<HTMLButtonElement>('viz-collapse').addEventListener('click', () => setVizOpen(false));
  byId<HTMLButtonElement>('toggle-viz-dock').addEventListener('click', () => setVizOpen(!isVizOpen()));
  initResizer();
  window.addEventListener('resize', () => {
    if (isVizOpen()) resizeActive(80);
  });
  setActive('structure');
}

