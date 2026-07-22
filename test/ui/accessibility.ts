import { expect, type Page } from '@playwright/test';

type AuditResult = {
  issues: string[];
  contrast: Record<string, number>;
};

/**
 * A deliberately small, dependency-free guard for the contracts the shell
 * owns. It complements browser accessibility-tree assertions in the specs;
 * Blockly's SVG internals remain covered by Blockly itself.
 */
export async function expectWorkbenchAccessibility(page: Page): Promise<void> {
  const result = await page.evaluate((): AuditResult => {
    const issues: string[] = [];
    const isVisible = (element: Element): boolean => {
      const style = getComputedStyle(element);
      return !element.closest('[hidden]') && style.display !== 'none' && style.visibility !== 'hidden'
        && (element as HTMLElement).getClientRects().length > 0;
    };
    const labelText = (idList: string | null): string => (idList ?? '')
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .join(' ')
      .trim();
    const accessibleName = (element: HTMLElement): string => {
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;
      const labelledBy = labelText(element.getAttribute('aria-labelledby'));
      if (labelledBy) return labelledBy;
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
        const label = element.id ? document.querySelector<HTMLLabelElement>(`label[for="${element.id}"]`) : null;
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    };

    const idCounts = new Map<string, number>();
    document.querySelectorAll<HTMLElement>('[id]').forEach((element) => {
      idCounts.set(element.id, (idCounts.get(element.id) ?? 0) + 1);
    });
    for (const [id, count] of idCounts) if (count > 1) issues.push(`duplicate id: ${id}`);

    const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
    if (headings.filter((heading) => heading.tagName === 'H1').length !== 1) issues.push('expected one h1');
    let previousLevel = 0;
    for (const heading of headings) {
      const level = Number(heading.tagName.slice(1));
      if (previousLevel && level > previousLevel + 1) issues.push(`heading level skips before ${heading.textContent?.trim()}`);
      previousLevel = level;
    }
    for (const selector of ['header', 'main', 'footer', 'nav[aria-label]']) {
      if (!document.querySelector(selector)) issues.push(`missing landmark: ${selector}`);
    }

    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type="hidden"]):not([type="file"]), select, [role="tab"], [role="menuitem"], [role="menuitemcheckbox"]'
    )).filter(isVisible);
    for (const control of controls) {
      if (!accessibleName(control)) issues.push(`control has no accessible name: ${control.id || control.outerHTML.slice(0, 80)}`);
    }

    for (const control of Array.from(document.querySelectorAll<HTMLElement>('[aria-controls]'))) {
      const target = control.getAttribute('aria-controls');
      if (target && !document.getElementById(target)) issues.push(`aria-controls target missing: ${control.id} -> ${target}`);
    }
    for (const tablist of Array.from(document.querySelectorAll<HTMLElement>('[role="tablist"]')).filter(isVisible)) {
      const tabs = Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'));
      if (!tabs.length) issues.push(`tablist has no tabs: ${tablist.getAttribute('aria-label') ?? 'unnamed'}`);
      if (tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').length !== 1) {
        issues.push(`tablist must have one selected tab: ${tablist.getAttribute('aria-label') ?? 'unnamed'}`);
      }
      for (const tab of tabs) {
        const panelId = tab.getAttribute('aria-controls');
        if (!panelId || !document.getElementById(panelId)) issues.push(`tab panel missing: ${tab.id}`);
      }
    }
    for (const menu of Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'))) {
      const menuItems = menu.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]');
      if (!menuItems.length) issues.push(`menu has no menu items: ${menu.id || 'unnamed'}`);
    }
    for (const item of Array.from(document.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'
    ))) {
      if (!item.closest('[role="menu"], [role="menubar"]')) {
        issues.push(`menu item has no menu owner: ${item.id || item.outerHTML.slice(0, 80)}`);
      }
    }

    const toRgb = (value: string): [number, number, number] | null => {
      const hex = value.trim().replace('#', '');
      if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return null;
      const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
      return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16)) as [number, number, number];
    };
    const luminance = (rgb: [number, number, number]): number => rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const contrastRatio = (a: string, b: string): number => {
      const first = toRgb(a);
      const second = toRgb(b);
      if (!first || !second) return 0;
      const [lighter, darker] = [luminance(first), luminance(second)].sort((x, y) => y - x);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const root = getComputedStyle(document.body);
    const contrast = {
      primaryOnRaised: contrastRatio(root.getPropertyValue('--text-primary'), root.getPropertyValue('--surface-raised')),
      secondaryOnRaised: contrastRatio(root.getPropertyValue('--text-secondary'), root.getPropertyValue('--surface-raised')),
      secondaryOnRecessed: contrastRatio(root.getPropertyValue('--text-secondary'), root.getPropertyValue('--surface-recessed')),
      primaryOnWorkspace: contrastRatio(root.getPropertyValue('--text-primary'), root.getPropertyValue('--surface-workspace')),
      accentOnWorkspace: contrastRatio(root.getPropertyValue('--accent-primary'), root.getPropertyValue('--surface-workspace')),
      focusOnRaised: contrastRatio(root.getPropertyValue('--accent-primary'), root.getPropertyValue('--surface-raised'))
    };
    if (contrast.primaryOnRaised < 4.5
      || contrast.secondaryOnRaised < 4.5
      || contrast.secondaryOnRecessed < 4.5
      || contrast.primaryOnWorkspace < 4.5
      || contrast.accentOnWorkspace < 3
      || contrast.focusOnRaised < 3) {
      issues.push(`insufficient shell contrast: ${JSON.stringify(contrast)}`);
    }
    return { issues, contrast };
  });
  expect(result.issues).toEqual([]);
}
