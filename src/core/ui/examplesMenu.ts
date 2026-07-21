import * as Blockly from 'blockly';
import { MINI_JAVA_EXAMPLES, type MiniJavaExample } from '../examples';

type WorkspaceGetter = () => Blockly.WorkspaceSvg | null;

type LoadChoice = 'replace' | 'merge' | 'cancel';

const iconMarkup = (icon: string, className: string): string =>
  `<svg class="app-icon ${className}" aria-hidden="true"><use href="#icon-${icon}"></use></svg>`;

function askLoadChoice(exampleLabel: string): Promise<LoadChoice> {
  const modal = document.getElementById('example-load-modal') as HTMLDialogElement | null;
  if (!modal || typeof modal.showModal !== 'function') return Promise.resolve('replace');
  const name = document.getElementById('example-load-name');
  if (name) name.textContent = exampleLabel;

  return new Promise<LoadChoice>((resolve) => {
    const onClose = (): void => {
      modal.removeEventListener('close', onClose);
      const value = modal.returnValue;
      resolve(value === 'replace' || value === 'merge' ? value : 'cancel');
    };
    modal.addEventListener('close', onClose);
    modal.returnValue = 'cancel';
    modal.showModal();
  });
}

function loadExample(example: MiniJavaExample, getWorkspace: WorkspaceGetter, onLoaded: (example: MiniJavaExample) => void): void {
  const workspace = getWorkspace();
  if (!workspace) return;

  const proceed = (choice: LoadChoice): void => {
    if (choice === 'cancel') return;
    if (choice === 'merge') {
      const blocks = (example.state as { blocks?: { blocks?: unknown[] } }).blocks?.blocks ?? [];
      for (const block of blocks) {
        Blockly.serialization.blocks.append(block as Blockly.serialization.blocks.State, workspace);
      }
    } else {
      workspace.clear();
      Blockly.serialization.workspaces.load(example.state, workspace);
    }
    onLoaded(example);
    const top = workspace.getTopBlocks(false)[0];
    if (top) workspace.centerOnBlock(top.id);
  };

  if (workspace.getAllBlocks(false).length > 0) askLoadChoice(example.label).then(proceed);
  else proceed('replace');
}

export function initExamplesMenu(getWorkspace: WorkspaceGetter, onLoaded: (example: MiniJavaExample) => void): void {
  const button = document.getElementById('examples-button') as HTMLButtonElement | null;
  const panel = document.getElementById('examples-panel') as HTMLDivElement | null;
  if (!button || !panel) return;

  const items = (): HTMLButtonElement[] => Array.from(panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  const close = (restoreFocus = false): void => {
    panel.classList.remove('examples-open');
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  };
  const open = (focus: 'first' | 'last' | null = null): void => {
    panel.classList.add('examples-open');
    button.setAttribute('aria-expanded', 'true');
    window.dispatchEvent(new CustomEvent('bmj:examples-menu-opened'));
    if (focus) {
      const menuItems = items();
      menuItems[focus === 'first' ? 0 : menuItems.length - 1]?.focus();
    }
  };

  panel.innerHTML = '';
  const heading = document.createElement('div');
  heading.className = 'examples-group-heading';
  heading.innerHTML = `${iconMarkup('examples', 'examples-group-icon')}<span>Examples</span>`;
  panel.appendChild(heading);

  for (const example of MINI_JAVA_EXAMPLES) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'examples-item';
    item.setAttribute('role', 'menuitem');
    item.title = example.description;
    item.innerHTML = `${iconMarkup('examples', 'examples-item-icon')}<span class="examples-item-label"></span>`;
    item.querySelector('.examples-item-label')!.textContent = example.label;
    item.addEventListener('click', () => {
      close();
      window.dispatchEvent(new CustomEvent('bmj:header-menu-action'));
      loadExample(example, getWorkspace, onLoaded);
    });
    panel.appendChild(item);
  }

  button.addEventListener('click', () => {
    if (panel.classList.contains('examples-open')) close();
    else open();
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(event.key === 'ArrowDown' ? 'first' : 'last');
    } else if (event.key === 'Escape' && panel.classList.contains('examples-open')) {
      event.preventDefault();
      close(true);
    }
  });
  panel.addEventListener('keydown', (event) => {
    const menuItems = items();
    const current = menuItems.indexOf(document.activeElement as HTMLButtonElement);
    const offset = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (offset || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const target = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? menuItems.length - 1
          : (current + offset + menuItems.length) % menuItems.length;
      menuItems[target]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    if (panel.contains(target) || button.contains(target)) return;
    close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !panel.classList.contains('examples-open')) return;
    close(true);
  });
}
