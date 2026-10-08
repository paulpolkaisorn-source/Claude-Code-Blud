// Scenes s1-s3 for the Claude Haiku 5.5 motion graphic. Classic script: no modules, no fetch.
// Markup only. All motion is CSS keyed off `.scene[data-scene="sN"].active` (see scenes-a.css).
window.HAIKU_SCENES = window.HAIKU_SCENES || [];

window.HAIKU_SCENES.push({
  id: 's1',
  order: 1,
  duration: 6000,
  render(root) {
    root.innerHTML = `
<div class="s1-root">
  <div class="s1-grain"></div>
  <span class="s1-petal s1-petal-1"></span>
  <span class="s1-petal s1-petal-2"></span>
  <span class="s1-petal s1-petal-3"></span>
  <span class="s1-petal s1-petal-4"></span>
  <span class="s1-petal s1-petal-5"></span>
  <div class="s1-caption">A HAIKU FOR HAIKU</div>
  <div class="s1-rule"></div>
  <p class="s1-poem">
    <span class="s1-line" style="--lb:550ms"><span class="s1-w" style="--wi:0">Small</span> <span class="s1-w" style="--wi:1">model,</span> <span class="s1-w" style="--wi:2">quick</span> <span class="s1-w" style="--wi:3">mind</span></span>
    <span class="s1-line" style="--lb:1650ms"><span class="s1-w" style="--wi:0">answers</span> <span class="s1-w" style="--wi:1">bloom</span> <span class="s1-w" style="--wi:2">before</span> <span class="s1-w" style="--wi:3">you</span> <span class="s1-w" style="--wi:4">blink</span></span>
    <span class="s1-line" style="--lb:2750ms"><span class="s1-w" style="--wi:0">five</span> <span class="s1-w" style="--wi:1">point</span> <span class="s1-w" style="--wi:2">five</span> <span class="s1-w" style="--wi:3">is</span> <span class="s1-w" style="--wi:4">here</span></span>
  </p>
  <span class="s1-seal"></span>
</div>`;
  }
});

window.HAIKU_SCENES.push({
  id: 's2',
  order: 2,
  duration: 6000,
  render(root) {
    root.innerHTML = `
<div class="s2-root">
  <div class="s2-grain"></div>
  <h1 class="s2-title"><span class="s2-tw"><span class="s2-tin" style="--wi:0">Claude</span></span> <span class="s2-tw"><span class="s2-tin" style="--wi:1">Haiku</span></span> <span class="s2-tw"><span class="s2-tin s2-ver" style="--wi:2">5.5</span></span></h1>
  <div class="s2-kicker">THE CLAUDE 5 FAMILY</div>
  <div class="s2-row">
    <div class="s2-slot" style="--i:0"><div class="s2-card s2-dim"><span class="s2-dot"></span><span class="s2-name">Fable 5.1</span></div></div>
    <div class="s2-slot" style="--i:1"><div class="s2-card s2-dim"><span class="s2-dot"></span><span class="s2-name">Opus 5.5</span></div></div>
    <div class="s2-slot" style="--i:2"><div class="s2-card s2-dim"><span class="s2-dot"></span><span class="s2-name">Sonnet 5.5</span></div></div>
    <div class="s2-slot" style="--i:3"><div class="s2-card s2-hl"><span class="s2-dot"></span><span class="s2-name">Haiku 5.5</span></div><span class="s2-note">the small, fast one</span></div>
  </div>
</div>`;
  }
});

window.HAIKU_SCENES.push({
  id: 's3',
  order: 3,
  duration: 6000,
  render(root) {
    root.innerHTML = `
<div class="s3-root">
  <div class="s3-grain"></div>
  <h1 class="s3-head"><span class="s3-hw"><span class="s3-hin" style="--wi:0">Built</span></span> <span class="s3-hw"><span class="s3-hin" style="--wi:1">for</span></span> <span class="s3-hw"><span class="s3-hin s3-em" style="--wi:2">speed.</span></span></h1>
  <span class="s3-streak s3-k1" style="--s:-14cqw;--e:31cqw;--d:0ms"></span>
  <span class="s3-streak s3-k2" style="--s:-18cqw;--e:31cqw;--d:70ms"></span>
  <span class="s3-streak s3-k3" style="--s:-10cqw;--e:31cqw;--d:130ms"></span>
  <span class="s3-streak s3-k4" style="--s:-16cqw;--e:31cqw;--d:200ms"></span>
  <span class="s3-streak s3-k5" style="--s:-12cqw;--e:31cqw;--d:260ms"></span>
  <span class="s3-streak s3-k6" style="--s:-20cqw;--e:31cqw;--d:330ms"></span>
  <div class="s3-card">
    <div class="s3-label"><span class="s3-live"></span>OUTPUT</div>
    <div class="s3-typed"><span class="s3-prompt">&gt;</span><span class="s3-type">response</span><span class="s3-cursor"></span></div>
    <div class="s3-bars"><span class="s3-bar s3-bar-1"></span><span class="s3-bar s3-bar-2"></span><span class="s3-bar s3-bar-3"></span></div>
  </div>
  <p class="s3-say"><span class="s3-ph s3-ph-1">Quick answers.</span> <span class="s3-ph s3-ph-2">Light footprint.</span> <span class="s3-ph s3-ph-3">Ready to scale.</span></p>
</div>`;
  }
});
