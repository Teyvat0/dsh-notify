// Verification harness for @teyvat0/dsh-notify client.js (mock host, no DSH needed).
// Run: node plugins/dsh-notify/test/verify.mjs
// Simulates the DSH client module host: fake React, fake services, fake timers,
// fake Web Audio, fake IndexedDB-less storage and a recording Notification
// constructor. Asserts focus gate, sound presets, custom audio, truncate and
// the settings rows.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SRC = fileURLToPath(new URL('../client.js', import.meta.url));
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

// ---------- fake timers ----------
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
let timerId = 1;
const timers = new Map();
globalThis.setTimeout = (fn, ms) => { const id = timerId++; timers.set(id, { fn, ms }); return id; };
globalThis.clearTimeout = (id) => { timers.delete(id); };
function runTimers(minMs = 0) {
  for (const [id, t] of [...timers.entries()]) {
    if (t.ms >= minMs) { timers.delete(id); try { t.fn(); } catch (e) { console.log('timer threw:', e.message); } }
  }
}

// ---------- fake notifications ----------
const notifications = [];
class FakeNotification {
  constructor(title, opts) {
    this.title = title;
    this.body = opts?.body;
    this.tag = opts?.tag;
    this.silent = opts?.silent;
    this.closed = false;
    notifications.push(this);
  }
  close() { this.closed = true; }
}
FakeNotification.permission = 'granted';
FakeNotification.requestPermission = async () => 'granted';

// ---------- fake Web Audio ----------
const audio = { contexts: 0, oscillators: 0, buffers: 0, decodes: 0, gainNodes: [] };
class FakeAudioContext {
  constructor() {
    audio.contexts++;
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createOscillator() {
    audio.oscillators++;
    return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    const rec = { value: 0, ramps: [] };
    audio.gainNodes.push(rec);
    return {
      gain: {
        get value() { return rec.value; },
        set value(v) { rec.value = v; },
        setValueAtTime() {},
        exponentialRampToValueAtTime(v) { rec.ramps.push(v); }
      },
      connect() {}
    };
  }
  createBufferSource() {
    audio.buffers++;
    return { buffer: null, connect() {}, start() {} };
  }
  decodeAudioData(buffer, ok) { audio.decodes++; if (ok) ok({ duration: 0.5 }); }
  close() {}
}

// ---------- fake DOM ----------
const listeners = {};
globalThis.window = globalThis;
globalThis.Notification = FakeNotification;
globalThis.AudioContext = FakeAudioContext;
globalThis.FileReader = class {
  readAsArrayBuffer(file) { this.result = new ArrayBuffer(file?.size || 8); if (this.onload) this.onload(); }
};
let inputClickCount = 0;
globalThis.document = {
  visibilityState: 'visible',
  hasFocus: () => true,
  addEventListener: (t, f) => { (listeners[t] ||= []).push(f); },
  removeEventListener: () => {},
  createElement: (tag) => {
    const el = {
      tagName: String(tag).toUpperCase(),
      style: {},
      setAttribute() {},
      appendChild() {},
      remove() {},
      textContent: '',
      files: null,
      onclick: null,
      onchange: null,
      click() {
        if (tag === 'input') {
          inputClickCount++;
          el.files = [{ name: 'tone.wav', type: 'audio/wav', size: 16 }];
          if (el.onchange) el.onchange();
        }
      }
    };
    return el;
  },
  body: { appendChild() {} },
  head: { appendChild() {} },
  querySelector: () => null
};
globalThis.addEventListener = (t, f) => { (listeners[t] ||= []).push(f); };
globalThis.removeEventListener = () => {};
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k)
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// ---------- fake react ----------
const fakeReact = {
  createElement(type, props, ...children) {
    const kids = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false);
    return { type, props: { ...(props || {}), children: kids } };
  },
  useState(init) {
    return [typeof init === 'function' ? init() : init, () => {}];
  },
  useEffect(fn) { try { fn(); } catch (e) { console.log('useEffect threw:', e.message); } }
};

function textOf(node) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return textOf(node.props?.children);
}
function findAll(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, out)); return out; }
  if (pred(node)) out.push(node);
  findAll(node.props?.children, pred, out);
  return out;
}

// ---------- fake host ctx ----------
const subscribers = [];
const slots = [];
const sessionStatus = new Map();
const byId = {};
const sessionSnapshots = {};
const ctx = {
  locale: { getLocale: () => ({ active: 'zh-CN' }) },
  effect(fn) { const d = fn(); return d; },
  sessions: {
    list: { getSnapshot: () => ({ byId }) },
    binding: (id) => ({ session: { getSnapshot: () => sessionSnapshots[id] || { subagent: null, removed: false } } })
  },
  uiSession: {
    sessionStatus: {
      getSnapshot: () => sessionStatus,
      subscribe(fn) { subscribers.push(fn); return () => {}; }
    }
  },
  slots: {
    inject(name, cb) { const reg = cb(); slots.push({ name, reg }); return () => {}; },
    register(options, Component) { return { options, Component }; }
  }
};
function fire() { subscribers.forEach((f) => { try { f(); } catch (e) { console.log('subscriber threw:', e.message); } }); }

// ---------- load the client module ----------
let loadDef = null;
globalThis.window.__ModuleLoader__ = { load(def) { loadDef = def; } };
vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: 'client.js' });
check('module registers through __ModuleLoader__', !!loadDef && loadDef.id === '@teyvat0/dsh-notify', loadDef?.id);

const plugin = loadDef.factory((name) => {
  if (name === 'react') return fakeReact;
  throw new Error('unexpected require: ' + name);
});
check('plugin exposes name/inject/apply', plugin.name === 'dsh-notify' && typeof plugin.apply === 'function' && plugin.inject.includes('slots'), plugin.inject.join(','));

byId.s1 = { retainedBy: { mainView: 1 } };
sessionStatus.set('s1', { running: false, pendingInteraction: null });
plugin.apply(ctx);

await Promise.resolve();
await Promise.resolve();
runTimers(0);
const welcome = notifications.find((n) => n.title === 'DSH 通知已开启');
check('welcome toast fires via the system sound', !!welcome && welcome.silent === false, 'silent=' + welcome?.silent);
notifications.length = 0;

// ---------- settings rows ----------
const sectionSlot = slots.find((s) => s.name === 'settings.section');
const iconSlot = slots.find((s) => s.name === 'settings.section.icon');
const itemSlot = (id) => slots.find((s) => s.name === 'dsh-notify.item' && s.reg.options.id === id);
const soundSlot = itemSlot('notify-sound');
const volumeSlot = itemSlot('notify-volume');
const alwaysSlot = itemSlot('notify-always');
const testSlot = itemSlot('notify-test');

check('registers its own settings section', !!sectionSlot && sectionSlot.reg.options.id === 'notify' && sectionSlot.reg.options.order === 10, JSON.stringify(sectionSlot?.reg.options));
check('section label is localized', sectionSlot?.reg.options.label() === '通知', sectionSlot?.reg.options.label());
check('section declares its item slot', !!sectionSlot?.reg.options.children?.['dsh-notify.item'], JSON.stringify(sectionSlot?.reg.options.children));
check('nav icon registered for the section', !!iconSlot && iconSlot.reg.options.id === 'notify');
check('five item rows registered', !!soundSlot && !!volumeSlot && !!alwaysSlot && !!testSlot && slots.filter((s) => s.name === 'dsh-notify.item').length === 5, slots.map((s) => s.name + ':' + s.reg.options.id).join(','));
check('item ids/order', JSON.stringify(['notify-sound', 'notify-volume', 'notify-always', 'notify-test'].map((id) => [id, itemSlot(id).reg.options.order])) === JSON.stringify([['notify-sound', 0], ['notify-volume', 1], ['notify-always', 2], ['notify-test', 3]]));
check('no rows left in settings.general.item', slots.every((s) => s.name !== 'settings.general.item'));

const sectionTree = sectionSlot.reg.Component({ renderSlot: (name) => fakeReact.createElement('div', { 'data-slot': name }) });
check('section renders its item slot', findAll(sectionTree, (n) => n.props && n.props['data-slot'] === 'dsh-notify.item').length === 1);
const iconTree = iconSlot.reg.Component({ size: 16 });
check('nav icon renders an svg bell', iconTree.type === 'svg' && iconTree.props.width === 16 && iconTree.props.children.length === 2);

const soundTree = soundSlot.reg.Component({});
const soundSelect = findAll(soundTree, (n) => n.type === 'select')[0];
check('sound row renders a select', !!soundSelect);
check('sound select lists six presets', soundSelect?.props.children.length === 6, soundSelect?.props.children.map((o) => textOf(o)).join('/'));
check('sound defaults to system', soundSelect?.props.value === 'system');
const previewBtn = findAll(soundTree, (n) => n.type === 'button')[0];
check('sound row has a preview button', !!previewBtn && textOf(previewBtn).includes('试听'));

const switchTree = alwaysSlot.reg.Component({});
const switchBtn = findAll(switchTree, (n) => n.type === 'button' && n.props.role === 'switch')[0];
check('always-notify switch defaults to off', switchBtn?.props['aria-checked'] === false);

// ---------- completion gate ----------
document.hasFocus = () => true;
sessionStatus.set('s1', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s1', { running: false, pendingInteraction: null });
fire();
runTimers(0);
check('focused + switch off: completion suppressed', notifications.length === 0, `toasts=${notifications.length}`);

switchBtn.props.onClick();
sessionStatus.set('s1', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s1', { running: false, pendingInteraction: null });
fire();
runTimers(0);
let completion = notifications.filter((n) => n.title === 'DSH 运行结束');
check('focused + switch on: toast fires', completion.length === 1);
check('system preset keeps the Windows chime (silent=false)', completion[0]?.silent === false, 'silent=' + completion[0]?.silent);

// ---------- chime preset ----------
notifications.length = 0;
const oscBefore = audio.oscillators;
soundSelect.props.onChange({ target: { value: 'chime' } });
check('select stores chime preset', storage.get('dsh-notify:sound') === 'chime', storage.get('dsh-notify:sound'));
sessionStatus.set('s1', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s1', { running: false, pendingInteraction: null });
fire();
runTimers(0);
completion = notifications.filter((n) => n.title === 'DSH 运行结束');
check('chime: toast is muted (silent=true)', completion[0]?.silent === true, 'silent=' + completion[0]?.silent);
check('chime: oscillators scheduled', audio.oscillators === oscBefore + 2, `osc ${oscBefore} -> ${audio.oscillators}`);

// ---------- silent preset ----------
notifications.length = 0;
const oscBefore2 = audio.oscillators;
soundSelect.props.onChange({ target: { value: 'none' } });
sessionStatus.set('s1', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s1', { running: false, pendingInteraction: null });
fire();
runTimers(0);
completion = notifications.filter((n) => n.title === 'DSH 运行结束');
check('silent: toast still appears', completion.length === 1);
check('silent: muted and no audio', completion[0]?.silent === true && audio.oscillators === oscBefore2, `silent=${completion[0]?.silent} oscDelta=${audio.oscillators - oscBefore2}`);

// ---------- preview ----------
const previewNow = findAll(soundSlot.reg.Component({}), (n) => n.type === 'button')[0];
const oscBefore3 = audio.oscillators;
previewNow.props.onClick();
check('preview on silent preset plays nothing', audio.oscillators === oscBefore3);
soundSelect.props.onChange({ target: { value: 'system' } });
const previewSystem = findAll(soundSlot.reg.Component({}), (n) => n.type === 'button')[0];
previewSystem.props.onClick();
check('preview on system preset beeps in-app', audio.oscillators === oscBefore3 + 1, `oscDelta=${audio.oscillators - oscBefore3}`);

// ---------- volume row ----------
const volumeTree = volumeSlot.reg.Component({});
const volumeInput = findAll(volumeTree, (n) => n.type === 'input')[0];
check('volume row renders a slider at the default 80%', !!volumeInput && volumeInput.props.value === 80, String(volumeInput?.props.value));
check('volume row shows the percentage', textOf(volumeTree).includes('80%'), textOf(volumeTree));
volumeInput.props.onChange({ target: { value: '50' } });
check('slider stores the volume', storage.get('dsh-notify:volume') === '50', storage.get('dsh-notify:volume'));

soundSelect.props.onChange({ target: { value: 'chime' } });
const rampsBefore = audio.gainNodes.length;
sessionStatus.set('s1', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s1', { running: false, pendingInteraction: null });
fire();
runTimers(0);
const chimeRamps = audio.gainNodes.slice(rampsBefore).flatMap((n) => n.ramps).filter((v) => v > 0.001);
const chimePeak = Math.max(...chimeRamps);
check('chime peak scales with volume (0.38 * 0.5)', Math.abs(chimePeak - 0.19) < 0.005, 'peak=' + chimePeak);
volumeInput.props.onChange({ target: { value: '100' } });
const rampsBefore2 = audio.gainNodes.length;
sessionStatus.set('s1', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s1', { running: false, pendingInteraction: null });
fire();
runTimers(0);
const loudRamps = audio.gainNodes.slice(rampsBefore2).flatMap((n) => n.ramps).filter((v) => v > 0.001);
const loudPeak = Math.max(...loudRamps);
check('100% is substantially louder than the old 0.16 peak', loudPeak >= 0.37, 'peak=' + loudPeak);

// ---------- custom audio ----------
soundSelect.props.onChange({ target: { value: 'custom' } });
const customTree = soundSlot.reg.Component({});
const pickBtn = findAll(customTree, (n) => n.type === 'button')[1];
check('custom preset offers a file picker', !!pickBtn && textOf(pickBtn).includes('选择音频'), textOf(pickBtn));
const buffersBefore = audio.buffers;
pickBtn.props.onClick();
await new Promise((r) => realSetTimeout(r, 0));
await new Promise((r) => realSetTimeout(r, 0));
check('file picker opens an audio input', inputClickCount === 1);
check('custom file decodes and plays', audio.buffers === buffersBefore + 1 && audio.decodes === 1, `buffers=${audio.buffers} decodes=${audio.decodes}`);
check('custom file switches preset to custom', storage.get('dsh-notify:sound') === 'custom');
const customTree2 = soundSlot.reg.Component({});
check('custom file name is shown', textOf(customTree2).includes('tone.wav'), textOf(customTree2).slice(0, 60));
notifications.length = 0;
sessionStatus.set('s1', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s1', { running: false, pendingInteraction: null });
fire();
runTimers(0);
await new Promise((r) => realSetTimeout(r, 0));
completion = notifications.filter((n) => n.title === 'DSH 运行结束');
check('custom preset: toast muted and buffer replayed', completion[0]?.silent === true && audio.buffers === buffersBefore + 2, `silent=${completion[0]?.silent} buffers=${audio.buffers}`);
const lastBufferGain = audio.gainNodes[audio.gainNodes.length - 1];
check('custom buffer gain follows the volume', Math.abs(lastBufferGain.value - 0.95) < 0.001, 'gain=' + lastBufferGain.value);

// ---------- test button ----------
notifications.length = 0;
const testBtn = findAll(testSlot.reg.Component({}), (n) => n.type === 'button')[0];
testBtn.props.onClick();
runTimers(0);
const testToast = notifications.find((n) => n.title === 'DSH 通知测试');
check('test button stamps version and sound', !!testToast && /v1\.3\.4/.test(testToast.body) && /sound:custom/.test(testToast.body), testToast?.body);
check('completion toast tag fits the 16-char Windows field', !!completion[0] && completion[0].tag.length <= 16, 'tag=' + completion[0]?.tag + ' len=' + completion[0]?.tag?.length);
check('test toast tag fits the 16-char Windows field', !!testToast && testToast.tag.length <= 16, 'tag=' + testToast?.tag);


// ---------- pending: approval + truncate ----------
notifications.length = 0;
sessionStatus.set('s1', {
  running: true,
  pendingInteraction: { kind: 'approval', key: 'k1', toolName: 'bash', displayReason: 'run   rm\n\n-rf    /tmp/x' }
});
fire();
const approvalToast = notifications.find((n) => n.title === 'DSH 需要你的批准');
check('approval toast fires', !!approvalToast);
check('approval body collapses whitespace', !!approvalToast && approvalToast.body.includes('bash · run rm -rf /tmp/x'), approvalToast?.body);

// ---------- subagent session ignored ----------
notifications.length = 0;
byId.s2 = { retainedBy: {} };
sessionSnapshots.s2 = { subagent: { address: 'a' }, removed: false };
sessionStatus.set('s2', { running: true, pendingInteraction: null });
fire();
sessionStatus.set('s2', { running: false, pendingInteraction: null });
fire();
runTimers(0);
check('subagent session does not toast on completion', notifications.filter((n) => n.title === 'DSH 运行结束').length === 0);

// ---------- cleanup ----------
globalThis.setTimeout = realSetTimeout;
globalThis.clearTimeout = realClearTimeout;

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log('FAILED: ' + failed.map((f) => f.name).join('; ')); process.exitCode = 1; }
