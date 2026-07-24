/**
 * Shared keyboard contract for the three viz-dock steppers (design brief §5):
 * Step/Back/Play/Load get the same bindings in the CESK, A-vs-B, and Rewrite
 * tabs. Bindings are scoped to the dock — guarded to (a) this stepper's own
 * tab actually being the visible one and (b) the event not targeting an
 * editable control — so they never steal keystrokes from a block field
 * editor, the toolbox search box, or a dialog.
 */

export type DockStepperKind = 'machine' | 'compare' | 'subst';

export interface DockStepHandlers {
  load: () => void;
  step: () => void;
  back: () => void;
  togglePlay: () => void;
  /** Extra single-key bindings only one stepper defines (CESK's `g` for Run GC). */
  extra?: Record<string, () => void>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

function isTabActive(kind: DockStepperKind): boolean {
  const host = document.querySelector(`.viz-host[data-kind="${kind}"]`);
  return !!host && host.getAttribute('aria-hidden') === 'false';
}

/** Attaches the shared contract to `dock` (the bottom-tools element). Lives
 * for the app's lifetime, so there is nothing to unbind. */
export function bindDockStepKeys(dock: HTMLElement, kind: DockStepperKind, handlers: DockStepHandlers): void {
  dock.addEventListener('keydown', (event) => {
    if (!isTabActive(kind) || isEditableTarget(event.target)) return;
    switch (event.key) {
      case 'ArrowRight':
      case '.':
        event.preventDefault();
        handlers.step();
        return;
      case 'ArrowLeft':
      case ',':
        event.preventDefault();
        handlers.back();
        return;
      case ' ':
        event.preventDefault();
        handlers.togglePlay();
        return;
      case 'r':
      case 'R':
        event.preventDefault();
        handlers.load();
        return;
      default: {
        const extra = handlers.extra?.[event.key.toLowerCase()];
        if (extra) {
          event.preventDefault();
          extra();
        }
      }
    }
  });
}
