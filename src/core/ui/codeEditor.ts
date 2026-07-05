import * as Blockly from 'blockly';
import { highlightMiniJava } from '../generator/highlighter';
import { generateMiniJava } from '../generator/minijavaGenerator';
import { MiniJavaTextParseError, parseMiniJavaTextToWorkspaceState } from '../parser/minijavaTextParser';

const TEXT_IMPORT_DELAY_MS = 650;

type EditorStatus = 'idle' | 'ok' | 'error';

export type MiniJavaCodeImportDetail = {
  label: string;
  topBlockCount: number;
};

export type MiniJavaCodeEditorOptions = {
  onBeforeImport?: () => void;
  onImported?: (detail: MiniJavaCodeImportDetail) => void;
  onImportError?: (message: string) => void;
};

export type EditableMiniJavaCodeEditor = {
  syncFromWorkspace: (code?: string, message?: string) => void;
  currentText: () => string;
  loadText: (source: string, label?: string) => void;
};

let editor: HTMLTextAreaElement | null = null;
let highlight: HTMLElement | null = null;
let highlightView: HTMLElement | null = null;
let status: HTMLElement | null = null;
let parseTimer: number | null = null;
let suppressWorkspaceSyncUntil = 0;
let highlightDirty = false;

function setStatus(message: string, state: EditorStatus = 'idle'): void {
  if (!status) return;
  status.textContent = message;
  if (state === 'idle') status.removeAttribute('data-state');
  else status.dataset.state = state;
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

// The highlight layer must wrap at exactly the textarea's content width, so
// mirror the space a (non-overlay) scrollbar takes out of the textarea.
function syncHighlightMetrics(): void {
  if (!editor || !highlightView) return;
  const scrollbarWidth = editor.offsetWidth - editor.clientWidth;
  highlightView.style.right = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '0px';
}

function renderHighlight(force = false): void {
  if (!editor || !highlight) return;
  // While the editor is focused it renders its own plain text and covers the
  // highlight layer entirely, so defer the rebuild until it loses focus.
  if (!force && document.activeElement === editor) {
    highlightDirty = true;
    return;
  }
  const code = editor.value;
  // A trailing newline needs a placeholder or the highlight drops the empty
  // last line the textarea still shows.
  highlight.innerHTML = highlightMiniJava(code.endsWith('\n') ? `${code} ` : code) || '&nbsp;';
  highlightDirty = false;
  syncHighlightMetrics();
  syncHighlightScroll();
}

// When typing at the very end of the document, the browser's minimal
// auto-scroll leaves the caret line partially clipped at the pane edge.
// Pin the view to the bottom so the line being edited stays fully visible.
function keepEndOfTextVisible(): void {
  if (!editor) return;
  if (editor.selectionStart !== editor.value.length || editor.selectionEnd !== editor.value.length) return;
  const maxScroll = editor.scrollHeight - editor.clientHeight;
  if (maxScroll > 0 && editor.scrollTop < maxScroll) {
    editor.scrollTop = maxScroll;
    syncHighlightScroll();
  }
}

function syncEditorFromWorkspace(
  workspace: Blockly.WorkspaceSvg,
  code = generateMiniJava(workspace),
  message = 'MiniJava code is synchronized with the workspace.'
): void {
  if (!workspace || !editor) return;
  if (Date.now() < suppressWorkspaceSyncUntil) return;
  // Never replace the text while the user is editing it; the workspace
  // mutation may be unrelated (block drag, required-block enforcement)
  // and would otherwise wipe an in-progress edit.
  if (document.activeElement === editor) return;
  // Keep the user's wording when it still describes the same blocks —
  // replacing it would drop their comments and formatting.
  if (!editorTextMatchesCode(editor.value, code)) {
    editor.value = code;
    renderHighlight();
  }
  setStatus(message, 'idle');
}

// Structural signature of the current workspace, obtained by re-parsing its
// own generated code so both sides of a comparison normalize identically.
function workspaceStructureSignature(workspace: Blockly.WorkspaceSvg): string | null {
  try {
    return JSON.stringify(parseMiniJavaTextToWorkspaceState(generateMiniJava(workspace)));
  } catch {
    return null;
  }
}

// True when the editor text parses to the same block structure as the
// canonical code, i.e. it differs only in comments, whitespace, or
// formatting. Such text must never be replaced — that would silently
// delete the characters the user last typed.
function editorTextMatchesCode(currentText: string, code: string): boolean {
  if (currentText === code) return true;
  try {
    return JSON.stringify(parseMiniJavaTextToWorkspaceState(currentText))
      === JSON.stringify(parseMiniJavaTextToWorkspaceState(code));
  } catch {
    return false;
  }
}

function importEditorTextToWorkspace(
  workspace: Blockly.WorkspaceSvg,
  state: ReturnType<typeof parseMiniJavaTextToWorkspaceState>,
  label: string,
  options: MiniJavaCodeEditorOptions
): number {
  const topBlockCount = state.blocks.blocks.length;

  suppressWorkspaceSyncUntil = Date.now() + 1500;
  options.onBeforeImport?.();
  workspace.clear();
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace);
  workspace.cleanUp();
  renderHighlight();
  options.onImported?.({ label, topBlockCount });

  return topBlockCount;
}

function applyEditorTextToWorkspace(
  workspace: Blockly.WorkspaceSvg,
  options: MiniJavaCodeEditorOptions,
  label = 'minijava-text.java',
  allowSkipWhenUnchanged = true
): void {
  if (!editor) return;
  const source = editor.value.trim();

  if (!hasMiniJavaSource(source)) {
    setStatus('', 'idle');
    return;
  }

  try {
    const state = parseMiniJavaTextToWorkspaceState(source);

    // Whitespace, comment, or formatting edits parse to the same structure;
    // skip the rebuild to keep block ids, undo history, and layout intact.
    if (allowSkipWhenUnchanged && JSON.stringify(state) === workspaceStructureSignature(workspace)) {
      setStatus('MiniJava code already matches the blocks.', 'ok');
      return;
    }

    const topBlockCount = importEditorTextToWorkspace(workspace, state, label, options);
    const blockLabel = topBlockCount === 1 ? 'top-level block' : 'top-level blocks';
    setStatus(`Converted MiniJava text to ${topBlockCount} ${blockLabel}.`, 'ok');
  } catch (error) {
    const message = error instanceof MiniJavaTextParseError ? error.message : 'Could not parse MiniJava text.';
    setStatus(message, 'error');
    options.onImportError?.(message);
  }
}

function scheduleEditorImport(workspace: Blockly.WorkspaceSvg, options: MiniJavaCodeEditorOptions): void {
  if (parseTimer !== null) window.clearTimeout(parseTimer);
  renderHighlight();
  keepEndOfTextVisible();
  setStatus(hasMiniJavaSource(editor?.value ?? '') ? 'Parsing MiniJava...' : '', 'idle');
  parseTimer = window.setTimeout(() => {
    parseTimer = null;
    applyEditorTextToWorkspace(workspace, options);
  }, TEXT_IMPORT_DELAY_MS);
}

function handleEditorKeydown(
  workspace: Blockly.WorkspaceSvg,
  options: MiniJavaCodeEditorOptions,
  event: KeyboardEvent
): void {
  if (!editor || event.key !== 'Tab') return;

  event.preventDefault();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = `${editor.value.slice(0, start)}  ${editor.value.slice(end)}`;
  editor.selectionStart = start + 2;
  editor.selectionEnd = start + 2;
  scheduleEditorImport(workspace, options);
}

function createEditorDom(): boolean {
  if (editor && highlight && status) return true;

  const generatedCode = document.getElementById('generated-code');
  const codeView = generatedCode?.closest<HTMLPreElement>('.code-view');
  const panel = document.getElementById('panel-code');
  if (!generatedCode || !codeView || !panel) return false;
  highlightView = codeView;

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
  editor.wrap = 'soft';
  editor.autocomplete = 'off';
  editor.setAttribute('autocapitalize', 'off');
  editor.setAttribute('aria-label', 'Editable MiniJava code');
  pane.appendChild(editor);

  highlight = generatedCode;

  status = document.createElement('div');
  status.id = 'code-editor-status';
  status.className = 'code-editor-status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'MiniJava code is synchronized with the workspace.';
  panel.appendChild(status);

  return true;
}

export function installEditableMiniJavaCodeEditor(
  workspace: Blockly.WorkspaceSvg,
  options: MiniJavaCodeEditorOptions = {}
): EditableMiniJavaCodeEditor | null {
  if (!createEditorDom() || !editor) return null;

  editor.addEventListener('input', () => scheduleEditorImport(workspace, options));
  editor.addEventListener('scroll', syncHighlightScroll);
  editor.addEventListener('keydown', (event) => handleEditorKeydown(workspace, options, event));
  // Returning to read mode: rebuild the highlight for whatever was typed.
  editor.addEventListener('blur', () => {
    if (highlightDirty) renderHighlight(true);
    else syncHighlightScroll();
  });

  // Panel resizes change the wrap width and can add/remove the scrollbar.
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      syncHighlightMetrics();
      syncHighlightScroll();
    }).observe(editor);
  }

  const loadInput = document.getElementById('load-file-input');
  if (loadInput instanceof HTMLInputElement) {
    loadInput.accept = '.bml,.json,.java,.txt,application/json,text/x-java-source,text/plain';
  }

  const controller: EditableMiniJavaCodeEditor = {
    syncFromWorkspace: (code, message) => syncEditorFromWorkspace(workspace, code, message),
    currentText: () => editor?.value ?? '',
    loadText: (source, label = 'minijava-text.java') => {
      if (parseTimer !== null) {
        window.clearTimeout(parseTimer);
        parseTimer = null;
      }
      if (!editor) return;
      editor.value = source;
      renderHighlight();
      // A file load must always import, so the file label and autosave update
      // even when the program matches the current blocks.
      applyEditorTextToWorkspace(workspace, options, label, false);
    }
  };

  controller.syncFromWorkspace();
  return controller;
}
