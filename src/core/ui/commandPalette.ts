export type IdeCommand = {
  id: string;
  label: string;
  category: string;
  run: () => void;
  keywords?: string[];
  shortcut?: string;
};

export type CommandPaletteController = {
  open: (query?: string) => void;
  close: () => void;
};

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

function matches(command: IdeCommand, query: string): boolean {
  if (!query) return true;
  const haystack = [command.label, command.category, ...(command.keywords ?? [])]
    .join(' ')
    .toLocaleLowerCase();
  return query.split(/\s+/).every((part) => haystack.includes(part));
}

/** Installs the keyboard-first command surface without owning application commands. */
export function installCommandPalette(commands: IdeCommand[]): CommandPaletteController {
  const overlay = byId<HTMLDivElement>('command-palette-overlay');
  const input = byId<HTMLInputElement>('command-palette-input');
  const list = byId<HTMLDivElement>('command-palette-list');
  const trigger = byId<HTMLButtonElement>('command-palette-trigger');

  let visible: IdeCommand[] = [];
  let selectedIndex = 0;
  let restoreFocus: HTMLElement | null = null;

  const selectIndex = (next: number): void => {
    if (visible.length === 0) return;
    selectedIndex = (next + visible.length) % visible.length;
    const options = Array.from(list.querySelectorAll<HTMLButtonElement>('.command-palette-option'));
    options.forEach((option, index) => {
      const selected = index === selectedIndex;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-selected', String(selected));
      if (selected) option.scrollIntoView({ block: 'nearest' });
    });
  };

  const runCommand = (command: IdeCommand): void => {
    controller.close();
    window.setTimeout(command.run, 0);
  };

  const render = (): void => {
    const query = input.value.trim().toLocaleLowerCase();
    visible = commands.filter((command) => matches(command, query));
    selectedIndex = Math.min(selectedIndex, Math.max(visible.length - 1, 0));
    list.replaceChildren();

    if (visible.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'command-palette-empty';
      empty.textContent = 'No matching commands';
      list.appendChild(empty);
      return;
    }

    visible.forEach((command, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'command-palette-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === selectedIndex));
      option.dataset.commandId = command.id;

      const text = document.createElement('span');
      text.className = 'command-option-text';
      const category = document.createElement('span');
      category.className = 'command-option-category';
      category.textContent = command.category;
      const label = document.createElement('span');
      label.className = 'command-option-label';
      label.textContent = command.label;
      text.append(category, label);
      option.appendChild(text);

      if (command.shortcut) {
        const shortcut = document.createElement('kbd');
        shortcut.textContent = command.shortcut;
        option.appendChild(shortcut);
      }

      option.addEventListener('pointermove', () => selectIndex(index));
      option.addEventListener('click', () => runCommand(command));
      option.classList.toggle('is-selected', index === selectedIndex);
      list.appendChild(option);
    });
  };

  const controller: CommandPaletteController = {
    open: (query = '') => {
      restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.hidden = false;
      document.body.classList.add('command-palette-open');
      input.value = query;
      selectedIndex = 0;
      render();
      window.requestAnimationFrame(() => input.focus());
    },
    close: () => {
      if (overlay.hidden) return;
      overlay.hidden = true;
      document.body.classList.remove('command-palette-open');
      restoreFocus?.focus();
      restoreFocus = null;
    }
  };

  trigger.addEventListener('click', () => controller.open());
  input.addEventListener('input', () => {
    selectedIndex = 0;
    render();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectIndex(selectedIndex + (event.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (event.key === 'Enter' && visible[selectedIndex]) {
      event.preventDefault();
      runCommand(visible[selectedIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      controller.close();
    }
  });
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) controller.close();
  });
  document.addEventListener('keydown', (event) => {
    const paletteShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLocaleLowerCase() === 'p';
    if (event.key === 'F1' || paletteShortcut) {
      event.preventDefault();
      controller.open();
    } else if (event.key === 'Escape' && !overlay.hidden) {
      event.preventDefault();
      controller.close();
    }
  });

  return controller;
}
