import * as Blockly from 'blockly';
import { highlightMiniJava } from '../generator/highlighter';
import { generateMiniJava } from '../generator/minijavaGenerator';
import { MiniJavaTextParseError, parseMiniJavaTextToWorkspaceState } from '../parser/minijavaTextParser';

const TEXT_IMPORT_DELAY_MS = 650;

type EditorStatus = 'idle' | 'ok' | 'error';

let editor: HTMLTextAreaElement | null = null;
let highlight: HTMLElement | null = null;
let status: HTMLElement | null = null;
let parseTimer: number | null = null;
let suppressWorkspaceSyncUntil = 0;

function getWorkspace(): Blockly.WorkspaceSvg | null {
  const maybeGetMainWorkspace = (Blockly as unknown as { getMainWorkspace?: () => Blockly.WorkspaceSvg }).getMainWorkspace;
  if (typeof maybeGetMainWorkspace === 'function') return maybeGetMainWorkspace.call(Blockly);
  const workspaces = Blockly.common.getAllWorkspaces?.() ?? [];
  return (workspaces.find((workspace) => workspace instanceof Blockly.WorkspaceSvg) as Blockly.WorkspaceSvg | undefined) ?? null;
}

function setStatus(message: string, state: EditorStatus = 'idle'): void {
  if (!status) return;
  status.textContent = message;
  if (state === 'idle') status.removeAttribute('data-state');
  else status.dataset.state = state;
}

function setAutosaveStatus(message: string): void {
  const autosaveStatus = document.getElementById('autosave-status');
  if (autosaveStatus) autosaveStatus.textContent = message;
}

function setLoadedFileLabel(label: string): void {
  const loadedFileLabel = document.getElementById('loaded-file-label');
  if (loadedFileLabel) loadedFileLabel.textContent = label;
}

function hasMiniJavaSource(text: string): boolean {
  return text
    .split(/\r?\n/)
    .some((line) => line.replace(/\/\/.*$/, '').trim().length > 0);
}

function syncHighlightScroll(): void {
  if (!editor || !highlight) return;
  highlight.style.transform = `translate(${-editor.scrollLeft}px, ${-editor.scrollTop}px)`;
}

function renderHighlight(): void {
  if (!editor || !highlight) return;
  highlight.innerHTML = highlightMiniJava(editor.value) || '&nbsp;';
  syncHighlightScroll();
}

function syncEditorFromWorkspace(message = 'MiniJava code is synchronized with the workspace.'): void {
  const workspace = getWorkspace();
  if (!workspace || !editor) return;
  editor.value = generateMiniJava(workspace);
  renderHighlight();
  setStatus(message, 'idle');
}

function importEditorTextToWorkspace(source: string, label = 'minijava-text.java'): number {
  const workspace = getWorkspace();
  if (!workspace) throw new MiniJavaTextParseError('Blockly workspace is not ready.', 0);

  const state = parseMiniJavaTextToWorkspaceState(source);
  const topBlockCount = state.blocks.blocks.length;

  suppressWorkspaceSyncUntil = Date.now() + 1500;
  workspace.clear();
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace);
  workspace.cleanUp();
  setLoadedFileLabel(label);
  renderHighlight();

  return topBlockCount;
}

function applyEditorTextToWorkspace(label?: string): void {
  if (!editor) return;
  const source = editor.value.trim();

  if (!hasMiniJavaSource(source)) {
    setStatus('', 'idle');
    return;
  }

  try {
    const topBlockCount = importEditorTextToWorkspace(source, label);
    const blockLabel = topBlockCount === 1 ? 'top-level block' : 'top-level blocks';
    setStatus(`Converted MiniJava text to ${topBlockCount} ${blockLabel}.`, 'ok');
    setAutosaveStatus('Code imported to blocks');
  } catch (error) {
    const message = error instanceof MiniJavaTextParseError ? error.message : 'Could not parse MiniJava text.';
    setStatus(message, 'error');
    setAutosaveStatus('Code import needs valid MiniJava');
  }
}

function scheduleEditorImport(): void {
  if (parseTimer !== null) window.clearTimeout(parseTimer);
  renderHighlight();
  setStatus(hasMiniJavaSource(editor?.value ?? '') ? 'Parsing MiniJava...' : '', 'idle');
  parseTimer = window.setTimeout(() => {
    parseTimer = null;
    applyEditorTextToWorkspace('minijava-text.java');
  }, TEXT_IMPORT_DELAY_MS);
}

function handleEditorKeydown(event: KeyboardEvent): void {
  if (!editor || event.key !== 'Tab') return;

  event.preventDefault();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = `${editor.value.slice(0, start)}  ${editor.value.slice(end)}`;
  editor.selectionStart = start + 2;
  editor.selectionEnd = start + 2;
  scheduleEditorImport();
}

function installJavaFileImport(input: HTMLInputElement): void {
  input.accept = '.bml,.json,.java,application/json,text/x-java-source,text/plain';
  input.addEventListener('change', (event) => {
    const file = input.files?.[0];
    if (!file || !/\.(java|txt)$/i.test(file.name)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    file.text()
      .then((source) => {
        if (!editor) return;
        editor.value = source;
        renderHighlight();
        applyEditorTextToWorkspace(file.name);
      })
      .catch((error) => {
        console.error(error);
        setStatus(`Could not read ${file.name}.`, 'error');
      })
      .finally(() => {
        input.value = '';
      });
  }, true);
}

function createEditorDom(): boolean {
  const generatedCode = document.getElementById('generated-code');
  const codeView = generatedCode?.closest<HTMLPreElement>('.code-view');
  const panel = document.getElementById('panel-code');
  if (!generatedCode || !codeView || !panel) return false;

  const pane = document.createElement('div');
  pane.className = 'code-editor-pane';
  codeView.classList.add('code-editor-highlight');
  codeView.setAttribute('aria-hidden', 'true');
  codeView.parentElement?.insertBefore(pane, codeView);
  pane.appendChild(codeView);

  editor = document.createElement('textarea');
  editor.id = 'generated-code-editor';
  editor.className = 'code-editor-input';
  editor.spellcheck = false;
  editor.setAttribute('aria-label', 'Editable MiniJava code');
  pane.appendChild(editor);

  highlight = generatedCode;

  status = document.createElement('div');
  status.id = 'code-editor-status';
  status.className = 'code-editor-status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'MiniJava code is synchronized with the workspace.';
  panel.appendChild(status);

  editor.addEventListener('input', scheduleEditorImport);
  editor.addEventListener('scroll', syncHighlightScroll);
  editor.addEventListener('keydown', handleEditorKeydown);

  return true;
}

export function installEditableMiniJavaCodeEditor(): void {
  if (!createEditorDom() || !editor) return;

  const workspace = getWorkspace();
  if (workspace) {
    workspace.addChangeListener((event) => {
      if (event.type === Blockly.Events.VIEWPORT_CHANGE) return;
      if (Date.now() < suppressWorkspaceSyncUntil) return;
      window.setTimeout(() => {
        if (Date.now() >= suppressWorkspaceSyncUntil) syncEditorFromWorkspace();
      }, 0);
    });
  }

  const loadInput = document.getElementById('load-file-input');
  if (loadInput instanceof HTMLInputElement) installJavaFileImport(loadInput);

  syncEditorFromWorkspace();
}
