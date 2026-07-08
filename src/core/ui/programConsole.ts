/**
 * The inspector's Output tab as a console monitor: whichever stepper most
 * recently rendered mirrors its System.out.println lines here, so program
 * output is readable without keeping the viz dock's own output panel in
 * view. Editor actions (export, clipboard) append as plain log lines and
 * stay until the next mirrored run overwrites them.
 */

const EMPTY_HINT = '(no output yet)';

let mirroredBody = '';

function consoleEl(): HTMLPreElement {
  const el = document.getElementById('program-output');
  if (!el) throw new Error('Missing element #program-output');
  return el as HTMLPreElement;
}

/**
 * Replaces the console with the current run's println lines. A `note` marks
 * a run that has ended (finished or stuck), so the empty hint drops "yet".
 */
export function mirrorProgramOutput(source: string, lines: string[], note?: string): void {
  const el = consoleEl();
  const body = lines.join('\n');
  const parts = [`[${source}]`, body || (note ? '(no output)' : EMPTY_HINT)];
  if (note) parts.push(note);
  el.textContent = parts.join('\n');
  el.scrollTop = el.scrollHeight;
  if (body && body !== mirroredBody) {
    el.classList.remove('is-console-changed');
    void el.offsetWidth; /* restart the flash animation */
    el.classList.add('is-console-changed');
  } else if (!body) {
    el.classList.remove('is-console-changed');
  }
  mirroredBody = body;
}

/** Appends an editor-action log line (export, clipboard, …). */
export function appendConsoleLog(message: string): void {
  const el = consoleEl();
  const text = el.textContent?.trim();
  el.textContent = text && text !== 'No run yet.' ? `${text}\n${message}` : message;
  el.scrollTop = el.scrollHeight;
  mirroredBody = '';
}
