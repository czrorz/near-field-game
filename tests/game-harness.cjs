'use strict';

// Offline logic harness: no browser, real layout, sound device or frame timing.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const GAME_FILE = path.join(__dirname, '..', 'index.html');

function createGame(fileOrHtml = GAME_FILE, {
  storage = {}, storageThrows = false, search = '?test',
} = {}) {
  const html = fileOrHtml.includes('<script>')
    ? fileOrHtml : fs.readFileSync(fileOrHtml, 'utf8');
  let script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  script = script.replace(/\}\)\(\);\s*$/,
    'window.__inspect = source => eval(source);\n})();');

  const stats = { writes: {}, storageWrites: 0 };
  const gradient = () => ({ addColorStop() {} });
  const ctx = new Proxy({
    globalAlpha: 1, createRadialGradient: gradient, createLinearGradient: gradient,
  }, {
    get(target, key) { return target[key] ?? (target[key] = () => {}); },
    set(target, key, value) { target[key] = value; return true; },
  });

  function eventTarget(object = {}) {
    return Object.assign(object, {
      events: {},
      addEventListener(type, fn) { (this.events[type] ??= []).push(fn); },
      dispatchEvent(event) {
        for (const fn of this.events[event.type] || []) fn(event);
      },
    });
  }

  const elements = new Map();
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    let content = '';
    const classes = new Set();
    const el = eventTarget({
      id, value: '', checked: false, open: false, hidden: false,
      width: 1200, height: 750, style: {},
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); },
      },
      getContext: () => ctx,
      getBoundingClientRect: () => ({
        x: 0, y: 0, left: 0, top: 0, width: 1200, height: 750,
      }),
      setAttribute(key, value) { this[key] = value; },
      getAttribute(key) { return this[key] ?? null; },
      blur() {}, setPointerCapture() {},
      get textContent() { return content; },
      set textContent(value) {
        stats.writes[id] = (stats.writes[id] || 0) + 1;
        content = String(value);
      },
    });
    elements.set(id, el);
    return el;
  }

  for (const match of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const el = element(match[2]);
    el.tagName = match[1].toUpperCase();
    for (const attr of ['min', 'max', 'step', 'value']) {
      const value = match[0].match(new RegExp('\\b' + attr + '="([^"]+)"'));
      if (value) el[attr] = value[1];
    }
    el.checked = /\bchecked\b/.test(match[0]);
  }
  for (const match of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = [...match[2].matchAll(/<option\b([^>]*)>/g)];
    const chosen = options.find(option => /\bselected\b/.test(option[1])) || options[0];
    element(match[1]).value = chosen?.[1].match(/\bvalue="([^"]+)"/)?.[1] ?? '';
  }

  const document = eventTarget({
    getElementById: element, documentElement: {}, hidden: false, activeElement: null,
    createTreeWalker: () => ({ nextNode: () => null }),
    querySelector: () => element('main'), querySelectorAll: () => [],
    createElement: () => element('generated'),
  });
  const sandbox = eventTarget({
    document, console, performance,
    navigator: { maxTouchPoints: 0, getGamepads: () => [] },
    location: { search }, URLSearchParams, NodeFilter: { SHOW_TEXT: 4 },
    localStorage: {
      getItem(key) {
        if (storageThrows) throw new Error('Storage unavailable');
        return storage[key] ?? null;
      },
      setItem(key, value) {
        if (storageThrows) throw new Error('Storage unavailable');
        stats.storageWrites++;
        storage[key] = value;
      },
    },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setTimeout: () => 1, clearTimeout() {},
    matchMedia: () => ({ matches: false }),
    ResizeObserver: class { observe() {} },
    Event: class { constructor(type) { this.type = type; } },
    devicePixelRatio: 1,
  });
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(script, context, { filename: GAME_FILE });
  return {
    api: sandbox.__fieldGame, inspect: sandbox.__inspect,
    elements, stats, context, html,
  };
}

module.exports = { createGame, GAME_FILE };
