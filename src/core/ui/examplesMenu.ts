import * as Blockly from 'blockly';
import { MINI_JAVA_EXAMPLES, type MiniJavaExample } from '../examples';

type WorkspaceGetter = () => Blockly.WorkspaceSvg | null;

function loadExample(example: MiniJavaExample, getWorkspace: WorkspaceGetter, onLoaded: (example: MiniJavaExample) => void): void {
  const workspace = getWorkspace();
  if (!workspace) return;

  workspace.clear();
  Blockly.serialization.workspaces.load(example.state, workspace);
  onLoaded(example);
  const top = workspace.getTopBlocks(false)[0];
  if (top) workspace.centerOnBlock(top.id);
}

export function initExamplesMenu(getWorkspace: WorkspaceGetter, onLoaded: (example: MiniJavaExample) => void): void {
  const button = document.getElementById('examples-button') as HTMLButtonElement | null;
  const panel = document.getElementById('examples-panel') as HTMLDivElement | null;
  if (!button || !panel) return;

  panel.innerHTML = '';
  const heading = document.createElement('div');
  heading.className = 'examples-group-heading';
  heading.innerHTML = '<span class="examples-group-icon" aria-hidden="true">EX</span><span>Examples</span>';
  panel.appendChild(heading);

  for (const example of MINI_JAVA_EXAMPLES) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'examples-item';
    item.setAttribute('role', 'menuitem');
    item.title = example.description;
    item.innerHTML = '<span class="examples-item-icon" aria-hidden="true">◇</span><span class="examples-item-label"></span>';
    item.querySelector('.examples-item-label')!.textContent = example.label;
    item.addEventListener('click', () => {
      panel.classList.remove('examples-open');
      button.setAttribute('aria-expanded', 'false');
      loadExample(example, getWorkspace, onLoaded);
    });
    panel.appendChild(item);
  }

  button.addEventListener('click', () => {
    const open = panel.classList.toggle('examples-open');
    button.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    if (panel.contains(target) || button.contains(target)) return;
    panel.classList.remove('examples-open');
    button.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    panel.classList.remove('examples-open');
    button.setAttribute('aria-expanded', 'false');
  });
}

