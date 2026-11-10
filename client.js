window.__ModuleLoader__.load({
  id: '@teyvat0/dsh-notify',
  factory(require) {
    'use strict';

    var React = require('react');
    var h = React.createElement;

    var CLIENT_VERSION = '1.3.5';

    var STORAGE_ALWAYS = 'dsh-notify:alwaysNotify';
    var STORAGE_SOUND = 'dsh-notify:sound';
    var STORAGE_VOLUME = 'dsh-notify:volume';
    var DEFAULT_VOLUME = 80;
    var DEFAULT_SOUND = 'system';

    var DEFAULTS = {
      // Only alert when the DSH window is not the foreground window. This is
      // the Codex-like behaviour: the UI already shows the state when focused.
      onlyWhenUnfocused: true,
      notifyOnComplete: true,
      notifyOnPending: true,
      welcome: true,
      completionDelayMs: 1200,
      pendingBodyMaxChars: 120
    };

    var ZH = {
      completeTitle: 'DSH 运行结束',
      completeBody: '本轮任务已完成，点击查看结果。',
      approvalTitle: 'DSH 需要你的批准',
      approvalBody: '有工具请求执行，请切回 DSH 处理。',
      questionTitle: 'DSH 需要你的回答',
      questionBody: 'DSH 正在等待你的选择。',
      planReviewTitle: 'DSH 计划待确认',
      planReviewBody: 'DSH 提交了一份计划，等待你的确认。',
      pendingTitle: 'DSH 需要你的操作',
      pendingBody: 'DSH 正在等待你的输入。',
      welcomeTitle: 'DSH 通知已开启',
      welcomeBody: '任务结束、需要批准或回答时会提醒你；默认仅在你切到其他窗口时弹出，可在「设置 → 通知」改为总是提醒。',
      testTitle: 'DSH 通知测试',
      testBody: '如果你看到这条通知，说明通知通道正常。'
    };

    var EN = {
      completeTitle: 'DSH run finished',
      completeBody: 'This turn is complete. Click to view the result.',
      approvalTitle: 'DSH needs your approval',
      approvalBody: 'A tool request is waiting. Switch back to DSH.',
      questionTitle: 'DSH needs your answer',
      questionBody: 'DSH is waiting for your choice.',
      planReviewTitle: 'DSH plan awaiting review',
      planReviewBody: 'DSH submitted a plan for confirmation.',
      pendingTitle: 'DSH needs your input',
      pendingBody: 'DSH is waiting for you.',
      welcomeTitle: 'DSH notifications are on',
      welcomeBody: 'I will alert you when a run finishes or DSH needs approval or an answer. By default only while another window is focused; switch to always-alert in Settings - Notifications.',
      testTitle: 'DSH notification test',
      testBody: 'If you can see this notification, delivery works.'
    };

    var ZH_SETTINGS = {
      navTitle: '通知',
      volumeTitle: '提醒音量',
      volumeDesc: '合成提示音与自定义音频的播放音量；Windows 系统默认音由系统音量控制。',
      volumeValue: '音量',
      volumeInactive: '当前声音不使用该音量（系统默认音跟随 Windows 音量，静音不发声）。',
      alwaysTitle: '总是弹窗提醒',
      alwaysDesc: '开启后，即使 DSH 在前台（你正看着它）也会弹通知；关闭则只在你切到其他窗口时提醒。',
      testRowTitle: '测试通知',
      testRowDesc: '立即发送一条系统通知，用来确认通知通道正常。',
      testButton: '发送测试',
      testSent: '已发送',
      testOn: '焦点：DSH 在前台',
      testOff: '焦点：其他窗口',
      soundTitle: '提醒声音',
      soundDesc: '通知弹出时播放的提示音。系统默认用 Windows 通知自带的声音；选择其他项会用本插件自己的声音。',
      soundSystem: '系统默认',
      soundNone: '静音',
      soundChime: '清脆',
      soundDrop: '低沉',
      soundDouble: '双响',
      soundCustom: '自定义文件',
      soundPreview: '试听',
      soundPick: '选择音频',
      soundChange: '更换文件',
      soundMissing: '还没选择音频文件',
      soundKeepSession: '本次会话有效，未能写入磁盘',
      diagTitle: '诊断信息',
      diagDesc: '最近 16 条通知判定记录（来自正在运行的插件），用来排查“为什么没弹”。',
      diagEmpty: '（暂无记录：发生一次运行结束或批准后会出现）'
    };

    var EN_SETTINGS = {
      navTitle: 'Notifications',
      volumeTitle: 'Alert volume',
      volumeDesc: 'Playback volume for the built-in chimes and a custom audio file. The Windows system sound follows the system volume.',
      volumeValue: 'Volume',
      volumeInactive: 'This sound ignores the slider (the Windows default follows system volume; Silent plays nothing).',
      alwaysTitle: 'Always show notifications',
      alwaysDesc: 'When on, notifications appear even while DSH is the foreground window. When off, DSH only alerts after you switch to another window.',
      testRowTitle: 'Test notification',
      testRowDesc: 'Send one system notification right now to confirm the channel works.',
      testButton: 'Send test',
      testSent: 'Sent',
      testOn: 'Focus: DSH in front',
      testOff: 'Focus: another window',
      soundTitle: 'Notification sound',
      soundDesc: 'Sound played with a notification. The Windows default uses the toast’s own chime; other options use the sound from this plugin.',
      soundSystem: 'System default',
      soundNone: 'Silent',
      soundChime: 'Chime',
      soundDrop: 'Low drop',
      soundDouble: 'Double blip',
      soundCustom: 'Custom file',
      soundPreview: 'Preview',
      soundPick: 'Choose audio',
      soundChange: 'Change file',
      soundMissing: 'No audio file chosen yet',
      soundKeepSession: 'Works for this session only; not saved to disk',
      diagTitle: 'Diagnostics',
      diagDesc: 'The last 16 reminder decisions from the running plugin, for troubleshooting missing toasts.',
      diagEmpty: '(nothing yet: trigger a run end or an approval first)'
    };

    function isZh(ctx) {
      try {
        return String(ctx.locale.getLocale().active || '').toLowerCase().indexOf('zh') === 0;
      } catch (e) {
        return true;
      }
    }

    function truncate(value, max) {
      if (typeof value !== 'string') return '';
      var text = value.replace(/[\s\u3000]+/g, ' ').trim();
      if (!text) return '';
      return text.length <= max ? text : text.slice(0, Math.max(1, max - 1)) + '…';
    }

    function beep(volume) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        var level = typeof volume === 'number' ? Math.max(0, Math.min(1, volume)) : 0.8;
        var ac = new AC();
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.32 * level), ac.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.3);
        setTimeout(function () {
          try { ac.close(); } catch (e) { /* ignore */ }
        }, 800);
      } catch (e) {
        // Audio is a best-effort fallback only.
      }
    }

    function fallbackBanner(title, body) {
      try {
        var el = document.createElement('div');
        el.setAttribute('data-dsh-notify', 'fallback');
        el.style.cssText = [
          'position:fixed',
          'right:16px',
          'bottom:16px',
          'z-index:2147483647',
          'max-width:360px',
          'padding:12px 14px',
          'border-radius:10px',
          'background:#1f1f23',
          'color:#f5f5f5',
          'font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif',
          'box-shadow:0 8px 28px rgba(0,0,0,.45)',
          'border:1px solid rgba(255,255,255,.14)'
        ].join(';');
        var heading = document.createElement('div');
        heading.textContent = title;
        heading.style.cssText = 'font-weight:600;margin-bottom:4px;';
        var detail = document.createElement('div');
        detail.textContent = body;
        el.appendChild(heading);
        el.appendChild(detail);
        document.body.appendChild(el);
        setTimeout(function () {
          try { el.remove(); } catch (e) { /* ignore */ }
        }, 8000);
      } catch (e) {
        // The DOM fallback is itself best-effort.
      }
    }

    function createBoolStore(key, fallback) {
      var listeners = new Set();
      var current = fallback;
      try {
        var raw = localStorage.getItem(key);
        if (raw === '1') current = true;
        else if (raw === '0') current = false;
      } catch (e) {
        // Storage may be unavailable; keep the in-memory default.
      }
      return {
        getSnapshot: function () { return current; },
        subscribe: function (listener) {
          listeners.add(listener);
          return function () { listeners.delete(listener); };
        },
        set: function (next) {
          current = !!next;
          try { localStorage.setItem(key, current ? '1' : '0'); } catch (e) { /* ignore */ }
          listeners.forEach(function (listener) {
            try { listener(); } catch (e) { /* ignore */ }
          });
        }
      };
    }

    function useBoolStore(store) {
      var pair = React.useState(store.getSnapshot());
      var value = pair[0];
      var setValue = pair[1];
      React.useEffect(function () {
        setValue(store.getSnapshot());
        return store.subscribe(function () {
          setValue(store.getSnapshot());
        });
      }, []);
      return value;
    }

    function createStringStore(key, fallback) {
      var listeners = new Set();
      var current = fallback;
      try {
        var raw = localStorage.getItem(key);
        if (typeof raw === 'string' && raw) current = raw;
      } catch (e) {
        // Storage may be unavailable; keep the in-memory default.
      }
      return {
        getSnapshot: function () { return current; },
        subscribe: function (listener) {
          listeners.add(listener);
          return function () { listeners.delete(listener); };
        },
        set: function (next) {
          current = String(next);
          try { localStorage.setItem(key, current); } catch (e) { /* ignore */ }
          listeners.forEach(function (listener) {
            try { listener(); } catch (e) { /* ignore */ }
          });
        }
      };
    }

    function useStringStore(store) {
      var pair = React.useState(store.getSnapshot());
      var setValue = pair[1];
      React.useEffect(function () {
        setValue(store.getSnapshot());
        return store.subscribe(function () {
          setValue(store.getSnapshot());
        });
      }, []);
      return pair[0];
    }

    function clampVolume(value) {
      var n = typeof value === 'number' ? value : Number(value);
      if (!isFinite(n)) return DEFAULT_VOLUME;
      return Math.max(0, Math.min(100, Math.round(n)));
    }

    function createNumberStore(key, fallback, normalize) {
      var listeners = new Set();
      var current = normalize(fallback);
      try {
        var raw = localStorage.getItem(key);
        if (raw !== null && raw !== '') current = normalize(raw);
      } catch (e) {
        // Storage may be unavailable; keep the in-memory default.
      }
      return {
        getSnapshot: function () { return current; },
        subscribe: function (listener) {
          listeners.add(listener);
          return function () { listeners.delete(listener); };
        },
        set: function (next) {
          current = normalize(next);
          try { localStorage.setItem(key, String(current)); } catch (e) { /* ignore */ }
          listeners.forEach(function (listener) {
            try { listener(); } catch (e) { /* ignore */ }
          });
        }
      };
    }

    function useNumberStore(store) {
      var pair = React.useState(store.getSnapshot());
      var setValue = pair[1];
      React.useEffect(function () {
        setValue(store.getSnapshot());
        return store.subscribe(function () {
          setValue(store.getSnapshot());
        });
      }, []);
      return pair[0];
    }

    // ---------------------------------------------------------------------
    // Alert sounds.
    //
    // `system` keeps the toast's own Windows chime (silent: false). Every
    // other preset mutes the toast and plays audio from the renderer with
    // Web Audio, so no bundled asset is needed and the sounds cannot 404.
    // ---------------------------------------------------------------------
    var audioState = { ctx: null, decodedKey: '', decoded: null };

    function getAudioContext() {
      if (audioState.ctx) return audioState.ctx;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioState.ctx = new AC();
      } catch (e) {
        return null;
      }
      return audioState.ctx;
    }

    // f: hertz, t: start offset (s), d: duration (s), g: peak gain, w: waveform
    var TONE_PRESETS = {
      chime: [
        { f: 1046.5, t: 0, d: 0.22, g: 0.38, w: 'sine' },
        { f: 1568.0, t: 0.11, d: 0.30, g: 0.26, w: 'sine' }
      ],
      drop: [
        { f: 880.0, t: 0, d: 0.14, g: 0.40, w: 'sine' },
        { f: 587.3, t: 0.10, d: 0.28, g: 0.32, w: 'sine' }
      ],
      double: [
        { f: 1174.7, t: 0, d: 0.08, g: 0.42, w: 'triangle' },
        { f: 1174.7, t: 0.18, d: 0.08, g: 0.42, w: 'triangle' }
      ]
    };

    function playTonePreset(name, volume) {
      var tones = TONE_PRESETS[name];
      if (!tones) return false;
      var ac = getAudioContext();
      if (!ac) return false;
      var level = typeof volume === 'number' ? Math.max(0, Math.min(1, volume)) : 0.8;
      try {
        if (ac.state === 'suspended') ac.resume();
      } catch (e) { /* ignore */ }
      try {
        tones.forEach(function (tone) {
          var osc = ac.createOscillator();
          var gain = ac.createGain();
          var start = ac.currentTime + tone.t;
          osc.type = tone.w;
          osc.frequency.value = tone.f;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, tone.g * level), start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.d);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(start);
          osc.stop(start + tone.d + 0.02);
        });
        return true;
      } catch (e) {
        return false;
      }
    }

    function playAudioRecord(record, volume) {
      if (!record || !record.data) return Promise.resolve(false);
      var ac = getAudioContext();
      if (!ac) return Promise.resolve(false);
      var key = (record.name || '') + ':' + (record.size || record.data.byteLength || 0);
      var decoded;
      if (audioState.decoded && audioState.decodedKey === key) {
        decoded = Promise.resolve(audioState.decoded);
      } else {
        decoded = new Promise(function (resolve, reject) {
          try {
            // decodeAudioData detaches the buffer on some engines; hand it a copy.
            ac.decodeAudioData(record.data.slice(0), resolve, reject);
          } catch (e) {
            reject(e);
          }
        }).then(function (buffer) {
          audioState.decodedKey = key;
          audioState.decoded = buffer;
          return buffer;
        });
      }
      return decoded.then(function (buffer) {
        try {
          if (ac.state === 'suspended') ac.resume();
          var source = ac.createBufferSource();
          var gain = ac.createGain();
          source.buffer = buffer;
          gain.gain.value = 0.95 * (typeof volume === 'number' ? Math.max(0, Math.min(1, volume)) : 0.8);
          source.connect(gain);
          gain.connect(ac.destination);
          source.start(0);
          return true;
        } catch (e) {
          return false;
        }
      }).catch(function () {
        return false;
      });
    }

    // ---------------------------------------------------------------------
    // IndexedDB storage for one custom audio file.
    // ---------------------------------------------------------------------
    var ASSET_DB = 'dsh-notify';
    var ASSET_STORE = 'assets';
    var ASSET_KEY = 'custom-sound';

    function openAssetDb() {
      return new Promise(function (resolve, reject) {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('indexedDB unavailable'));
          return;
        }
        var request;
        try {
          request = indexedDB.open(ASSET_DB, 1);
        } catch (e) {
          reject(e);
          return;
        }
        request.onupgradeneeded = function () {
          var db = request.result;
          if (!db.objectStoreNames.contains(ASSET_STORE)) {
            db.createObjectStore(ASSET_STORE, { keyPath: 'id' });
          }
        };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error || new Error('indexedDB open failed')); };
      });
    }

    function assetDbRequest(mode, run) {
      return openAssetDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx;
          try {
            tx = db.transaction(ASSET_STORE, mode);
          } catch (e) {
            reject(e);
            return;
          }
          var store = tx.objectStore(ASSET_STORE);
          var request = run(store);
          tx.oncomplete = function () { resolve(request && request.result); };
          tx.onerror = function () { reject(tx.error || new Error('indexedDB transaction failed')); };
          request.onerror = function () { reject(request.error || new Error('indexedDB request failed')); };
        });
      });
    }

    function saveCustomSoundRecord(record) {
      return assetDbRequest('readwrite', function (store) {
        return store.put({ id: ASSET_KEY, name: record.name, type: record.type, size: record.size, data: record.data });
      });
    }

    function loadCustomSoundRecord() {
      return assetDbRequest('readonly', function (store) {
        return store.get(ASSET_KEY);
      });
    }

    // Row geometry mirrors the shipped Settings rows so the plugin sits in the
    // General section without its own container chrome.
    var ROW_STYLE = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px',
      padding: '16px 0',
      borderBottom: '1px solid var(--dsw-alias-border-l1)',
      color: 'var(--dsw-alias-label-primary)'
    };
    var ROW_TEXT_STYLE = { minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' };
    var ROW_TITLE_STYLE = { fontSize: '14px', lineHeight: '22px' };
    var ROW_DESC_STYLE = { fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' };
    var BUTTON_STYLE = {
      flex: 'none',
      padding: '4px 12px',
      borderRadius: '6px',
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      lineHeight: '18px',
      cursor: 'pointer'
    };
    var SELECT_STYLE = {
      flex: 'none',
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      lineHeight: '18px',
      cursor: 'pointer'
    };

    function apply(ctx) {
      var options = {};
      for (var key in DEFAULTS) options[key] = DEFAULTS[key];

      var alwaysNotify = createBoolStore(STORAGE_ALWAYS, false);
      var soundPreset = createStringStore(STORAGE_SOUND, DEFAULT_SOUND);
      var volume = createNumberStore(STORAGE_VOLUME, DEFAULT_VOLUME, clampVolume);
      var soundAsset = { loaded: false, record: null };
      loadCustomSoundRecord().then(function (record) {
        soundAsset.record = record || null;
        soundAsset.loaded = true;
      }).catch(function () {
        soundAsset.loaded = true;
      });
      var text = isZh(ctx) ? ZH : EN;
      var state = {
        shown: new Map(),
        timers: new Map(),
        previous: new Map(),
        pendingNotified: new Set(),
        seeded: false,
        fallbackBeeped: false,
        lastSize: -1
      };

      // -------------------------------------------------------------------
      // Diagnostics (1.3.1). A compact in-memory ring of what the reminder
      // decision actually observed, rendered in Settings - Notifications so
      // a missing toast can be read out of the running app instead of guessed.
      // -------------------------------------------------------------------
      var diagLines = [];
      var diagListeners = new Set();
      var diagText = '';
      function diagSnapshot() { return diagText; }
      function diagSubscribe(listener) {
        diagListeners.add(listener);
        return function () { diagListeners.delete(listener); };
      }
      function fmtTri(value) {
        if (value === true) return 'T';
        if (value === false) return 'F';
        return '-';
      }
      function shortId(sessionId) {
        var value = String(sessionId);
        return value.length > 8 ? value.slice(0, 8) : value;
      }
      function mainRetention(sessionId) {
        var row = sessionRow(sessionId);
        if (!row || !row.retainedBy) return 'n/a';
        return String(row.retainedBy.mainView || 0);
      }
      function diag(line) {
        var stamp = '';
        try { stamp = new Date().toTimeString().slice(0, 8); } catch (e) { /* ignore */ }
        diagLines.push(stamp + ' ' + line);
        if (diagLines.length > 16) diagLines.shift();
        diagText = diagLines.join('\n');
        diagListeners.forEach(function (listener) {
          try { listener(); } catch (e) { /* ignore */ }
        });
        try { window.__dshNotifyDiag = diagLines.slice(); } catch (e) { /* ignore */ }
        try { console.info('[dsh-notify] ' + diagLines[diagLines.length - 1]); } catch (e) { /* ignore */ }
      }
      diag('boot v' + CLIENT_VERSION + ' perm=' + permission() + ' always=' + fmtTri(alwaysNotify.getSnapshot()));


      function L() {
        return isZh(ctx) ? ZH_SETTINGS : EN_SETTINGS;
      }

      function volumeFactor() {
        return volume.getSnapshot() / 100;
      }

      // `fallback` means there is no toast carrying the Windows chime, so the
      // system preset degrades to an in-app beep instead of staying silent.
      function playSelectedSound(fallback) {
        var preset = soundPreset.getSnapshot();
        if (preset === 'none') return;
        if (preset === 'system') {
          if (fallback) beep(volumeFactor());
          return;
        }
        if (preset === 'custom') {
          var play = function (record) {
            if (!record) {
              beep(volumeFactor());
              return;
            }
            playAudioRecord(record, volumeFactor()).then(function (ok) {
              if (!ok) beep(volumeFactor());
            });
          };
          if (soundAsset.loaded) {
            play(soundAsset.record);
            return;
          }
          loadCustomSoundRecord().then(function (record) {
            soundAsset.loaded = true;
            soundAsset.record = record || null;
            play(record);
          }).catch(function () {
            soundAsset.loaded = true;
            play(null);
          });
          return;
        }
        if (!playTonePreset(preset, volumeFactor())) beep(volumeFactor());
      }

      function hasNotificationApi() {
        return typeof Notification !== 'undefined';
      }

      function permission() {
        if (!hasNotificationApi()) return 'unsupported';
        return Notification.permission || 'default';
      }

      function requestPermission() {
        if (!hasNotificationApi()) return Promise.resolve('unsupported');
        if (Notification.permission === 'granted') return Promise.resolve('granted');
        if (Notification.permission === 'denied') return Promise.resolve('denied');
        try {
          return Promise.resolve(Notification.requestPermission()).then(function (result) {
            return result || Notification.permission || 'default';
          }).catch(function () {
            return 'denied';
          });
        } catch (e) {
          return Promise.resolve('denied');
        }
      }

      function focused() {
        try {
          return document.visibilityState === 'visible' && document.hasFocus();
        } catch (e) {
          return false;
        }
      }

      // The user-facing switch in Settings -> General disables the focus gate
      // entirely, which is both the test path and the stronger reminder.
      function shouldAlert() {
        if (alwaysNotify.getSnapshot()) return true;
        return !options.onlyWhenUnfocused || !focused();
      }

      function closeTag(tag) {
        var notice = state.shown.get(tag);
        if (!notice) return;
        state.shown.delete(tag);
        try { notice.close(); } catch (e) { /* ignore */ }
      }

      function closePrefix(prefix) {
        var tags = [];
        state.shown.forEach(function (_notice, tag) {
          if (tag.indexOf(prefix) === 0) tags.push(tag);
        });
        tags.forEach(closeTag);
      }

      function forgetPrefix(prefix) {
        var tags = [];
        state.pendingNotified.forEach(function (tag) {
          if (tag.indexOf(prefix) === 0) tags.push(tag);
        });
        tags.forEach(function (tag) { state.pendingNotified.delete(tag); });
      }

      function closePending(prefix) {
        closePrefix(prefix);
        forgetPrefix(prefix);
      }

      // Windows toast tags are limited to 16 UTF-16 characters; our logical
      // tags (session ids + interaction keys) are far longer. Keep the logical
      // tag for prefix bookkeeping and hand Chromium a short, stable alias.
      var shortTagMap = Object.create(null);
      var shortTagUsed = Object.create(null);
      var shortTagSalt = 0;
      function shortTagFor(logicalTag) {
        var known = shortTagMap[logicalTag];
        if (known) return known;
        var hash = 5381;
        for (var i = 0; i < logicalTag.length; i += 1) {
          hash = (((hash << 5) + hash) ^ logicalTag.charCodeAt(i)) >>> 0;
        }
        var candidate = 'dsh' + hash.toString(36);
        while (shortTagUsed[candidate]) {
          shortTagSalt += 1;
          candidate = 'dsh' + hash.toString(36) + shortTagSalt.toString(36);
        }
        shortTagMap[logicalTag] = candidate;
        shortTagUsed[candidate] = true;
        return candidate;
      }

      function show(tag, title, body, opts, retried) {
        opts = opts || {};
        if (!hasNotificationApi()) {
          diag('show ' + tag + ' -> no-api');
          if (!state.fallbackBeeped) {
            state.fallbackBeeped = true;
            playSelectedSound(true);
          }
          fallbackBanner(title, body);
          return null;
        }
        if (Notification.permission === 'default' && !retried) {
          diag('show ' + tag + ' -> ask-permission');
          requestPermission().then(function () {
            show(tag, title, body, opts, true);
          });
          return null;
        }
        if (Notification.permission !== 'granted') {
          diag('show ' + tag + ' -> perm=' + Notification.permission);
          if (!state.fallbackBeeped) {
            state.fallbackBeeped = true;
            playSelectedSound(true);
          }
          fallbackBanner(title, body);
          return null;
        }

        var useSystemSound = soundPreset.getSnapshot() === 'system';
        closeTag(tag);
        var notice;
        try {
          notice = new Notification(title, {
            body: body,
            tag: shortTagFor(tag),
            renotify: true,
            requireInteraction: opts.requireInteraction !== false,
            silent: !useSystemSound
          });
        } catch (error) {
          diag('show ' + tag + ' -> error: ' + (error && error.message ? error.message : String(error)));
          try { console.warn('[dsh-notify] Notification constructor failed:', error); } catch (e) { /* ignore */ }
          fallbackBanner(title, body);
          playSelectedSound(true);
          return null;
        }
        if (!useSystemSound) playSelectedSound(false);
        diag('show ' + tag + ' [' + shortTagFor(tag) + '] -> ok silent=' + fmtTri(!useSystemSound));

        state.shown.set(tag, notice);
        notice.onclose = function () {
          if (state.shown.get(tag) === notice) state.shown.delete(tag);
        };
        notice.onerror = function () {
          diag('toast error ' + tag);
          if (state.shown.get(tag) === notice) state.shown.delete(tag);
        };
        notice.onclick = function () {
          try { window.focus(); } catch (e) { /* ignore */ }
          try { notice.close(); } catch (e) { /* ignore */ }
        };
        return notice;
      }

      function sessionRow(sessionId) {
        try {
          return ctx.sessions.list.getSnapshot().byId[sessionId] || null;
        } catch (e) {
          return null;
        }
      }

      function sessionSnapshot(sessionId) {
        try {
          var binding = ctx.sessions.binding(sessionId);
          var session = binding && binding.session;
          return session && typeof session.getSnapshot === 'function' ? session.getSnapshot() : null;
        } catch (e) {
          return null;
        }
      }

      // Completion reminders are meant for the run the user is waiting on, not
      // for every subagent that settles. Prefer the main-view retention count,
      // then fall back to "a real, non-subagent, non-removed Session" so a
      // background Session still alerts.
      function shouldNotifyCompletion(sessionId) {
        var row = sessionRow(sessionId);
        if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) return true;
        var snapshot = sessionSnapshot(sessionId);
        if (snapshot && snapshot.subagent) return false;
        if (snapshot && snapshot.removed) return false;
        return row !== null;
      }

      function cancelCompletion(sessionId) {
        var timer = state.timers.get(sessionId);
        if (timer !== undefined) {
          clearTimeout(timer);
          state.timers.delete(sessionId);
        }
      }

      function scheduleCompletion(sessionId) {
        cancelCompletion(sessionId);
        diag('edge ' + shortId(sessionId) + ' run T->F armed delay=' + options.completionDelayMs);
        var timer = setTimeout(function () {
          state.timers.delete(sessionId);
          var alert = shouldAlert();
          var wanted = alert && shouldNotifyCompletion(sessionId);
          diag('complete? ' + shortId(sessionId) +
            ' alert=' + fmtTri(alert) +
            ' want=' + fmtTri(wanted) +
            ' main=' + mainRetention(sessionId) +
            ' focus=' + fmtTri(focused()));
          if (!alert) return;
          if (!wanted) return;
          show(
            'dsh-notify:complete:' + sessionId,
            text.completeTitle,
            text.completeBody,
            { requireInteraction: false }
          );
        }, options.completionDelayMs);
        state.timers.set(sessionId, timer);
      }

      function notifyPending(sessionId, interaction) {
        if (!shouldAlert()) return;
        var kind = interaction && interaction.kind ? interaction.kind : 'unknown';
        var key = interaction && interaction.key ? interaction.key : kind;
        var tag = 'dsh-notify:pending:' + sessionId + ':' + key;
        if (state.pendingNotified.has(tag)) return;
        var title = text.pendingTitle;
        var body = text.pendingBody;

        if (kind === 'approval') {
          title = text.approvalTitle;
          var reason = truncate(
            (interaction && (interaction.displayReason || interaction.reason)) || '',
            options.pendingBodyMaxChars
          );
          body = reason || text.approvalBody;
          if (interaction && interaction.toolName) {
            body = interaction.toolName + ' · ' + body;
          }
        } else if (kind === 'question') {
          title = text.questionTitle;
          body = text.questionBody;
        } else if (kind === 'plan-review') {
          title = text.planReviewTitle;
          body = text.planReviewBody;
        }

        closePending('dsh-notify:pending:' + sessionId + ':');
        state.pendingNotified.add(tag);
        show(tag, title, body, { requireInteraction: true });
      }

      function notifyOutstandingPending() {
        var snapshot;
        try {
          snapshot = ctx.uiSession.sessionStatus.getSnapshot();
        } catch (error) {
          return;
        }
        snapshot.forEach(function (status, sessionId) {
          if (status && status.pendingInteraction) {
            notifyPending(sessionId, status.pendingInteraction);
          }
        });
      }

      function evaluate() {
        var snapshot;
        try {
          snapshot = ctx.uiSession.sessionStatus.getSnapshot();
        } catch (error) {
          diag('status read failed: ' + (error && error.message ? error.message : String(error)));
          try { console.warn('[dsh-notify] sessionStatus unavailable:', error); } catch (e) { /* ignore */ }
          return;
        }

        var live = new Set();
        var size = -1;
        try { size = snapshot.size; } catch (e) { /* ignore */ }
        if (size !== state.lastSize) {
          state.lastSize = size;
          diag('map size=' + size + ' seeded=' + fmtTri(state.seeded) + ' perm=' + permission());
        }
        snapshot.forEach(function (status, sessionId) {
          live.add(sessionId);
          var pendingKey = status.pendingInteraction
            ? (status.pendingInteraction.key || status.pendingInteraction.kind || 'pending')
            : null;
          var before = state.previous.get(sessionId);

          var moved = !before || before.running !== status.running || before.pendingKey !== pendingKey;
          if (moved) {
            diag('status ' + shortId(sessionId) +
              ' run=' + fmtTri(status.running) +
              ' prev=' + (before ? fmtTri(before.running) : '-') +
              ' pend=' + (pendingKey || '-') +
              ' seed=' + fmtTri(state.seeded) +
              ' main=' + mainRetention(sessionId));
          }

          if (state.seeded && before) {
            var pendingShown = false;

            if (before.running === true && status.running === false) {
              cancelCompletion(sessionId);
              if (pendingKey) {
                notifyPending(sessionId, status.pendingInteraction);
                pendingShown = true;
              } else {
                scheduleCompletion(sessionId);
              }
            } else if (before.running === false && status.running === true) {
              cancelCompletion(sessionId);
              closePrefix('dsh-notify:complete:' + sessionId);
            }

            if (!before.pendingKey && pendingKey) {
              cancelCompletion(sessionId);
              if (!pendingShown) notifyPending(sessionId, status.pendingInteraction);
            } else if (before.pendingKey && !pendingKey) {
              closePending('dsh-notify:pending:' + sessionId + ':');
            }
          }

          state.previous.set(sessionId, {
            running: status.running,
            pendingKey: pendingKey
          });
        });

        var gone = [];
        state.previous.forEach(function (_value, sessionId) {
          if (!live.has(sessionId)) gone.push(sessionId);
        });
        gone.forEach(function (sessionId) {
          cancelCompletion(sessionId);
          closePrefix('dsh-notify:complete:' + sessionId);
          closePending('dsh-notify:pending:' + sessionId + ':');
          state.previous.delete(sessionId);
        });

        state.seeded = true;
      }

      function sendTestNotification() {
        var l = L();
        var stamp = '';
        try {
          stamp = new Date().toLocaleTimeString();
        } catch (e) { /* ignore */ }
        var focusLabel = focused() ? l.testOn : l.testOff;
        var body = 'v' + CLIENT_VERSION +
          (stamp ? ' · ' + stamp : '') +
          ' · ' + focusLabel +
          ' · ' + (alwaysNotify.getSnapshot() ? 'always' : 'unfocused-only') +
          ' · sound:' + soundPreset.getSnapshot();
        show('dsh-notify:test', text.testTitle, body, { requireInteraction: false });
      }

      // Subscribe first so a turn that finishes while we are still asking for
      // notification permission is still observed.
      try {
        ctx.effect(function () {
          var off = ctx.uiSession.sessionStatus.subscribe(function () {
            try { evaluate(); } catch (error) {
              try { console.warn('[dsh-notify] evaluate failed:', error); } catch (e) { /* ignore */ }
            }
          });
          return function () {
            try { off(); } catch (e) { /* ignore */ }
          };
        }, 'dsh-notify: session status');
      } catch (error) {
        try { console.warn('[dsh-notify] subscribe failed:', error); } catch (e) { /* ignore */ }
      }

      try { evaluate(); } catch (error) {
        try { console.warn('[dsh-notify] initial evaluate failed:', error); } catch (e) { /* ignore */ }
      }

      // A pending approval/question can appear while DSH is focused. If the
      // user then switches away without answering, remind them on blur; when
      // they come back, close the reminder so it does not pile up.
      var onBlur = function () {
        setTimeout(notifyOutstandingPending, 50);
      };
      var onFocus = function () {
        closePending('dsh-notify:pending:');
      };
      var onVisibility = function () {
        if (document.visibilityState === 'hidden') {
          setTimeout(notifyOutstandingPending, 50);
        } else {
          closePending('dsh-notify:pending:');
        }
      };
      ctx.effect(function () {
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return function () {
          window.removeEventListener('blur', onBlur);
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, 'dsh-notify: focus reminders');

      // Warm up the audio context on the first real interaction so a synthetic
      // preset can still play later while the window is in the background.
      ctx.effect(function () {
        var warm = function () {
          var ac = getAudioContext();
          if (ac && ac.state === 'suspended') {
            try { ac.resume(); } catch (e) { /* ignore */ }
          }
        };
        document.addEventListener('pointerdown', warm, { passive: true });
        return function () {
          try { document.removeEventListener('pointerdown', warm); } catch (e) { /* ignore */ }
        };
      }, 'dsh-notify: audio warmup');

      // If the plugin loads while an approval/question is already waiting and
      // DSH is not focused, surface it immediately.
      setTimeout(notifyOutstandingPending, 0);

      // Settings -> Notifications: sound, volume, always-notify switch, test.
      try {
        function SoundRow() {
          var preset = useStringStore(soundPreset);
          var pair = React.useState(soundAsset.record ? (soundAsset.record.name || '') : '');
          var assetName = pair[0];
          var setAssetName = pair[1];
          var l = L();

          function pickFile() {
            try {
              var input = document.createElement('input');
              input.type = 'file';
              input.accept = 'audio/*';
              input.style.display = 'none';
              input.onchange = function () {
                var file = input.files && input.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function () {
                  var record = {
                    name: file.name,
                    type: file.type || '',
                    size: file.size,
                    data: reader.result
                  };
                  soundAsset.record = record;
                  soundAsset.loaded = true;
                  setAssetName(file.name);
                  soundPreset.set('custom');
                  playAudioRecord(record, volumeFactor()).then(function (ok) {
                    if (!ok) {
                      try { console.warn('[dsh-notify] custom sound could not be decoded'); } catch (e) { /* ignore */ }
                    }
                  });
                  saveCustomSoundRecord(record).catch(function () {
                    try { console.warn('[dsh-notify] custom sound works for this session only (storage failed)'); } catch (e) { /* ignore */ }
                  });
                };
                reader.readAsArrayBuffer(file);
              };
              document.body.appendChild(input);
              input.click();
              setTimeout(function () {
                try { input.remove(); } catch (e) { /* ignore */ }
              }, 1000);
            } catch (e) {
              try { console.warn('[dsh-notify] file picker failed:', e); } catch (err) { /* ignore */ }
            }
          }

          var choices = [
            ['system', l.soundSystem],
            ['chime', l.soundChime],
            ['drop', l.soundDrop],
            ['double', l.soundDouble],
            ['custom', l.soundCustom],
            ['none', l.soundNone]
          ];
          var controls = [
            h('select', {
              key: 'select',
              value: preset,
              'aria-label': l.soundTitle,
              onChange: function (event) { soundPreset.set(event.target.value); },
              style: SELECT_STYLE
            }, choices.map(function (choice) {
              return h('option', { key: choice[0], value: choice[0] }, choice[1]);
            })),
            h('button', {
              key: 'preview',
              type: 'button',
              onClick: function () { playSelectedSound(true); },
              style: BUTTON_STYLE
            }, l.soundPreview)
          ];
          if (preset === 'custom') {
            controls.push(h('button', {
              key: 'pick',
              type: 'button',
              onClick: pickFile,
              style: BUTTON_STYLE
            }, assetName ? l.soundChange : l.soundPick));
          }
          return h('div', { style: ROW_STYLE },
            h('div', { style: ROW_TEXT_STYLE },
              h('div', { style: ROW_TITLE_STYLE }, l.soundTitle),
              h('div', { style: ROW_DESC_STYLE }, l.soundDesc),
              preset === 'custom'
                ? h('div', { style: ROW_DESC_STYLE }, assetName || l.soundMissing)
                : null
            ),
            h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: '8px' } }, controls)
          );
        }

        function VolumeRow() {
          var value = useNumberStore(volume);
          var preset = useStringStore(soundPreset);
          var inactive = preset === 'system' || preset === 'none';
          var l = L();
          return h('div', { style: ROW_STYLE },
            h('div', { style: ROW_TEXT_STYLE },
              h('div', { style: ROW_TITLE_STYLE }, l.volumeTitle),
              h('div', { style: ROW_DESC_STYLE }, l.volumeDesc),
              inactive ? h('div', { style: ROW_DESC_STYLE }, l.volumeInactive) : null
            ),
            h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: '10px', opacity: inactive ? 0.5 : 1 } },
              h('input', {
                type: 'range',
                min: 0,
                max: 100,
                step: 5,
                value: value,
                disabled: inactive,
                'aria-label': l.volumeTitle,
                onChange: function (event) { volume.set(clampVolume(event.target.value)); },
                style: {
                  width: '140px',
                  cursor: 'pointer',
                  accentColor: 'var(--dsw-alias-brand-primary)'
                }
              }),
              h('span', {
                style: {
                  minWidth: '34px',
                  textAlign: 'right',
                  fontSize: '12px',
                  lineHeight: '18px',
                  color: 'var(--dsw-alias-label-secondary)'
                }
              }, value + '%')
            )
          );
        }

        function AlwaysNotifyRow() {
          var on = useBoolStore(alwaysNotify);
          var l = L();
          return h('div', { style: ROW_STYLE },
            h('div', { style: ROW_TEXT_STYLE },
              h('div', { style: ROW_TITLE_STYLE }, l.alwaysTitle),
              h('div', { style: ROW_DESC_STYLE }, l.alwaysDesc)
            ),
            h('button', {
              type: 'button',
              role: 'switch',
              'aria-checked': on,
              'aria-label': l.alwaysTitle,
              onClick: function () { alwaysNotify.set(!alwaysNotify.getSnapshot()); },
              style: {
                flex: 'none',
                position: 'relative',
                width: '40px',
                height: '22px',
                padding: '0',
                borderRadius: '11px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 120ms ease',
                background: on ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'
              }
            },
              h('span', {
                style: {
                  position: 'absolute',
                  top: '2px',
                  left: on ? '20px' : '2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--dsw-alias-bg-base)',
                  transition: 'left 120ms ease'
                }
              })
            )
          );
        }

        function TestRow() {
          var pair = React.useState(false);
          var sent = pair[0];
          var setSent = pair[1];
          var l = L();
          return h('div', { style: ROW_STYLE },
            h('div', { style: ROW_TEXT_STYLE },
              h('div', { style: ROW_TITLE_STYLE }, l.testRowTitle),
              h('div', { style: ROW_DESC_STYLE }, l.testRowDesc)
            ),
            h('button', {
              type: 'button',
              onClick: function () {
                sendTestNotification();
                setSent(true);
                setTimeout(function () {
                  try { setSent(false); } catch (e) { /* ignore */ }
                }, 2400);
              },
              style: BUTTON_STYLE
            }, sent ? l.testSent : l.testButton)
          );
        }

        function DiagRow() {
          var l = L();
          var pair = React.useState(diagSnapshot());
          var value = pair[0];
          var setValue = pair[1];
          React.useEffect(function () {
            setValue(diagSnapshot());
            return diagSubscribe(function () {
              setValue(diagSnapshot());
            });
          }, []);
          return h('div', {
            style: {
              padding: '16px 0',
              borderBottom: '1px solid var(--dsw-alias-border-l1)',
              color: 'var(--dsw-alias-label-primary)'
            }
          },
            h('div', { style: ROW_TITLE_STYLE }, l.diagTitle + '  ·  v' + CLIENT_VERSION + '  ·  ' + diagLines.length + ' 行 / ' + diagText.length + ' 字符'),
            h('div', { style: ROW_DESC_STYLE }, l.diagDesc),
            h('div', {
              style: {
                marginTop: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--dsw-alias-bg-layer-1)',
                color: 'var(--dsw-alias-label-secondary)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '11px',
                lineHeight: '16px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '160px',
                overflowY: 'auto'
              }
            }, value || l.diagEmpty)
          );
        }

        function NotifySection(props) {
          return h('div', {
            style: { display: 'flex', flexDirection: 'column', width: '100%' }
          }, props.renderSlot('dsh-notify.item', {}));
        }

        function NotifyIcon(props) {
          var size = props && props.size ? props.size : 16;
          return h('svg', {
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.8,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true'
          },
            h('path', { key: 'bell', d: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9' }),
            h('path', { key: 'clap', d: 'M13.7 21a2 2 0 0 1-3.4 0' })
          );
        }

        // A settings section of our own, so the notification options are one
        // click from the settings nav instead of buried in General.
        ctx.slots.inject('settings.section', function () {
          return ctx.slots.register({
            name: 'settings.section',
            id: 'notify',
            order: 10,
            label: function () { return L().navTitle; },
            children: {
              'dsh-notify.item': { kind: 'list', scope: 'root' }
            }
          }, NotifySection);
        });
        ctx.slots.inject('settings.section.icon', function () {
          return ctx.slots.register({
            name: 'settings.section.icon',
            id: 'notify'
          }, NotifyIcon);
        });

        var registerItem = function (id, order, Component) {
          ctx.slots.inject('dsh-notify.item', function () {
            return ctx.slots.register({
              name: 'dsh-notify.item',
              id: id,
              order: order
            }, Component);
          });
        };
        registerItem('notify-sound', 0, SoundRow);
        registerItem('notify-volume', 1, VolumeRow);
        registerItem('notify-always', 2, AlwaysNotifyRow);
        registerItem('notify-test', 3, TestRow);
        registerItem('notify-diag', 4, DiagRow);
      } catch (error) {
        try { console.warn('[dsh-notify] settings rows unavailable:', error); } catch (e) { /* ignore */ }
      }

      // Request permission without a gesture (Electron grants it) and show a
      // one-time welcome toast so the user can confirm delivery immediately.
      requestPermission().then(function (result) {
        if (result !== 'granted') {
          try { console.warn('[dsh-notify] notification permission:', result); } catch (e) { /* ignore */ }
          return;
        }
        if (!options.welcome) return;
        var welcomed = false;
        try { welcomed = sessionStorage.getItem('dsh-notify:welcome') === '1'; } catch (e) { /* ignore */ }
        if (welcomed) return;
        setTimeout(function () {
          var notice = show(
            'dsh-notify:welcome',
            text.welcomeTitle,
            text.welcomeBody,
            { requireInteraction: false }
          );
          if (notice) {
            try { sessionStorage.setItem('dsh-notify:welcome', '1'); } catch (e) { /* ignore */ }
          }
        }, 1200);
      });

      // If Chromium left permission at "default", retry on the first real
      // gesture. This covers web builds where requestPermission needs one.
      var askOnGesture = function () {
        if (hasNotificationApi() && Notification.permission === 'default') {
          requestPermission();
        }
        window.removeEventListener('pointerdown', askOnGesture, true);
        window.removeEventListener('keydown', askOnGesture, true);
      };
      ctx.effect(function () {
        window.addEventListener('pointerdown', askOnGesture, true);
        window.addEventListener('keydown', askOnGesture, true);
        return function () {
          window.removeEventListener('pointerdown', askOnGesture, true);
          window.removeEventListener('keydown', askOnGesture, true);
        };
      }, 'dsh-notify: permission gesture');

      try {
        console.info('[dsh-notify] client v' + CLIENT_VERSION + ' loaded');
      } catch (e) { /* ignore */ }
    }

    return {
      name: 'dsh-notify',
      inject: ['sessions', 'uiSession', 'locale', 'slots'],
      apply: apply
    };
  }
});
