/*
 * Timeline shell for the Claude Haiku 5.5 motion graphic.
 *
 * Reads window.HAIKU_SCENES (filled in by the scene files), creates one
 * <section class="scene" data-scene="ID"> per scene inside #stage, plays them
 * in order, loops, and wires up the controls. Classic script, no modules and
 * no fetch, so it runs from file://.
 */
(function () {
  'use strict';

  var DEFAULT_DURATION = 6000; // ms, used when a scene gives no usable duration
  var IDLE_MS = 2000;          // controls fade after this long without pointer activity
  var MAX_STEP_MS = 250;       // cap on time added per frame (background tabs, hitches)
  var LEAVE_MS = 600;          // outgoing scene's fade-out; keep equal to the .scene transition in base.css

  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';

  var stage, controls, emptyMsg, playBtn, restartBtn, progressFill, dotsEl;
  var scenes = [];      // sorted: { id, entry, order, duration, start, section, dot }
  var total = 0;        // loop length in ms
  var index = 0;        // current scene
  var elapsed = 0;      // ms into the current scene; grows only while playing
  var playing = true;
  var rafId = 0;
  var lastNow = 0;
  var idleTimer = 0;
  var resumeOnShow = false;

  function init() {
    stage = document.getElementById('stage');
    if (!stage) {
      console.error('[haiku] #stage not found');
      return;
    }
    controls = document.getElementById('controls');
    emptyMsg = document.getElementById('empty');
    playBtn = document.getElementById('btn-play');
    restartBtn = document.getElementById('btn-restart');
    progressFill = document.getElementById('progress-fill');
    dotsEl = document.getElementById('dots');

    var registry = Array.isArray(window.HAIKU_SCENES) ? window.HAIKU_SCENES : [];
    scenes = normalize(registry);

    if (!scenes.length) {
      emptyMsg.hidden = false;
      controls.hidden = true;
      return;
    }

    var t = 0;
    scenes.forEach(function (sc) {
      sc.start = t;
      t += sc.duration;
    });
    total = t;

    // One section per scene, in order, rendered once.
    scenes.forEach(function (sc) {
      var section = document.createElement('section');
      section.className = 'scene';
      section.setAttribute('data-scene', sc.id);
      stage.insertBefore(section, controls);
      sc.section = section;
      try {
        sc.entry.render(section);
      } catch (err) {
        console.error('[haiku] render() failed for scene "' + sc.id + '":', err);
      }
    });

    // One dot per scene.
    scenes.forEach(function (sc, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'dot';
      dot.title = 'Scene ' + (i + 1);
      dot.setAttribute('aria-label', 'Show scene ' + (i + 1) + ' of ' + scenes.length);
      dot.addEventListener('click', function () { jump(i); });
      dotsEl.appendChild(dot);
      sc.dot = dot;
    });

    playBtn.addEventListener('click', togglePlay);
    restartBtn.addEventListener('click', restart);
    document.addEventListener('keydown', onKey);
    stage.addEventListener('pointermove', wake);
    stage.addEventListener('pointerdown', wake);
    document.addEventListener('visibilitychange', onVisibility);

    var opts = parseHash(window.location.hash);
    var first = findScene(opts.scene);
    index = first >= 0 ? first : 0;
    elapsed = 0;
    show(index);
    updateProgress();
    setPlaying(!opts.isStatic);
    wake();
  }

  // Copy the registry, coerce order and duration, and sort by order (ties keep registration order).
  function normalize(registry) {
    var list = [];
    registry.forEach(function (entry, seq) {
      if (!entry || typeof entry !== 'object') {
        console.error('[haiku] ignored a scene entry that is not an object');
        return;
      }
      var order = Number(entry.order);
      var duration = Number(entry.duration);
      list.push({
        id: (entry.id === undefined || entry.id === null) ? 'scene' + (seq + 1) : String(entry.id),
        entry: entry,
        order: isFinite(order) ? order : Infinity,
        duration: duration > 0 ? duration : DEFAULT_DURATION,
        seq: seq,
        leaveTimer: 0
      });
    });
    list.sort(function (a, b) {
      if (a.order !== b.order) return a.order < b.order ? -1 : 1;
      return a.seq - b.seq;
    });
    return list;
  }

  // "#scene=s3" starts at that scene; "#static" starts paused. Both can be combined with "&".
  function parseHash(hash) {
    var out = { scene: '', isStatic: false };
    String(hash || '').replace(/^#/, '').split('&').forEach(function (part) {
      if (part === 'static') out.isStatic = true;
      else if (part.indexOf('scene=') === 0) out.scene = part.slice(6);
    });
    return out;
  }

  function findScene(id) {
    if (!id) return -1;
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].id === id) return i;
    }
    console.warn('[haiku] no scene "' + id + '" (from URL hash); starting at the first scene');
    return -1;
  }

  // Activate scene i. Outgoing scenes keep .active and gain .leaving: they fade
  // out for LEAVE_MS with their animations held (base.css), then startLeave's
  // timer removes both classes. The incoming scene is reset first (drop .leaving
  // and .active, flush style, re-add .active), so its CSS animations start over
  // even if it was still fading out.
  function show(i) {
    var k;
    var sc = scenes[i];
    index = i;
    for (k = 0; k < scenes.length; k++) {
      if (k !== i) startLeave(scenes[k]);
    }
    cancelLeave(sc);
    sc.section.classList.remove('leaving');
    sc.section.classList.remove('active');
    void sc.section.offsetWidth;
    sc.section.classList.add('active');
    for (k = 0; k < scenes.length; k++) {
      if (k === i) scenes[k].dot.setAttribute('aria-current', 'step');
      else scenes[k].dot.removeAttribute('aria-current');
    }
    if (typeof sc.entry.enter === 'function') {
      try {
        sc.entry.enter(sc.section);
      } catch (err) {
        console.error('[haiku] enter() failed for scene "' + sc.id + '":', err);
      }
    }
  }

  // Outgoing scene: keep .active, add .leaving, and drop both after LEAVE_MS.
  // Not tied to pause: a leave that ends while paused still lands in the right state.
  // A scene that is already leaving keeps its existing timer.
  function startLeave(sc) {
    var el = sc.section;
    if (!el.classList.contains('active') || el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    sc.leaveTimer = setTimeout(function () {
      sc.leaveTimer = 0;
      el.classList.remove('leaving');
      el.classList.remove('active');
    }, LEAVE_MS);
  }

  // Called when a scene becomes current again, so its pending cleanup cannot strip .active later.
  function cancelLeave(sc) {
    if (sc.leaveTimer) {
      clearTimeout(sc.leaveTimer);
      sc.leaveTimer = 0;
    }
  }

  // Jump to scene i (wraps). Keeps the current play/pause state.
  function jump(i) {
    if (!scenes.length) return;
    var n = scenes.length;
    elapsed = 0;
    show(((i % n) + n) % n);
    updateProgress();
  }

  function step(delta) {
    jump(index + delta);
  }

  function restart() {
    if (!scenes.length) return;
    jump(0);
    setPlaying(true);
  }

  function togglePlay() {
    if (scenes.length) setPlaying(!playing);
  }

  function setPlaying(on) {
    playing = !!on;
    stage.classList.toggle('paused', !playing); // also freezes CSS animations (base.css)
    if (playing) {
      if (!rafId) {
        lastNow = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    updateControls();
  }

  function tick() {
    rafId = 0;
    if (!playing) return;
    var now = performance.now();
    var dt = now - lastNow;
    lastNow = now;
    if (dt < 0) dt = 0;
    if (dt > MAX_STEP_MS) dt = MAX_STEP_MS;
    elapsed += dt;
    var dur = scenes[index].duration;
    if (elapsed >= dur) {
      elapsed -= dur; // carry the overshoot so the loop length stays exact
      show((index + 1) % scenes.length);
    }
    updateProgress();
    rafId = requestAnimationFrame(tick);
  }

  function updateProgress() {
    if (!progressFill || !scenes.length || total <= 0) return;
    var f = (scenes[index].start + elapsed) / total;
    f = Math.max(0, Math.min(1, f));
    progressFill.style.width = (f * 100).toFixed(2) + '%';
  }

  function updateControls() {
    if (!playBtn) return;
    var label = playing ? 'Pause' : 'Play';
    playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute('aria-label', label);
    playBtn.title = label + ' (Space)';
  }

  // Show the controls and restart the idle countdown.
  function wake() {
    if (stage.classList.contains('idle')) stage.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { stage.classList.add('idle'); }, IDLE_MS);
  }

  function onKey(e) {
    if (!scenes.length || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    wake();
    switch (e.key) {
      case ' ':
      case 'Spacebar':
        e.preventDefault(); // also stops a focused button from firing its own click
        if (!e.repeat) togglePlay();
        break;
      case 'r':
      case 'R':
        if (!e.repeat) restart();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        step(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        step(1);
        break;
    }
  }

  // Pause while the tab is hidden (CSS animations keep running on the wall clock
  // and would drift from the timer), and resume on return if it was playing.
  function onVisibility() {
    if (!scenes.length) return;
    if (document.hidden) {
      if (playing) {
        resumeOnShow = true;
        setPlaying(false);
      }
    } else if (resumeOnShow) {
      resumeOnShow = false;
      setPlaying(true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
