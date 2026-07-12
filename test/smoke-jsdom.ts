/** DOM globals for the CSESK panel smoke (imported first). */
declare function require(name: string): any;
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).SVGSVGElement = dom.window.SVGSVGElement;
(globalThis as any).HTMLElement = dom.window.HTMLElement;

export {};
