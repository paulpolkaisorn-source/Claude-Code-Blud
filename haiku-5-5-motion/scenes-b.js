// Scenes s4 and s5 for the Claude Haiku 5.5 motion graphic. Classic script: no modules, no fetch.
// Markup only. All motion is CSS keyed off `.scene[data-scene="sN"].active` (see scenes-b.css).
window.HAIKU_SCENES = window.HAIKU_SCENES || [];

window.HAIKU_SCENES.push({
  id: 's4',
  order: 4,
  duration: 7000,
  render(root) {
    root.innerHTML = `
<div class="s4-b1">
  <h2 class="s4-h1">Dial in the <em>effort.</em></h2>
  <div class="s4-dial">
    <span class="s4-cap">effort</span>
    <div class="s4-track">
      <span class="s4-fill"></span>
      <span class="s4-stop" style="left:0%"></span>
      <span class="s4-stop" style="left:33.333%"></span>
      <span class="s4-stop" style="left:66.667%"></span>
      <span class="s4-stop" style="left:100%"></span>
    </div>
    <span class="s4-lab" style="left:0%">low</span>
    <span class="s4-lab" style="left:33.333%">medium</span>
    <span class="s4-lab" style="left:66.667%">high</span>
    <span class="s4-lab s4-lab-max" style="left:100%">max</span>
    <div class="s4-carriage">
      <span class="s4-pulse"></span>
      <span class="s4-knob"></span>
    </div>
  </div>
</div>
<div class="s4-b2">
  <h2 class="s4-h2">One orchestrator. <em>Many fast hands.</em></h2>
  <svg class="s4-svg" viewBox="0 0 1600 900" aria-hidden="true" focusable="false">
    <path class="s4-ln" pathLength="1" style="--i:0" d="M800 405 L240 702"></path>
    <path class="s4-ln" pathLength="1" style="--i:1" d="M800 405 L520 702"></path>
    <path class="s4-ln" pathLength="1" style="--i:2" d="M800 405 L800 702"></path>
    <path class="s4-ln" pathLength="1" style="--i:3" d="M800 405 L1080 702"></path>
    <path class="s4-ln" pathLength="1" style="--i:4" d="M800 405 L1360 702"></path>
    <circle class="s4-dd" cx="800" cy="405" r="7" style="--i:0;--dx:-560px;--dy:297px"></circle>
    <circle class="s4-dd" cx="800" cy="405" r="7" style="--i:1;--dx:-280px;--dy:297px"></circle>
    <circle class="s4-dd" cx="800" cy="405" r="7" style="--i:2;--dx:0px;--dy:297px"></circle>
    <circle class="s4-dd" cx="800" cy="405" r="7" style="--i:3;--dx:280px;--dy:297px"></circle>
    <circle class="s4-dd" cx="800" cy="405" r="7" style="--i:4;--dx:560px;--dy:297px"></circle>
    <circle class="s4-du" cx="520" cy="702" r="6" style="--j:0;--dx:280px;--dy:-297px"></circle>
    <circle class="s4-du" cx="1080" cy="702" r="6" style="--j:1;--dx:-280px;--dy:-297px"></circle>
    <circle class="s4-du" cx="800" cy="702" r="6" style="--j:2;--dx:0px;--dy:-297px"></circle>
  </svg>
  <span class="s4-ring" aria-hidden="true"></span>
  <div class="s4-orch">orchestrator</div>
  <div class="s4-hk" style="left:15cqw;--i:0">haiku</div>
  <div class="s4-hk" style="left:32.5cqw;--i:1">haiku</div>
  <div class="s4-hk" style="left:50cqw;--i:2">haiku</div>
  <div class="s4-hk" style="left:67.5cqw;--i:3">haiku</div>
  <div class="s4-hk" style="left:85cqw;--i:4">haiku</div>
</div>`;
  }
});

window.HAIKU_SCENES.push({
  id: 's5',
  order: 5,
  duration: 6000,
  render(root) {
    root.innerHTML = `
<div class="s5-wrap">
  <h2 class="s5-title">Claude Haiku <span class="s5-ver">5.5</span></h2>
  <div class="s5-chip">
    <div class="s5-typed"><span class="s5-key">model:</span> <span class="s5-val">"claude-haiku-5-5"</span></div>
    <span class="s5-caret" aria-hidden="true"></span>
  </div>
  <p class="s5-tag">Small. Fast. Ready.</p>
  <span class="s5-rule" aria-hidden="true"></span>
  <div class="s5-dots" aria-hidden="true">
    <span class="s5-dot" style="--i:0"></span>
    <span class="s5-dot s5-dot-b" style="--i:1"></span>
    <span class="s5-dot s5-dot-c" style="--i:2"></span>
  </div>
</div>`;
  }
});
