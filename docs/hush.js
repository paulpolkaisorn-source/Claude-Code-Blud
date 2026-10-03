(()=>{var Dx=Object.defineProperty;var Le=(s,t,e)=>()=>{if(e)throw e[0];try{return s&&(t=s(s=0)),t}catch(n){throw e=[n],n}};var vs=(s,t)=>{for(var e in t)Dx(s,e,{get:t[e],enumerable:!0})};function Oc(s){let t=s>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function qp(s,t=60){let e=Math.floor(s/5),n=(s%5+5)%5;return t+e*12+Nx[n]}function Vn(s){let t=0,e=!0,n=0,i=0,r=o=>{if(!e)return;t=requestAnimationFrame(r),n||(n=o);let a=(o-n)/1e3;n=o,a>.1&&(a=.1),i+=a,s(a,i)};return t=requestAnimationFrame(r),{stop(){e=!1,cancelAnimationFrame(t)}}}function Md(s,t){let e=new ResizeObserver(()=>t(s.clientWidth,s.clientHeight));return e.observe(s),t(s.clientWidth,s.clientHeight),()=>e.disconnect()}function Gn(s,t){let e=new Map,n=d=>{let u=s.getBoundingClientRect();return{x:d.clientX-u.left,y:d.clientY-u.top}},i=(d,u)=>{let{x:f,y:p}=n(d);return{id:d.pointerId,x:f,y:p,px:f,py:p,vx:0,vy:0,speed:0,t:d.timeStamp,down:u,type:d.pointerType,sx:f,sy:p}},r=(d,u)=>{let{x:f,y:p}=n(u),x=Math.max(1,u.timeStamp-d.t)/1e3;d.px=d.x,d.py=d.y,d.x=f,d.y=p,d.vx=He(d.vx,(f-d.px)/x,.4),d.vy=He(d.vy,(p-d.py)/x,.4),d.speed=Math.hypot(d.vx,d.vy),d.t=u.timeStamp},o=d=>{if(d.pointerType==="mouse"&&d.button!==0)return;try{s.setPointerCapture(d.pointerId)}catch{}let u=i(d,!0);e.set(d.pointerId,u),t.down?.(u,d)},a=d=>{let u=e.get(d.pointerId);if(!u){if(d.pointerType!=="mouse"||!t.hover)return;u=e.get("hover")||i(d,!1),u.id="hover",e.set("hover",u)}let f=d.getCoalescedEvents?d.getCoalescedEvents():[],p=f.length?f:[d];for(let x of p)r(u,x),t.move?.(u,x)},l=d=>{let u=e.get(d.pointerId);u&&(r(u,d),u.down=!1,e.delete(d.pointerId),t.up?.(u,d))},c=d=>{d.pointerType==="mouse"&&e.has("hover")&&(e.delete("hover"),t.leave?.())},h=d=>d.preventDefault();return s.addEventListener("pointerdown",o),s.addEventListener("pointermove",a),s.addEventListener("pointerup",l),s.addEventListener("pointercancel",l),s.addEventListener("pointerleave",c),s.addEventListener("contextmenu",h),{pointers:e,dispose(){s.removeEventListener("pointerdown",o),s.removeEventListener("pointermove",a),s.removeEventListener("pointerup",l),s.removeEventListener("pointercancel",l),s.removeEventListener("pointerleave",c),s.removeEventListener("contextmenu",h)}}}function gr(s,{maxPixels:t=3e6,onResize:e}={}){let n=document.createElement("canvas");n.className="game-canvas",s.appendChild(n);let i=n.getContext("2d"),r={canvas:n,ctx:i,w:0,h:0,dpr:1},o=!0,a=Md(s,(l,c)=>{if(!l||!c)return;let h=Math.min(window.devicePixelRatio||1,2.5);l*c*h*h>t&&(h=Math.sqrt(t/(l*c))),r.w=l,r.h=c,r.dpr=h,n.width=Math.round(l*h),n.height=Math.round(c*h),n.style.width=l+"px",n.style.height=c+"px",i.setTransform(h,0,0,h,0,0),o||e?.(l,c,h)});return o=!1,r.dispose=()=>{a(),n.remove()},r}function Bc(){try{let s="__hush_test__";return localStorage.setItem(s,"1"),localStorage.removeItem(s),localStorage}catch{let t=new Map;return{getItem:e=>t.has(e)?t.get(e):null,setItem:(e,n)=>t.set(e,String(n)),removeItem:e=>t.delete(e)}}}function Yp(){let s=navigator.hardwareConcurrency||4,t=navigator.deviceMemory||4,e=Math.min(screen.width,screen.height)<520;return s>=6&&t>=4&&!e?"high":"low"}var Ht,He,H,pr,$i,mr,Nx,hi=Le(()=>{Ht=(s,t,e)=>Math.min(e,Math.max(t,s)),He=(s,t,e)=>s+(t-s)*e,H=(s=1,t)=>t===void 0?Math.random()*s:s+Math.random()*(t-s),pr=s=>s[Math.floor(Math.random()*s.length)],$i=(s,t,e)=>{let n=Ht((e-s)/(t-s),0,1);return n*n*(3-2*n)};mr=s=>440*Math.pow(2,(s-69)/12),Nx=[0,2,4,7,9]});var Sd,zc,bd,Tn,ys=Le(()=>{hi();Sd=window.AudioContext||window.webkitAudioContext,zc=class{constructor(t){this.settings=t,this.ctx=null,this.noise={},this.activeVoices=0}get ready(){return!!this.ctx}get supported(){return!!Sd}async unlock(){if(!Sd)return!1;if(this.ctx||this._build(),this.ctx.state!=="running")try{await this.ctx.resume()}catch{}return this.ctx.state==="running"}suspend(){this.ctx&&this.ctx.state==="running"&&this.ctx.suspend().catch(()=>{})}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume().catch(()=>{})}_build(){let t=this.ctx=new Sd({latencyHint:"interactive"});this.master=t.createGain(),this.master.gain.value=0;let e=t.createDynamicsCompressor();e.threshold.value=-16,e.knee.value=22,e.ratio.value=3.5,e.attack.value=.004,e.release.value=.25;let n=t.createDynamicsCompressor();n.threshold.value=-2,n.knee.value=0,n.ratio.value=20,n.attack.value=.001,n.release.value=.08,this.analyser=t.createAnalyser(),this.analyser.fftSize=1024,this.master.connect(e),e.connect(n),n.connect(t.destination),n.connect(this.analyser),this._buildNoise(),this._buildReverb(),this.applyVolume(!0)}applyVolume(t=!1){if(!this.ctx)return;let e=this.settings,n=e.muted?0:Math.pow(Ht(e.volume,0,1),1.8)*.9,i=this.ctx.currentTime;this.master.gain.cancelScheduledValues(i),t?this.master.gain.setValueAtTime(n,i):this.master.gain.setTargetAtTime(n,i,.05)}meter(){if(!this.analyser)return 0;let t=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(t);let e=0;for(let n=0;n<t.length;n++)e=Math.max(e,Math.abs(t[n]));return e}_buildNoise(){let t=this.ctx,e=Math.floor(t.sampleRate*6),n=r=>{let o=t.createBuffer(1,e,t.sampleRate);return r(o.getChannelData(0)),o};this.noise.white=n(r=>{for(let o=0;o<r.length;o++)r[o]=Math.random()*2-1}),this.noise.pink=n(r=>{let o=0,a=0,l=0,c=0,h=0,d=0,u=0;for(let f=0;f<r.length;f++){let p=Math.random()*2-1;o=.99886*o+p*.0555179,a=.99332*a+p*.0750759,l=.969*l+p*.153852,c=.8665*c+p*.3104856,h=.55*h+p*.5329522,d=-.7616*d-p*.016898,r[f]=(o+a+l+c+h+d+u+p*.5362)*.11,u=p*.115926}}),this.noise.brown=n(r=>{let o=0;for(let a=0;a<r.length;a++){let l=Math.random()*2-1;o=(o+.02*l)/1.02,r[a]=o*3.5}});let i=Math.floor(t.sampleRate*.05);for(let r of Object.keys(this.noise)){let o=this.noise[r].getChannelData(0);for(let a=0;a<i;a++){let l=a/i;o[a]=o[a]*l+o[o.length-i+a]*(1-l)}}}_buildReverb(){let t=this.ctx,e=t.sampleRate,i=Math.floor(e*3.4),r=t.createBuffer(2,i,e),o=Math.floor(e*.018);for(let d=0;d<2;d++){let u=r.getChannelData(d),f=0;for(let p=o;p<i;p++){let x=(p-o)/e,g=Math.exp(-x*2.15),m=.12+.86*Math.min(1,x/2.2);f+=(Math.random()*2-1-f)*(1-m);let M=p-o<e*.08&&Math.random()<.012?(Math.random()*2-1)*1.6:0;u[p]=(f*1.7+M)*g}}this.reverbIn=t.createGain();let a=t.createBiquadFilter();a.type="highpass",a.frequency.value=180;let l=t.createBiquadFilter();l.type="lowpass",l.frequency.value=8e3;let c=t.createConvolver();c.buffer=r;let h=t.createGain();h.gain.value=.55,this.reverbIn.connect(a),a.connect(l),l.connect(c),c.connect(h),h.connect(this.master)}createBus({gain:t=1}={}){let e=this.ctx,n=e.createGain(),i=e.createGain();n.gain.value=0,i.gain.value=0,n.gain.setTargetAtTime(t,e.currentTime,.08),i.gain.setTargetAtTime(t,e.currentTime,.08),n.connect(this.master),i.connect(this.reverbIn);let r=e.createGain();r.connect(n);let o=e.createGain();o.connect(i);let a=(l,c=.2)=>{n.gain.setTargetAtTime(l,e.currentTime,c),i.gain.setTargetAtTime(l,e.currentTime,c)};return{dry:r,send:o,fade:a,dispose:(l=.12)=>{a(0,l),setTimeout(()=>{try{n.disconnect(),i.disconnect()}catch{}},l*6e3+300)}}}route(t,{pan:e=0,send:n=.2,gain:i=1}={}){let r=this.ctx,o=r.createGain();o.gain.value=i;let a=o;if(r.createStereoPanner){let l=r.createStereoPanner();l.pan.value=Ht(e,-1,1),o.connect(l),o.panner=l,a=l}if(a.connect(t.dry),n>0){let l=r.createGain();l.gain.value=n,a.connect(l),l.connect(t.send)}return o}tone(t,e){let n=this.ctx;if(!n)return;let{freq:i=440,freqEnd:r,dur:o=.3,type:a="sine",gain:l=.3,attack:c=.003,pan:h=0,send:d=.2,delay:u=0,sweepTime:f,detune:p=0}=e,x=n.currentTime+u,g=n.createOscillator();g.type=a,g.frequency.setValueAtTime(i,x),r&&g.frequency.exponentialRampToValueAtTime(Math.max(1,r),x+(f||o)),p&&(g.detune.value=p);let m=n.createGain();m.gain.setValueAtTime(1e-4,x),m.gain.linearRampToValueAtTime(l,x+c),m.gain.exponentialRampToValueAtTime(1e-4,x+c+o),g.connect(m),m.connect(this.route(t,{pan:h,send:d})),g.start(x),g.stop(x+c+o+.05)}burst(t,e){let n=this.ctx;if(!n)return;let{kind:i="white",dur:r=.05,attack:o=.001,gain:a=.4,pan:l=0,send:c=.15,delay:h=0,type:d="bandpass",freq:u=2e3,freqEnd:f,q:p=1,curve:x="exp"}=e,g=n.currentTime+h,m=n.createBufferSource();m.buffer=this.noise[i];let M=n.createBiquadFilter();M.type=d,M.frequency.setValueAtTime(u,g),f&&M.frequency.exponentialRampToValueAtTime(Math.max(20,f),g+r),M.Q.value=p;let w=n.createGain();w.gain.setValueAtTime(1e-4,g),w.gain.linearRampToValueAtTime(a,g+o),x==="exp"?w.gain.exponentialRampToValueAtTime(1e-4,g+o+r):w.gain.linearRampToValueAtTime(0,g+o+r),m.connect(M),M.connect(w),w.connect(this.route(t,{pan:l,send:c})),m.start(g,Math.random()*(this.noise[i].duration-1)),m.stop(g+o+r+.05)}bell(t,e){let n=this.ctx;if(!n)return;let{freq:i=440,gain:r=.25,pan:o=0,send:a=.45,decay:l=4,vel:c=.7,delay:h=0,partials:d=[[1,1,1],[2.76,.32,.55],[5.4,.14,.3],[8.93,.06,.16]]}=e,u=n.currentTime+h,f=this.route(t,{pan:o,send:a});d.forEach(([p,x,g],m)=>{let M=i*p;if(M>14e3)return;let w=m===0?[0,1.1]:[0];for(let y of w){let S=n.createOscillator();S.type="sine",S.frequency.value=M+y*(i/440);let b=n.createGain(),R=r*x*(m===0?1:.35+c*.9)*(m===0&&y?.5:1),v=l*g;b.gain.setValueAtTime(1e-4,u),b.gain.linearRampToValueAtTime(R*c,u+.002),b.gain.exponentialRampToValueAtTime(1e-4,u+v),S.connect(b),b.connect(f),S.start(u),S.stop(u+v+.05)}}),this.burst(t,{kind:"white",dur:.012,gain:.09*c,type:"highpass",freq:5e3,pan:o,send:.1,delay:h})}bubble(t,{freq:e=600,gain:n=.25,pan:i=0,send:r=.4,delay:o=0,dur:a=.22,rise:l=1.7}={}){this.tone(t,{freq:e*.7,freqEnd:e*l,sweepTime:.035,dur:a,gain:n,pan:i,send:r,delay:o,attack:.004}),this.tone(t,{freq:e*1.4,freqEnd:e*l*1.4,sweepTime:.035,dur:a*.5,gain:n*.25,pan:i,send:r,delay:o,attack:.004})}loop(t,e){return new bd(this,t,e)}haptic(t=8){if(this.settings.haptics&&navigator.vibrate)try{navigator.vibrate(t)}catch{}}},bd=class{constructor(t,e,{kind:n="pink",filter:i="bandpass",freq:r=1e3,q:o=1,gain:a=0,pan:l=0,send:c=.15}={}){let h=t.ctx;this.ctx=h,this.src=h.createBufferSource(),this.src.buffer=t.noise[n],this.src.loop=!0,this.filter=h.createBiquadFilter(),this.filter.type=i,this.filter.frequency.value=r,this.filter.Q.value=o,this.gain=h.createGain(),this.gain.gain.value=0,this.out=t.route(e,{pan:l,send:c}),this.src.connect(this.filter),this.filter.connect(this.gain),this.gain.connect(this.out),this.src.start(0,H(0,t.noise[n].duration-.1)),this.stopped=!1,this.set({gain:a},.02)}set({gain:t,freq:e,q:n,pan:i}={},r=.04){if(this.stopped)return;let o=this.ctx.currentTime;i!==void 0&&this.out.panner&&this.out.panner.pan.setTargetAtTime(Ht(i,-1,1),o,.05),t!==void 0&&this.gain.gain.setTargetAtTime(Math.max(0,t),o,r),e!==void 0&&this.filter.frequency.setTargetAtTime(Math.max(20,e),o,r),n!==void 0&&this.filter.Q.setTargetAtTime(n,o,r)}stop(t=.25){if(this.stopped)return;this.stopped=!0;let e=this.ctx.currentTime;this.gain.gain.cancelScheduledValues(e),this.gain.gain.setTargetAtTime(0,e,t/3);try{this.src.stop(e+t+.2)}catch{}}},Tn=class{constructor(t,e,{chords:n,gain:i=.05,cutoff:r=1100,period:o=18,wave:a="sine"}={}){this.engine=t,this.ctx=t.ctx,this.chords=n,this.period=o,this.wave=a,this.i=0,this.voices=[];let l=this.ctx;this.master=l.createGain(),this.master.gain.value=0,this.master.gain.setTargetAtTime(i,l.currentTime,2.5),this.level=i,this.lp=l.createBiquadFilter(),this.lp.type="lowpass",this.lp.frequency.value=r,this.lp.Q.value=.4,this.master.connect(this.lp),this.lp.connect(t.route(e,{send:.55})),this._next(),this.timer=setInterval(()=>this._next(),o*1e3)}setLevel(t){this.level=t,this.master.gain.setTargetAtTime(t,this.ctx.currentTime,1.2)}_next(){let t=this.ctx,e=t.currentTime,n=this.period*.45,i=this.voices;this.voices=[];for(let o of i)o.env.gain.cancelScheduledValues(e),o.env.gain.setTargetAtTime(0,e,n/3),o.oscs.forEach(a=>a.stop(e+n*2.5));let r=this.chords[this.i++%this.chords.length];for(let o of r){let a=mr(o),l=t.createGain();l.gain.value=0,l.gain.setTargetAtTime(1/r.length,e,n/3);let c=t.createOscillator();c.frequency.value=H(.05,.14);let h=t.createGain();h.gain.value=.28/r.length,c.connect(h),h.connect(l.gain);let d=[c];for(let u of[-7,6]){let f=t.createOscillator();f.type=this.wave,f.frequency.value=a,f.detune.value=u+H(-2,2),f.connect(l),f.start(e),d.push(f)}c.start(e),l.connect(this.master),this.voices.push({env:l,oscs:d})}}stop(t=1.5){clearInterval(this.timer);let e=this.ctx.currentTime;this.master.gain.cancelScheduledValues(e),this.master.gain.setTargetAtTime(0,e,t/3);for(let n of this.voices)n.oscs.forEach(i=>{try{i.stop(e+t+.5)}catch{}});this.voices=[]}}});var Qp={};vs(Qp,{create:()=>Fx});function $p(s,t){let e=document.createElement("canvas");return e.width=e.height=s,t(e.getContext("2d"),s/2),e}function Zp(s,t,e,n){s.beginPath();for(let i=0;i<6;i++){let r=Math.PI/3*i+Math.PI/6,o=t+Math.cos(r)*n,a=e+Math.sin(r)*n;i?s.lineTo(o,a):s.moveTo(o,a)}s.closePath()}function Jp(s,t,e,n){let i=e*.575;s.lineJoin="round",s.lineWidth=Math.max(1,e*.022),s.strokeStyle="rgba(80,20,70,0.16)",Zp(s,t+e*.012,t+e*.016,i),s.stroke(),s.strokeStyle="rgba(255,255,255,0.34)",Zp(s,t-e*.01,t-e*.012,i),s.stroke()}function Kp(s,t,e,n){let i=Math.ceil(t*1.7*e),r=s*e,o=t*e,a=$p(i,(c,h)=>{Jp(c,h,o,n);let d=c.createRadialGradient(h+r*.1,h+r*.22,r*.2,h+r*.1,h+r*.22,r*1.22);d.addColorStop(0,"rgba(60,10,70,0.30)"),d.addColorStop(.7,"rgba(60,10,70,0.10)"),d.addColorStop(1,"rgba(60,10,70,0)"),c.fillStyle=d,c.beginPath(),c.arc(h+r*.1,h+r*.22,r*1.22,0,Math.PI*2),c.fill(),d=c.createRadialGradient(h-r*.3,h-r*.36,r*.04,h,h,r),d.addColorStop(0,"rgba(255,255,255,0.72)"),d.addColorStop(.22,"rgba(255,255,255,0.30)"),d.addColorStop(.62,Zi(n.tint,.06)),d.addColorStop(.88,Zi(n.rim,.17)),d.addColorStop(1,Zi(n.rim,.36)),c.fillStyle=d,c.beginPath(),c.arc(h,h,r,0,Math.PI*2),c.fill();let u=c.createLinearGradient(h-r,h-r,h+r,h+r);u.addColorStop(0,"rgba(255,255,255,0.95)"),u.addColorStop(.45,"rgba(255,255,255,0.1)"),u.addColorStop(1,"rgba(255,255,255,0.55)"),c.strokeStyle=u,c.lineWidth=Math.max(1.2,r*.075),c.beginPath(),c.arc(h,h,r*.955,0,Math.PI*2),c.stroke(),c.strokeStyle=Zi(n.rim,.22),c.lineWidth=Math.max(1,r*.07),c.beginPath(),c.arc(h,h,r*.85,Math.PI*.1,Math.PI*.9),c.stroke(),c.save(),c.translate(h-r*.34,h-r*.42),c.rotate(-.62);let f=c.createRadialGradient(0,0,0,0,0,r*.36);f.addColorStop(0,"rgba(255,255,255,0.98)"),f.addColorStop(.5,"rgba(255,255,255,0.8)"),f.addColorStop(1,"rgba(255,255,255,0)"),c.fillStyle=f,c.scale(1,.46),c.beginPath(),c.arc(0,0,r*.36,0,Math.PI*2),c.fill(),c.restore(),c.fillStyle="rgba(255,255,255,0.95)",c.beginPath(),c.arc(h-r*.08,h-r*.62,r*.045,0,Math.PI*2),c.fill(),c.strokeStyle="rgba(255,255,255,0.42)",c.lineCap="round",c.lineWidth=Math.max(1.2,r*.1),c.beginPath(),c.arc(h,h,r*.74,Math.PI*.12,Math.PI*.42),c.stroke()}),l=[0,1,2].map(c=>$p(i,(h,d)=>{Jp(h,d,o,n);let u=h.createRadialGradient(d,d,r*.1,d,d,r);u.addColorStop(0,"rgba(255,255,255,0.10)"),u.addColorStop(.7,Zi(n.rim,.1)),u.addColorStop(1,Zi(n.rim,.24)),h.fillStyle=u,h.beginPath(),h.arc(d,d,r*.95,0,Math.PI*2),h.fill(),h.strokeStyle=Zi(n.rim,.3),h.lineWidth=Math.max(1,r*.05),h.beginPath(),h.arc(d,d,r*.95,0,Math.PI*2),h.stroke();let f=17+c*101,p=()=>(f=f*16807%2147483647)/2147483647;h.lineCap="round";for(let x=0;x<7;x++){let g=p()*Math.PI*2,m=r*(.35+p()*.5),M=r*(.05+p()*.25),w=d+Math.cos(g)*M,y=d+Math.sin(g)*M,S=(p()-.5)*r*.5,b=w+Math.cos(g+.3)*m,R=y+Math.sin(g+.3)*m,v=(w+b)/2+Math.cos(g+1.57)*S,C=(y+R)/2+Math.sin(g+1.57)*S;h.lineWidth=Math.max(1,r*.05),h.strokeStyle=Zi(n.rim,.28),h.beginPath(),h.moveTo(w+1,y+1),h.quadraticCurveTo(v+1,C+1,b+1,R+1),h.stroke(),h.strokeStyle="rgba(255,255,255,0.55)",h.beginPath(),h.moveTo(w,y),h.quadraticCurveTo(v,C,b,R),h.stroke()}h.strokeStyle="rgba(255,255,255,0.45)",h.lineWidth=Math.max(1.2,r*.06),h.beginPath(),h.arc(d,d,r*.88,Math.PI*(1.05+c*.1),Math.PI*(1.45+c*.1)),h.stroke()}));return{intact:a,popped:l,S:i,scale:1/e}}function Fx(s){let{audio:t,bus:e,hud:n,root:i}=s,r=Bc(),o=parseInt(r.getItem("hush:bubbles:total")||"0",10)||0,a=Math.floor(Math.random()*xr.length),l=[],c=null,h=70,d=31,u=[],f=[],p=0,x=null,g=0,m=.5,M=null,w=0,y=gr(i,{onResize:b}),{ctx:S}=y;b();function b(){let K=y.w,Q=y.h;if(!K)return;h=Ht(Math.min(K,Q)/6.4,54,96),d=h*.455;let et=h*.3,ot=64,Lt=84,It=Math.max(3,Math.floor((K-et*2-h*.5)/h)),Wt=h*.875,qt=Math.max(3,Math.floor((Q-ot-Lt-h)/Wt)+1),Zt=It*h+h*.5,st=(K-Zt)/2+h/2,ht=(qt-1)*Wt+h,dt=ot+(Q-ot-Lt-ht)/2+h/2,Tt=l;l=[];for(let At=0;At<qt;At++)for(let Dt=0;Dt<It;Dt++){let ne=l.length;l.push({x:st+Dt*h+At%2*(h/2),y:dt+At*Wt,popped:Tt[ne]?.popped??!1,popT:Tt[ne]?.popped?9:0,grow:Tt[ne]?1:0,variant:(At*3+Dt*7)%3,phase:H(0,6.28)})}Tt.length||l.forEach(At=>{At.grow=-(At.x/K)*.7-H(0,.15)}),c=Kp(d,h,y.dpr,xr[a])}function R(){return l.reduce((K,Q)=>K+(Q.popped?0:1),0)}function v(K,Q,et=1,ot=0){if(!t.ready)return;let Lt=Ht((K/y.w-.5)*1.7,-.9,.9),It=H(.8,1.25)*(1.08-Q/y.h*.16),Wt=Ht(et,.35,1);t.burst(e,{kind:"white",dur:.016,attack:4e-4,gain:.5*Wt,type:"bandpass",freq:3400*It,freqEnd:1700*It,q:.65,pan:Lt,send:.08,delay:ot}),t.burst(e,{kind:"white",dur:.007,attack:2e-4,gain:.35*Wt,type:"highpass",freq:6500,pan:Lt,send:.05,delay:ot}),t.tone(e,{freq:560*It,freqEnd:140*It,sweepTime:.05,dur:.07,gain:.5*Wt,pan:Lt,send:.14,delay:ot,attack:.001}),t.tone(e,{freq:170*It,freqEnd:62,dur:.1,gain:.34*Wt,pan:Lt,send:.1,delay:ot,attack:.001});let qt=2+Math.floor(Math.random()*3);for(let Zt=0;Zt<qt;Zt++)t.burst(e,{kind:"white",dur:.007,attack:3e-4,gain:H(.07,.17)*Wt,type:"bandpass",freq:H(3800,9e3),q:1.6,pan:Lt+H(-.15,.15),send:.12,delay:ot+H(.014,.09)})}function C(){if(!t.ready)return;[523.25,659.25,783.99,987.77,1318.5].forEach((Q,et)=>t.bell(e,{freq:Q,gain:.1,decay:2.4,vel:.55,delay:.1+et*.09,pan:(et-2)*.3})),t.burst(e,{kind:"pink",dur:.7,attack:.25,gain:.14,type:"bandpass",freq:400,freqEnd:3200,q:.9,send:.3,curve:"lin"})}function I(K,Q=1,et=0,ot=!1){if(K.popped||K.grow<.6)return!1;K.popped=!0,K.popT=0,o++,w++,ot||v(K.x,K.y,Q,et),f.push({x:K.x,y:K.y,t:0});for(let Lt=0;Lt<6;Lt++){let It=H(0,6.283),Wt=H(40,140)*(.6+Q*.6);u.push({x:K.x,y:K.y,vx:Math.cos(It)*Wt,vy:Math.sin(It)*Wt-20,life:H(.25,.55),t:0,s:H(1.2,2.8)})}return u.length>260&&u.splice(0,u.length-260),!0}function z(K,Q,et,ot,Lt){let It=et-K,Wt=ot-Q,qt=It*It+Wt*Wt,Zt=d*.95,st=0,ht=[];for(let dt of l){if(dt.popped)continue;let Tt=qt?((dt.x-K)*It+(dt.y-Q)*Wt)/qt:0;Tt=Ht(Tt,0,1);let At=K+It*Tt,Dt=Q+Wt*Tt;(dt.x-At)**2+(dt.y-Dt)**2<Zt*Zt&&ht.push({b:dt,t:Tt})}ht.sort((dt,Tt)=>dt.t-Tt.t);for(let{b:dt}of ht)I(dt,Lt,Math.min(.12,st*.012))&&st++;return st&&(t.haptic?.(st>2?14:8),N()),st}function N(){n.setStat(`Popped ${o.toLocaleString()}`),r.setItem("hush:bubbles:total",String(o))}function O(){a=(a+1+Math.floor(Math.random()*(xr.length-1)))%xr.length,x=null,c=Kp(d,h,y.dpr,xr[a]),p=0;for(let K of l)K.popped=!1,K.popT=0,K.grow=-(K.x/y.w)*.7-H(0,.15),K.variant=Math.floor(Math.random()*3);C()}function G(){let K=l.filter(ot=>!ot.popped);if(!K.length)return;let Q=M?M.x:y.w/2,et=M?M.y:y.h/2;K.sort((ot,Lt)=>Math.hypot(ot.x-Q,ot.y-et)-Math.hypot(Lt.x-Q,Lt.y-et)),x={list:K,i:0,t:0,next:0}}let Y=Gn(i,{hover:!0,down(K){t.unlock?.(),M=K;let Q=Ht(.7+K.speed/2500,.5,1);z(K.x,K.y,K.x,K.y,Q)},move(K){if(M=K,m=Ht(K.x/y.w,0,1),!K.down)return;let Q=Ht(.55+K.speed/2200,.5,1);z(K.px,K.py,K.x,K.y,Q)},leave(){M=null}});n.button({label:"Cascade",title:"Pop everything in a rolling wave",onClick:()=>{t.unlock?.(),G()}}),n.button({label:"New sheet",onClick:()=>{t.unlock?.(),O()}}),n.setHint("Tap to pop. Hold and sweep across the sheet for a rolling crackle."),N();function J(K,Q){let et=y.w,ot=y.h,Lt=xr[a];if(p+=K,x){x.t+=K;let dt=x.list.length,Tt=0;for(;x.i<dt&&x.t>=x.next&&Tt++<12;){let At=x.i/dt;I(x.list[x.i++],.55+At*.4),x.next+=He(.085,.016,wd(At))}x.i>=dt?(x=null,N()):x.i%7===0&&N()}let It=S.createLinearGradient(0,0,et,ot);It.addColorStop(0,Lt.bg[0]),It.addColorStop(1,Lt.bg[1]),S.fillStyle=It,S.fillRect(0,0,et,ot);let Wt=0,qt=c.S*c.scale;for(let dt of l){dt.grow<1&&!dt.popped&&(dt.grow+=K*1.8),dt.popped?dt.popT+=K:Wt++;let Tt=qt/2;if(dt.popped){let At=dt.popT/.2;if(S.globalAlpha=1,S.drawImage(c.popped[dt.variant],dt.x-Tt,dt.y-Tt,qt,qt),At<1){let Dt=wd(At),ne=1-.4*Dt+.12*Math.sin(Math.min(1,At*3)*Math.PI);S.globalAlpha=1-Dt;let xt=qt*ne;S.drawImage(c.intact,dt.x-xt/2,dt.y-xt/2,xt,xt),S.globalAlpha=1}}else if(dt.grow>0){let At=Ux(dt.grow),Dt=1+Math.sin(p*1.3+dt.phase)*.004,ne=qt*Ht(At,0,1.15)*Dt;S.globalAlpha=Ht(dt.grow*2,0,1),S.drawImage(c.intact,dt.x-ne/2,dt.y-ne/2,ne,ne),S.globalAlpha=1}else S.drawImage(c.popped[dt.variant],dt.x-Tt,dt.y-Tt,qt,qt),dt.grow+=K*1.4}if(M&&M.type==="mouse"){let dt=null,Tt=d*d;for(let At of l){if(At.popped)continue;let Dt=(At.x-M.x)**2+(At.y-M.y)**2;Dt<Tt&&(Tt=Dt,dt=At)}dt&&(S.strokeStyle="rgba(255,255,255,0.55)",S.lineWidth=2,S.beginPath(),S.arc(dt.x,dt.y,d*1.04,0,Math.PI*2),S.stroke())}for(let dt=f.length-1;dt>=0;dt--){let Tt=f[dt];if(Tt.t+=K/.32,Tt.t>=1){f.splice(dt,1);continue}let At=wd(Tt.t);S.strokeStyle=`rgba(255,255,255,${.7*(1-At)})`,S.lineWidth=3*(1-At)+.5,S.beginPath(),S.arc(Tt.x,Tt.y,d*(.9+At*.95),0,Math.PI*2),S.stroke()}for(let dt=u.length-1;dt>=0;dt--){let Tt=u[dt];if(Tt.t+=K,Tt.t>Tt.life){u.splice(dt,1);continue}Tt.vx*=.92,Tt.vy=Tt.vy*.92+120*K,Tt.x+=Tt.vx*K,Tt.y+=Tt.vy*K,S.fillStyle=`rgba(255,255,255,${.9*(1-Tt.t/Tt.life)})`,S.beginPath(),S.arc(Tt.x,Tt.y,Tt.s*(1-Tt.t/Tt.life*.5),0,Math.PI*2),S.fill()}let Zt=(m-.5)*et*.6+et*.5,st=S.createLinearGradient(Zt-et*.35,0,Zt+et*.35,ot);st.addColorStop(0,"rgba(255,255,255,0)"),st.addColorStop(.5,"rgba(255,255,255,0.12)"),st.addColorStop(1,"rgba(255,255,255,0)"),S.fillStyle=st,S.fillRect(0,0,et,ot);let ht=S.createRadialGradient(et/2,ot/2,Math.min(et,ot)*.4,et/2,ot/2,Math.max(et,ot)*.8);ht.addColorStop(0,"rgba(60,10,70,0)"),ht.addColorStop(1,"rgba(60,10,70,0.28)"),S.fillStyle=ht,S.fillRect(0,0,et,ot),Wt===0&&!x?(g+=K,g>1.1&&(g=0,O(),n.setHint("Fresh sheet.",2500))):g=0}let rt=Vn(J);return{destroy(){rt.stop(),Y.dispose(),y.dispose(),r.setItem("hush:bubbles:total",String(o))}}}var xr,Zi,wd,Ux,jp=Le(()=>{hi();xr=[{name:"Rose",bg:["#ffd9ea","#ff9cc8"],tint:[255,120,175],rim:[190,60,120]},{name:"Lilac",bg:["#e6d9ff","#a98bff"],tint:[150,110,255],rim:[90,50,190]},{name:"Sky",bg:["#d8f1ff","#7cc4ff"],tint:[90,175,255],rim:[30,100,190]},{name:"Mint",bg:["#d9fff0","#7fe5c0"],tint:[70,210,165],rim:[20,130,100]},{name:"Peach",bg:["#ffe8d6","#ffab85"],tint:[255,150,105],rim:[200,80,40]}],Zi=(s,t)=>`rgba(${s[0]},${s[1]},${s[2]},${t})`,wd=s=>1-Math.pow(1-Ht(s,0,1),3),Ux=s=>{s=Ht(s,0,1);let t=1.9;return 1+(t+1)*Math.pow(s-1,3)+t*Math.pow(s-1,2)}});var im={};vs(im,{create:()=>Bx});function Bx(s){let{audio:t,bus:e,hud:n,root:i,settings:r}=s,o=0,a=0,l=1,c=0,h=0,d=0,u=0,f,p,x,g,m,M,w,y,S,b={x0:0,y0:0,x1:-1,y1:-1},R="rake",v=[],C=[],I=[],z=0,N=null,O=null,G={x:1,y:0},Y=gr(i,{maxPixels:35e5,onResize:Q}),{ctx:J}=Y;function rt(A,L,D,F){b.x1<b.x0?b={x0:A,y0:L,x1:D,y1:F}:(b.x0=Math.min(b.x0,A),b.y0=Math.min(b.y0,L),b.x1=Math.max(b.x1,D),b.y1=Math.max(b.y1,F))}let K=()=>rt(0,0,o-1,a-1);function Q(){let A=Y.w,L=Y.h;if(!A)return;let D=Math.round(Ht(Math.min(A,L)*.028,10,22));c=D,h=D,d=A-D*2,u=L-D*2,l=Math.max(.55,Math.min(Y.dpr,Math.sqrt(1e6/(d*u)))),o=Math.round(d*l),a=Math.round(u*l),f=new Float32Array(o*a),p=new Float32Array(o*a),x=new Float32Array(o*a),g=new Float32Array(o*a);let F=Oc(1234);for(let V=0;V<o*a;V++)p[V]=F()-.5,x[V]=F()-.5,g[V]=.93+F()*.14;w=document.createElement("canvas"),w.width=o,w.height=a,y=w.getContext("2d"),m=y.createImageData(o,a),M=new Uint32Array(m.data.buffer),et(A,L,D),v.length||ot();for(let V of v)It(V),qt(V,1,1);K()}function et(A,L,D){let F=document.createElement("canvas");F.width=Math.round(A*Y.dpr),F.height=Math.round(L*Y.dpr);let V=F.getContext("2d");V.scale(Y.dpr,Y.dpr);let B=D*.9,X=V.createLinearGradient(0,0,A,L);X.addColorStop(0,"#6b4a33"),X.addColorStop(.5,"#4d3424"),X.addColorStop(1,"#5e422d"),V.fillStyle=X,V.beginPath(),V.rect(0,0,A,L),V.roundRect(c,h,d,u,B),V.fill("evenodd");let tt=Oc(99);V.save(),V.beginPath(),V.rect(0,0,A,L),V.roundRect(c,h,d,u,B),V.clip("evenodd");for(let vt=0;vt<90;vt++){V.strokeStyle=`rgba(${tt()>.5?"255,220,180":"20,10,0"},${.04+tt()*.06})`,V.lineWidth=.6+tt()*1.4,V.beginPath();let _t=tt()*L;V.moveTo(0,_t),V.bezierCurveTo(A*.3,_t+tt()*12-6,A*.7,_t+tt()*12-6,A,_t+tt()*10-5),V.stroke()}V.restore(),V.save(),V.beginPath(),V.roundRect(c,h,d,u,B),V.clip(),V.shadowColor="rgba(0,0,0,0.65)",V.shadowBlur=D*1.8,V.fillStyle="#000",V.beginPath(),V.rect(c-200,h-200,d+400,u+400),V.roundRect(c,h,d,u,B),V.fill("evenodd"),V.restore(),V.strokeStyle="rgba(255,230,200,0.22)",V.lineWidth=1.2,V.beginPath(),V.roundRect(c-.5,h-.5,d+1,u+1,B),V.stroke(),S=F}function ot(){v=[Lt(.72,.38,46),Lt(.27,.66,34),Lt(.82,.74,24)]}function Lt(A,L,D){return{u:A,v:L,rx:D,ry:D*H(.72,.86),seed:Math.floor(H(1,1e6)),rot:H(-.4,.4),drop:1,sprite:null}}function It(A){let L=Y.dpr,D=A.rx*1.6,F=Math.ceil((A.rx+D)*2*L),V=document.createElement("canvas");V.width=V.height=F;let B=V.getContext("2d");B.scale(L,L);let X=F/L/2,tt=F/L/2,vt=Oc(A.seed),_t=[],bt=11;for(let ct=0;ct<bt;ct++){let Z=ct/bt*Math.PI*2,gt=1+(vt()-.5)*.22;_t.push([Math.cos(Z+A.rot)*A.rx*gt,Math.sin(Z+A.rot)*A.ry*gt])}let j=()=>{B.beginPath();for(let ct=0;ct<bt;ct++){let Z=_t[ct],gt=_t[(ct+1)%bt],yt=(Z[0]+gt[0])/2,lt=(Z[1]+gt[1])/2;ct===0&&B.moveTo(X+(_t[bt-1][0]+Z[0])/2,tt+(_t[bt-1][1]+Z[1])/2),B.quadraticCurveTo(X+Z[0],tt+Z[1],X+yt,tt+lt)}B.closePath()};B.save(),B.translate(X+A.rx*.28,tt+A.ry*.46);let mt=B.createRadialGradient(0,0,0,0,0,A.rx*1.25);mt.addColorStop(0,"rgba(50,30,10,0.55)"),mt.addColorStop(.65,"rgba(50,30,10,0.22)"),mt.addColorStop(1,"rgba(50,30,10,0)"),B.fillStyle=mt,B.scale(1,.62),B.beginPath(),B.arc(0,0,A.rx*1.25,0,Math.PI*2),B.fill(),B.restore(),j();let Rt=B.createRadialGradient(X-A.rx*.38,tt-A.ry*.5,A.rx*.08,X,tt,A.rx*1.15);Rt.addColorStop(0,"#bdb9b4"),Rt.addColorStop(.35,"#85817f"),Rt.addColorStop(.8,"#4a484c"),Rt.addColorStop(1,"#2d2b30"),B.fillStyle=Rt,B.fill(),B.save(),j(),B.clip();for(let ct=0;ct<160;ct++){let Z=vt()*Math.PI*2,gt=Math.sqrt(vt()),yt=X+Math.cos(Z)*gt*A.rx,lt=tt+Math.sin(Z)*gt*A.ry;B.fillStyle=vt()>.5?`rgba(255,255,255,${.05+vt()*.18})`:`rgba(0,0,0,${.06+vt()*.18})`,B.fillRect(yt,lt,.9+vt()*1.5,.9+vt()*1.5)}B.strokeStyle="rgba(255,255,255,0.07)",B.lineWidth=1.5;for(let ct=0;ct<4;ct++){B.beginPath();let Z=tt-A.ry*.5+ct*A.ry*.3;B.moveTo(X-A.rx,Z+vt()*6),B.bezierCurveTo(X-A.rx*.3,Z-6+vt()*12,X+A.rx*.3,Z-6+vt()*12,X+A.rx,Z+vt()*6),B.stroke()}let P=B.createLinearGradient(X-A.rx,tt-A.ry,X+A.rx,tt+A.ry);P.addColorStop(0,"rgba(255,255,255,0.35)"),P.addColorStop(.4,"rgba(255,255,255,0)"),P.addColorStop(.85,"rgba(255,225,170,0.0)"),P.addColorStop(1,"rgba(255,210,150,0.28)"),B.fillStyle=P,B.fillRect(0,0,F,F),B.restore(),A.sprite=V,A.spriteSize=F/L}let Wt=A=>({x:A.u*d,y:A.v*u});function qt(A,L,D){let F=A.u*o,V=A.v*a,B=A.rx*l,X=A.ry*l,tt=11*l,vt=tt*5.2,_t=vt*L,bt=Math.max(B,X)+_t+2,j=Math.max(1,Math.floor(F-bt)),mt=Math.min(o-2,Math.ceil(F+bt)),Rt=Math.max(1,Math.floor(V-bt)),P=Math.min(a-2,Math.ceil(V+bt));for(let ct=Rt;ct<=P;ct++)for(let Z=j;Z<=mt;Z++){let gt=(Z-F)/B,yt=(ct-V)/X,lt=Math.hypot(gt,yt);if(lt<.9)continue;let Nt=(lt-1)*(B+X)*.5;if(Nt<0||Nt>_t)continue;let W=$i(0,tt*.6,Nt)*(1-$i(vt*.55,vt,Nt))*$i(_t,_t-tt,Nt),St=.5-.5*Math.cos(2*Math.PI*Nt/tt+.5),Ft=W*(-.85*St+.3*(1-St))*D,te=ct*o+Z;f[te]+=(Ft-f[te])*Math.min(1,.35+W*.4)}rt(j,Rt,mt,P)}function Zt(A,L){let D=H(22,42),F=Lt(A/d,L/u,D);F.drop=0,It(F),v.push(F),I.push({s:F,t:0});for(let V=0;V<26;V++){let B=H(0,Math.PI*2),X=H(30,120);C.push({x:A,y:L+D*.4,vx:Math.cos(B)*X,vy:Math.sin(B)*X*.5-H(10,60),life:H(.3,.7),t:0,s:H(.8,1.9)})}if(t.ready){let V=Ht((A/d-.5)*1.5,-.9,.9);t.tone(e,{freq:120,freqEnd:52,dur:.22,gain:.55,pan:V,send:.25,attack:.002}),t.burst(e,{kind:"brown",dur:.22,gain:.5,type:"lowpass",freq:700,freqEnd:200,pan:V,send:.2}),t.burst(e,{kind:"white",dur:.09,gain:.12,type:"bandpass",freq:3e3,q:.7,pan:V,send:.15});for(let B=0;B<12;B++)t.burst(e,{kind:"white",dur:.004,gain:H(.04,.1),type:"bandpass",freq:H(2500,7e3),q:1.2,pan:V+H(-.2,.2),send:.1,delay:H(.03,.35)})}t.haptic?.(18)}function st(A,L){for(let D=v.length-1;D>=0;D--){let F=v[D],V=Wt(F);if(((A-V.x)/(F.rx*1.1))**2+((L-V.y)/(F.ry*1.1))**2<1){v.splice(D,1),I=I.filter(vt=>vt.s!==F);let B=F.u*o,X=F.v*a,tt=(F.rx+11*5.5)*l;for(let vt=Math.max(1,Math.floor(X-tt));vt<=Math.min(a-2,Math.ceil(X+tt));vt++)for(let _t=Math.max(1,Math.floor(B-tt));_t<=Math.min(o-2,Math.ceil(B+tt));_t++)(_t-B)**2+(vt-X)**2<tt*tt&&(f[vt*o+_t]*=.2);return rt(Math.floor(B-tt),Math.floor(X-tt),Math.ceil(B+tt),Math.ceil(X+tt)),t.ready&&(t.burst(e,{kind:"pink",dur:.25,gain:.3,type:"bandpass",freq:600,freqEnd:1800,q:.8,curve:"lin",pan:Ht((A/d-.5)*1.5,-1,1)}),t.tone(e,{freq:90,freqEnd:140,dur:.15,gain:.25,send:.2})),!0}}return!1}let ht=(A,L)=>{for(let D of v){let F=(A-D.u*o)/(D.rx*l*.98),V=(L-D.v*a)/(D.ry*l*.98);if(F*F+V*V<1)return!0}return!1};function dt(A,L,D,F){let V=Math.max(1,Math.floor(A-D)),B=Math.min(o-2,Math.ceil(A+D)),X=Math.max(1,Math.floor(L-D)),tt=Math.min(a-2,Math.ceil(L+D));for(let vt=X;vt<=tt;vt++)for(let _t=V;_t<=B;_t++){let bt=Math.hypot(_t-A,vt-L)/D;if(bt>=1)continue;let j=bt<.5?-.5*(1+Math.cos(2*Math.PI*bt)):.38*Math.sin(2*Math.PI*(bt-.5)),mt=.62*(1-bt*bt*.5),Rt=vt*o+_t;f[Rt]+=(j*F-f[Rt])*mt}rt(V,X,B,tt)}function Tt(A,L,D,F){let V=Math.max(1,Math.floor(A-D)),B=Math.min(o-2,Math.ceil(A+D)),X=Math.max(1,Math.floor(L-D)),tt=Math.min(a-2,Math.ceil(L+D));for(let vt=X;vt<=tt;vt++)for(let _t=V;_t<=B;_t++){let bt=Math.hypot(_t-A,vt-L)/D;if(bt>=1)continue;let j=vt*o+_t;f[j]*=1-F*(1-bt*bt)}rt(V,X,B,tt)}function At(A,L,D,F){let V=Td[R],B=D-A,X=F-L,tt=Math.hypot(B,X);if(tt<.01)return;let vt=B/tt,_t=X/tt,j=Math.max(1,Math.ceil(tt/.8)),mt=26*l;for(let Rt=1;Rt<=j;Rt++){let P=Rt/j*tt,ct=A+vt*P,Z=L+_t*P,gt=1-Math.exp(-(tt/j)/mt);N.dx+=(vt-N.dx)*gt,N.dy+=(_t-N.dy)*gt;let yt=Math.hypot(N.dx,N.dy)||1;N.dx/=yt,N.dy/=yt,N.travel+=tt/j;let lt=$i(0,16*l,N.travel),Nt=-N.dy,W=N.dx;if(R==="smooth"){Tt(ct,Z,26*l,.22);continue}if(V.tines===1)ht(ct,Z)||dt(ct,Z,V.radius*l,V.depth*lt);else{let St=V.spacing*l,Ft=St*.47;for(let te=0;te<V.tines;te++){let de=(te-(V.tines-1)/2)*St,Te=ct+Nt*de,Ue=Z+W*de;Te<2||Ue<2||Te>o-3||Ue>a-3||ht(Te,Ue)||dt(Te,Ue,Ft,V.depth*lt)}}}G={x:N.dx,y:N.dy}}function Dt(){if(b.x1<b.x0)return;let A=Ht(b.x0-1,1,o-2),L=Ht(b.x1+1,1,o-2),D=Ht(b.y0-1,1,a-2),F=Ht(b.y1+1,1,a-2),V=2.6,B=.42,X=1/Math.hypot(tm,em,nm),tt=tm*X,vt=em*X,_t=nm*X,[bt,j,mt]=Ox;for(let Rt=D;Rt<=F;Rt++){let P=Rt*o+A;for(let ct=A;ct<=L;ct++,P++){let Z=f[P],gt=(f[P-1]-f[P+1])*V+p[P]*B,yt=(f[P-o]-f[P+o])*V+x[P]*B,lt=1/Math.sqrt(gt*gt+yt*yt+1),St=.78+((gt*tt+yt*vt+_t)*lt-_t)*1.35;St*=1+Z*.16,St*=g[P];let Ft=Ht(bt*St,0,255),te=Ht(j*St*.995,0,255),de=Ht(mt*St*.97,0,255);M[P]=4278190080|(de|0)<<16|(te|0)<<8|(Ft|0)}}y.putImageData(m,0,0,A,D,L-A+1,F-D+1),b={x0:0,y0:0,x1:-1,y1:-1}}function ne(){if(!O||O.type!=="mouse"||N)return;let A=O.x,L=O.y;if(!(A<c||L<h||A>c+d||L>h+u)){if(J.save(),J.strokeStyle="rgba(70,40,10,0.55)",J.fillStyle="rgba(255,245,220,0.35)",J.lineWidth=1.5,R==="rake"||R==="comb"){let D=Td[R],F=-G.y,V=G.x;for(let B=0;B<D.tines;B++){let X=(B-(D.tines-1)/2)*D.spacing;J.beginPath(),J.arc(A+F*X,L+V*X,R==="rake"?2.6:1.8,0,Math.PI*2),J.fill(),J.stroke()}}else R==="finger"?(J.beginPath(),J.arc(A,L,5,0,Math.PI*2),J.fill(),J.stroke()):R==="smooth"?(J.beginPath(),J.arc(A,L,26,0,Math.PI*2),J.setLineDash([4,5]),J.stroke()):R==="stone"&&(J.beginPath(),J.ellipse(A,L,30,23,0,0,Math.PI*2),J.setLineDash([5,5]),J.stroke());J.restore()}}Q();let xt=null,wt=null,Ct=null,Pt=.055,at=null,Ut=0;t.ready&&(xt=t.loop(e,{kind:"white",filter:"bandpass",freq:2600,q:.5,gain:0,send:.12}),wt=t.loop(e,{kind:"pink",filter:"lowpass",freq:800,q:.5,gain:0,send:.1}),at=t.loop(e,{kind:"pink",filter:"bandpass",freq:380,q:.7,gain:.02,send:.5}),Ct=new Tn(t,e,{chords:[[50,57,62,66],[47,54,59,62],[43,50,55,62],[45,52,57,61]],gain:r.ambience?Pt:0,cutoff:900,period:20}));let pt=A=>Ct?.setLevel(A.detail?Pt:0);window.addEventListener("hush:ambience",pt);let Et=0;function Ot(A){if(!t.ready)return;let L=Td[R]||{hiss:.7,hissF:-200,body:.8},F=N&&N.speed>0?Ht(N.speed/900,0,1):0;Ut+=(F-Ut)*(1-Math.exp(-(F>Ut?14:7)*A));let V=Ut,B=N?Ht((N.cssX/d-.5)*1.6,-.9,.9):0;if(xt.set({gain:.42*Math.pow(V,1.15)*L.hiss,freq:1700+2600*V+L.hissF,pan:B},.035),wt.set({gain:.3*V*L.body,freq:450+900*V,pan:B},.05),V>.03){let tt=55*V*A;for(;tt>0;)Math.random()<tt&&t.burst(e,{kind:"white",dur:H(.002,.006),attack:3e-4,gain:H(.03,.11)*(.4+V),type:"bandpass",freq:H(2500,8e3),q:H(.8,2),pan:B+H(-.2,.2),send:.08}),tt-=1}Et+=A,at.set({gain:.018+.014*Math.sin(Et*.23)*Math.sin(Et*.11+1),freq:320+160*Math.sin(Et*.17)},.5)}let k=Gn(i,{hover:!0,down(A){t.unlock?.();let L=A.x-c,D=A.y-h;if(!(L<0||D<0||L>d||D>u)){if(R==="stone"){st(L,D)||Zt(Ht(L,20,d-20),Ht(D,20,u-20));return}N={id:A.id,x:L*l,y:D*l,dx:G.x,dy:G.y,travel:0,speed:0,cssX:L},(R==="finger"||R==="smooth")&&At(N.x,N.y,N.x+.01,N.y)}},move(A){if(O=A,!N||N.id!==A.id)return;let L=Ht(A.x-c,0,d),D=Ht(A.y-h,0,u),F=L*l,V=D*l;N.speed=A.speed,N.cssX=L,!(Math.hypot(F-N.x,V-N.y)<.35)&&(At(N.x,N.y,F,V),N.x=F,N.y=V)},up(A){N&&N.id===A.id&&(N=null)},leave(){O=null}}),jt=n.segmented({label:"Tool",options:[{id:"rake",label:"Rake"},{id:"comb",label:"Comb"},{id:"finger",label:"Finger"},{id:"stone",label:"Stone"},{id:"smooth",label:"Smooth"}],value:R,onChange:A=>{R=A,N=null,$()}});n.button({label:"Reset",title:"Wipe the sand clean",onClick:()=>{z=1,t.ready&&t.burst(e,{kind:"pink",dur:.9,attack:.3,gain:.28,type:"bandpass",freq:500,freqEnd:2200,q:.7,curve:"lin",send:.25})}});function $(){let A={rake:"Drag slowly for long, even lines. Curves fan the tines out.",comb:"A fine comb leaves tight ridges.",finger:"One wide groove \u2014 draw anything.",stone:"Tap sand to set a stone. Tap a stone to lift it away.",smooth:"Brush away what you made."};n.setHint(A[R],6e3)}$();function T(A){for(let D=I.length-1;D>=0;D--){let F=I[D];F.t+=A;let V=Ht(F.t/.55,0,1);qt(F.s,$i(0,1,V),1),F.s.drop=Ht(F.t/.22,0,1),V>=1&&I.splice(D,1)}if(z>0){z-=A*1.1;let D=Math.pow(.82,A*60);for(let F=0;F<f.length;F++)f[F]*=D;if(K(),z<=0){f.fill(0);for(let F of v)qt(F,1,1);K()}}Ot(A),Dt(),J.imageSmoothingEnabled=!0,J.imageSmoothingQuality="high",J.drawImage(w,0,0,o,a,c,h,d,u);let L=J.createRadialGradient(c+d*.4,h+u*.35,Math.min(d,u)*.25,c+d*.5,h+u*.5,Math.max(d,u)*.75);L.addColorStop(0,"rgba(255,240,200,0.07)"),L.addColorStop(1,"rgba(60,30,0,0.2)"),J.fillStyle=L,J.fillRect(c,h,d,u);for(let D of v){let F=D.spriteSize,V=Wt(D),B=D.drop,X=(1-B)*(1-B)*26,tt=1+(1-B)*.18;J.globalAlpha=Math.min(1,B*3),J.save(),J.translate(c+V.x,h+V.y-X),J.scale(tt,tt),J.drawImage(D.sprite,-F/2,-F/2,F,F),J.restore(),J.globalAlpha=1}for(let D=C.length-1;D>=0;D--){let F=C[D];if(F.t+=A,F.t>=F.life){C.splice(D,1);continue}F.vx*=.93,F.vy=F.vy*.93+160*A,F.x+=F.vx*A,F.y+=F.vy*A,J.fillStyle=`rgba(240,215,170,${.85*(1-F.t/F.life)})`,J.beginPath(),J.arc(c+F.x,h+F.y,F.s,0,Math.PI*2),J.fill()}ne(),J.drawImage(S,0,0,Y.w,Y.h)}let _=Vn(T);return{destroy(){_.stop(),k.dispose(),xt?.stop(.1),wt?.stop(.1),at?.stop(.3),Ct?.stop(.6),window.removeEventListener("hush:ambience",pt),Y.dispose()}}}var Td,tm,em,nm,Ox,sm=Le(()=>{hi();ys();Td={rake:{tines:5,spacing:14,depth:1,hiss:1,hissF:0,body:1},comb:{tines:10,spacing:6.5,depth:.8,hiss:.85,hissF:900,body:.7},finger:{tines:1,spacing:0,radius:11,depth:1.05,hiss:1.1,hissF:-700,body:1.3}},tm=-.52,em=-.62,nm=.6,Ox=[226,200,154]});var am={};vs(am,{create:()=>kx});function om(s,t="bokeh"){let e=document.createElement("canvas");e.width=e.height=128;let n=e.getContext("2d"),i=n.createRadialGradient(64,64,0,64,64,64),r=o=>`rgba(${s[0]},${s[1]},${s[2]},${o})`;if(t==="bokeh")i.addColorStop(0,r(.42)),i.addColorStop(.7,r(.6)),i.addColorStop(.9,r(1)),i.addColorStop(1,r(0));else{for(let o=0;o<=8;o++)i.addColorStop(o/8,r(Math.exp(-Math.pow(o/8*2.1,2))));i.addColorStop(1,r(0))}return n.fillStyle=i,n.fillRect(0,0,128,128),e}function kx(s){let{audio:t,bus:e,hud:n,root:i,settings:r,quality:o}=s,a=o==="low",l="night",c="rain",h=[],d=[],u,f,p,x,g,m=[],M=[],w=0,y=0,S=0,b=[],R=12,v=null,C=null,I=0,z=0,N=gr(i,{maxPixels:a?13e5:24e5,onResize:ot}),{ctx:O}=N,G=()=>rm[l],Y=()=>zx[c];function J(){let $=N.w,T=N.h,_=Math.round(Ht($*T/4800,60,a?110:200));d=[];for(let A=0;A<_;A++){let L=pr(G().lights),D=Math.random()<.18;d.push({x:H(-.05,1.05)*$,y:(.12+Math.pow(Math.random(),.8)*.95)*T,r:D?H(34,80):H(10,38),a:D?H(.4,.7):H(.55,1),sp:H(.4,1.6),ph:H(0,6.28),s:0,col:L})}for(let A=0;A<7;A++)d.push({x:H(0,1)*$,y:H(.4,1)*T,r:H(130,280),a:H(.16,.3),sp:H(.15,.4),ph:H(0,6.28),s:0,col:pr(G().lights),wash:!0});rt()}function rt(){h={bokeh:G().lights.map($=>om($,"bokeh")),blob:G().lights.map($=>om($,"blob"))};for(let $ of d)$.s=G().lights.indexOf($.col)}function K($,T){let _=document.createElement("canvas");return _.width=Math.max(2,Math.round($)),_.height=Math.max(2,Math.round(T)),_}function Q($,T,_,A,L){let D=$.createLinearGradient(0,0,0,_);for(let[V,B]of G().sky)D.addColorStop(V,B);$.globalCompositeOperation="source-over",$.globalAlpha=1,$.fillStyle=D,$.fillRect(0,0,T,_),$.globalCompositeOperation="lighter";for(let V of d){let B=.8+.2*Math.sin(A*V.sp+V.ph),X=L||V.wash;$.globalAlpha=Math.min(1,V.a*B*(L&&!V.wash?.9:1));let tt=V.r*2*Me*(L&&!V.wash?1.9:1);$.drawImage((X?h.blob:h.bokeh)[V.s],V.x*Me-tt/2,V.y*Me-tt/2,tt,tt)}$.globalAlpha=1;let F=$.createLinearGradient(0,_*.55,0,_);F.addColorStop(0,"rgba(0,0,0,0)"),F.addColorStop(1,G().glow),$.fillStyle=F,$.fillRect(0,_*.55,T,_*.45),$.globalCompositeOperation="source-over"}function et(){let $=p.width,T=p.height;g=K($,T);let _=g.getContext("2d");Q(_,$,T,3,!0);let A=_.createLinearGradient(0,0,0,T);A.addColorStop(0,"rgba(190,205,232,0.5)"),A.addColorStop(1,"rgba(218,226,242,0.58)"),_.fillStyle=A,_.fillRect(0,0,$,T);for(let L=0;L<$*T/40;L++)_.fillStyle=`rgba(255,255,255,${Math.random()*.07})`,_.fillRect(Math.random()*$,Math.random()*T,1.4,1.4)}function ot(){let $=N.w,T=N.h;if(!$)return;u=K($*Me,T*Me),f=u.getContext("2d"),p=K($*Me,T*Me),x=p.getContext("2d"),J(),et(),x.globalCompositeOperation="source-over",x.drawImage(g,0,0),m=[],M=[];let _=Math.round(Ht($*T/4200,80,a?220:380));for(let L=0;L<_;L++)It(!0);let A=Math.round($/220);for(let L=0;L<A;L++)Wt(H(0,$),H(0,T*.7),H(5,8),!0)}function Lt($,T,_){x.globalCompositeOperation="destination-out",x.beginPath(),x.arc($*Me,T*Me,Math.max(1,_*Me),0,Math.PI*2),x.fill(),x.globalCompositeOperation="source-over"}function It($=!1){let T=Y(),_=1.1+Math.pow(Math.random(),3.4)*T.maxR,A=H(0,N.w),L=H(0,N.h);if(_>4.6&&!$&&Math.random()<T.big+.2){Wt(A,L,_);return}m.push({x:A,y:L,r:_,a:$?1:0,sq:H(.9,1.1)}),Lt(A,L,_*1.35+.8)}function Wt($,T,_,A=!1){M.push({x:$,y:T,r:_,vy:0,px:$,py:T,wait:A?H(0,1):H(.2,2.2),moving:!1,wob:H(0,6.28),drift:H(-6,6),trailAcc:0,a:1}),Lt($,T,_*1.35+.8)}function qt($){let T=Y(),A=T.spawn*$;for(;A>0;)Math.random()<A&&It(),A-=1;m.length>520&&m.splice(0,m.length-520);for(let D of m)D.a<1&&(D.a=Math.min(1,D.a+$*6));for(let D=M.length-1;D>=0;D--){let F=M[D];if(F.px=F.x,F.py=F.y,!F.moving)F.wait-=$,F.wait<=0&&(F.moving=!0,F.run=H(.3,1.6),F.vy=20+F.r*5);else{let V=25+F.r*F.r*3.2;if(F.vy+=(V-F.vy)*Math.min(1,$*2.5),F.run-=$,F.wob+=$*3,F.x+=(Math.sin(F.wob)*5+F.drift)*$*(.3+F.r*.08),F.y+=F.vy*$,F.trailAcc+=F.vy*$,F.trailAcc>14+F.r*2.2){F.trailAcc=0;let B=H(.8,1.7);m.push({x:F.x+H(-1,1),y:F.py-F.r*.4,r:B,a:1,sq:1}),F.r*=.985}x.globalCompositeOperation="destination-out",x.lineCap="round",x.lineWidth=Math.max(1.2,F.r*.95*Me),x.beginPath(),x.moveTo(F.px*Me,F.py*Me),x.lineTo(F.x*Me,F.y*Me),x.stroke(),x.globalCompositeOperation="source-over",F.run<=0&&(F.moving=!1,F.wait=H(.15,1.8));for(let B=m.length-1;B>=0;B--){let X=m[B],tt=X.x-F.x,vt=X.y-F.y,_t=F.r+X.r*.7;tt*tt+vt*vt<_t*_t&&(F.r=Math.cbrt(F.r**3+X.r**3*.9),m.splice(B,1))}}if(F.moving&&F.r<3.1){m.push({x:F.x,y:F.y,r:F.r,a:1,sq:1}),M.splice(D,1);continue}F.y>N.h+20&&M.splice(D,1)}for(let D=0;D<M.length;D++)for(let F=M.length-1;F>D;F--){let V=M[D],B=M[F],X=(V.r+B.r)*.75;(V.x-B.x)**2+(V.y-B.y)**2<X*X&&(V.r=Math.cbrt(V.r**3+B.r**3),V.moving=!0,V.run=Math.max(V.run||0,.8),M.splice(F,1))}let L=Math.round(N.w/(c==="drizzle"?380:c==="rain"?220:130));M.length<L&&Math.random()<$*.9&&Wt(H(0,N.w),H(-10,N.h*.45),H(4.6,T.maxR+1))}function Zt($,T,_,A=1,L=1.12){if(_<2.1){O.globalAlpha=A,O.fillStyle="rgba(0,0,0,0.28)",O.beginPath(),O.arc($+.3,T+.5,_,0,Math.PI*2),O.fill(),O.fillStyle="rgba(255,255,255,0.55)",O.beginPath(),O.arc($-_*.3,T-_*.35,_*.38,0,Math.PI*2),O.fill(),O.globalAlpha=1;return}let D=_*L;O.save(),O.globalAlpha=A,O.fillStyle="rgba(0,0,0,0.22)",O.beginPath(),O.ellipse($+_*.12,T+D*.2,_*1.04,D*1.04,0,0,Math.PI*2),O.fill(),O.beginPath(),O.ellipse($,T,_,D,0,0,Math.PI*2),O.clip();let F=2.1,V=_*2*F,B=D*2*F;O.translate($,T),O.scale(-1,-1);let X=($-V/2)*Me,tt=(T-B/2+D*.2)*Me;O.drawImage(u,X,tt,V*Me,B*Me,-_,-D,_*2,D*2),O.globalCompositeOperation="lighter",O.globalAlpha=A*.7,O.drawImage(u,X,tt,V*Me,B*Me,-_,-D,_*2,D*2),O.globalCompositeOperation="source-over",O.globalAlpha=A,O.setTransform(N.dpr,0,0,N.dpr,0,0);let vt=O.createRadialGradient($,T,_*.45,$,T,_*1.02);vt.addColorStop(0,"rgba(0,0,0,0)"),vt.addColorStop(1,"rgba(0,0,0,0.34)"),O.fillStyle=vt,O.fillRect($-_-1,T-D-1,_*2+2,D*2+2),O.restore(),O.save(),O.globalAlpha=A,O.strokeStyle="rgba(255,255,255,0.8)",O.lineCap="round",O.lineWidth=Math.max(1,_*.16),O.beginPath(),O.ellipse($,T+D*.06,_*.72,D*.76,0,Math.PI*.18,Math.PI*.62),O.globalAlpha=A*.4,O.stroke(),O.globalAlpha=A,O.fillStyle="rgba(255,255,255,0.95)",O.beginPath(),O.ellipse($-_*.34,T-D*.4,_*.24,D*.15,-.6,0,Math.PI*2),O.fill(),O.fillStyle="rgba(255,255,255,0.5)",O.beginPath(),O.arc($+_*.25,T+D*.42,_*.1,0,Math.PI*2),O.fill(),O.restore()}function st($,T,_,A){let L=Ht(Math.min(N.w,N.h)*.045,26,40),D=Math.hypot(_-$,A-T),F=Math.max(1,Math.ceil(D/5));x.globalCompositeOperation="destination-out";for(let V=1;V<=F;V++){let B=V/F,X=He($,_,B),tt=He(T,A,B),vt=x.createRadialGradient(X*Me,tt*Me,L*Me*.35,X*Me,tt*Me,L*Me);vt.addColorStop(0,"rgba(0,0,0,1)"),vt.addColorStop(1,"rgba(0,0,0,0)"),x.fillStyle=vt,x.beginPath(),x.arc(X*Me,tt*Me,L*Me,0,Math.PI*2),x.fill();for(let _t=m.length-1;_t>=0;_t--){let bt=m[_t];(bt.x-X)**2+(bt.y-tt)**2<(L*.75)**2&&(v.mass+=bt.r*bt.r*.12,m.splice(_t,1))}}x.globalCompositeOperation="source-over"}ot();let ht,dt,Tt,At,Dt,ne,xt=.05;t.ready&&(ht=t.loop(e,{kind:"pink",filter:"lowpass",freq:3600,q:.4,gain:0,send:.12}),dt=t.loop(e,{kind:"white",filter:"highpass",freq:5200,q:.5,gain:0,send:.05}),Tt=t.loop(e,{kind:"brown",filter:"lowpass",freq:240,q:.5,gain:0,send:.1}),At=t.loop(e,{kind:"white",filter:"bandpass",freq:2500,q:26,gain:0,send:.2}),Dt=t.loop(e,{kind:"pink",filter:"bandpass",freq:1100,q:1.6,gain:0,send:.12}),ne=new Tn(t,e,{chords:[[50,57,60,65],[46,53,58,62],[48,55,60,64],[45,52,57,60]],gain:r.ambience?xt:0,cutoff:800,period:22}));let wt=$=>ne?.setLevel($.detail?xt:0);window.addEventListener("hush:ambience",wt);function Ct(){if(!t.ready)return;let $=Y();ht.set({gain:$.bed,freq:2600+$.bed*5e3},1.2),dt.set({gain:$.bed*.22},1.2),Tt.set({gain:.05+$.bed*.5},1.2)}function Pt(){if(!t.ready)return;let $=H(-.8,.8),T=Math.random();T<.6?t.burst(e,{kind:"white",dur:H(.004,.009),attack:3e-4,gain:H(.03,.12),type:"bandpass",freq:H(2200,6500),q:H(1,3),pan:$,send:.2}):T<.9?(t.tone(e,{freq:H(900,1700),freqEnd:H(500,800),dur:.03,gain:H(.015,.045),pan:$,send:.3,attack:.001}),t.burst(e,{kind:"white",dur:.012,gain:H(.04,.09),type:"bandpass",freq:H(1500,3200),q:1,pan:$,send:.2})):t.bubble(e,{freq:H(700,1500),gain:.025,pan:$,send:.5,dur:.12})}function at($){if(!t.ready)return;let T=H(-.5,.5);t.burst(e,{kind:"brown",dur:H(3.5,5.5),attack:H(.4,1.2),gain:1.1,type:"lowpass",freq:220,freqEnd:50,q:.7,pan:T,send:.55,delay:$,curve:"lin"}),t.burst(e,{kind:"pink",dur:2.2,attack:.15,gain:.25,type:"lowpass",freq:600,freqEnd:90,q:.5,pan:T,send:.5,delay:$+.1});for(let _=0;_<9;_++)t.burst(e,{kind:"white",dur:H(.01,.05),gain:H(.04,.12),type:"bandpass",freq:H(400,1400),q:1,pan:T,send:.4,delay:$+H(0,.5)})}function Ut($){if(!t.ready)return;let T=Y();for(I+=$*T.ticks;I>1;)I-=Math.random()*1.6,Pt();if(v){let _=Ht(v.speed/800,0,1);v.sp+=(_-v.sp)*Math.min(1,$*14);let A=.55+Math.random()*.45;At.set({gain:.075*Math.pow(v.sp,.8)*A,freq:2e3+v.sp*1500+Math.sin(z*40)*160+Math.random()*120,pan:Ht((v.x/N.w-.5)*1.6,-.9,.9)},.02),Dt.set({gain:.2*v.sp,freq:800+v.sp*900},.03)}else At.set({gain:0},.05),Dt.set({gain:0},.08)}function pt(){b=[0,.11,.2].map(($,T)=>({t:$,a:T===1?.55:1})),at(H(.5,2.8))}let Et=Gn(i,{hover:!0,down($){t.unlock?.(),v={id:$.id,x:$.x,y:$.y,speed:0,sp:0,mass:0},st($.x,$.y,$.x+.01,$.y)},move($){C=$,!(!v||v.id!==$.id)&&(st(v.x,v.y,$.x,$.y),v.x=$.x,v.y=$.y,v.speed=$.speed)},up($){v&&v.id===$.id&&(v.mass>.6&&Wt(v.x,v.y,Ht(2.6+v.mass*.6,4,9)),v=null)},leave(){C=null}});n.segmented({label:"Rain",options:[{id:"drizzle",label:"Drizzle"},{id:"rain",label:"Rain"},{id:"storm",label:"Storm"}],value:c,onChange:$=>{c=$,Ct(),R=z+H(3,8)}}),n.segmented({label:"City",options:Object.entries(rm).map(([$,T])=>({id:$,label:T.label})),value:l,onChange:$=>{l=$;for(let T of d)T.col=pr(G().lights);rt(),et()}}),n.button({label:"Fog up",title:"Breathe on the glass",onClick:()=>{y=1,t.ready&&t.burst(e,{kind:"pink",dur:1.2,attack:.5,gain:.12,type:"lowpass",freq:1400,freqEnd:500,q:.5,curve:"lin",send:.3})}}),n.setHint("Wipe the glass with your finger. Drops gather and run."),Ct();let Ot=0;function k($,T){z=T,qt($),Ut($),Ot+=$,Ot>.2&&(Ot=0,x.globalAlpha=y>0?.35:.028,x.drawImage(g,0,0),x.globalAlpha=1,y>0&&(y-=.34)),c==="storm"&&(R-=$,R<=0&&(pt(),R=H(9,20)));let _=0;for(let L=b.length-1;L>=0;L--){let D=b[L];D.t-=$,D.t<=0&&(S=Math.max(S,D.a),b.splice(L,1))}S*=Math.pow(9e-4,$),_=S>.01?S:0,Q(f,u.width,u.height,T,!1),O.imageSmoothingEnabled=!0,O.drawImage(u,0,0,N.w,N.h),O.drawImage(p,0,0,N.w,N.h);for(let L of m)Zt(L.x,L.y,L.r,L.a,1.1);for(let L of M)L.moving&&(O.strokeStyle="rgba(255,255,255,0.1)",O.lineWidth=L.r*.7,O.lineCap="round",O.beginPath(),O.moveTo(L.x,L.y-L.r*1.6),O.lineTo(L.x,L.y-L.r*.2-Math.min(14,L.vy*.12)),O.stroke()),Zt(L.x,L.y,L.r,1,L.moving?1.28:1.12);let A=O.createRadialGradient(N.w/2,N.h/2,Math.min(N.w,N.h)*.45,N.w/2,N.h/2,Math.max(N.w,N.h)*.8);A.addColorStop(0,"rgba(0,0,10,0)"),A.addColorStop(1,"rgba(0,0,10,0.45)"),O.fillStyle=A,O.fillRect(0,0,N.w,N.h),_&&(O.fillStyle=`rgba(215,228,255,${_*.6})`,O.fillRect(0,0,N.w,N.h)),C&&C.type==="mouse"&&!v&&(O.strokeStyle="rgba(255,255,255,0.35)",O.lineWidth=1.5,O.beginPath(),O.arc(C.x,C.y,Ht(Math.min(N.w,N.h)*.045,26,40)*.8,0,Math.PI*2),O.stroke())}let jt=Vn(k);return{destroy(){jt.stop(),Et.dispose(),[ht,dt,Tt,At,Dt].forEach($=>$?.stop(.2)),ne?.stop(.6),window.removeEventListener("hush:ambience",wt),N.dispose()}}}var rm,zx,Me,lm=Le(()=>{hi();ys();rm={night:{label:"Night",sky:[[0,"#15215e"],[.5,"#2c1d60"],[1,"#5a2468"]],lights:[[255,176,72],[255,230,190],[255,84,160],[70,200,225],[100,140,255],[255,80,70],[255,200,120]],glow:"rgba(255,150,80,0.18)"},dusk:{label:"Dusk",sky:[[0,"#3a2a6e"],[.5,"#a24a78"],[1,"#ff9a62"]],lights:[[255,190,110],[255,140,90],[255,105,140],[255,235,190],[190,120,255],[255,170,60]],glow:"rgba(255,170,90,0.28)"},neon:{label:"Neon",sky:[[0,"#0a1038"],[.6,"#1d0e4a"],[1,"#3a1068"]],lights:[[0,230,255],[255,40,190],[150,90,255],[120,255,160],[255,255,255],[255,120,60]],glow:"rgba(160,60,255,0.2)"}},zx={drizzle:{spawn:5,maxR:5.5,ticks:3,bed:.1,big:.1},rain:{spawn:13,maxR:7.5,ticks:9,bed:.19,big:.3},storm:{spawn:30,maxR:9,ticks:20,bed:.3,big:.5}},Me=.5});function Vx(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function Br(s,t){return new Gx[s](t)}function fg(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function qr(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function sp(){let s=qr("canvas");return s.style.display="block",s}function pg(s){rs=s}function mg(){return rs}function Yr(...s){let t="THREE."+s.shift();rs?rs("log",t,...s):console.log(t,...s)}function gg(s){let t=s[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=s[1];e&&e.isStackTrace?s[0]+=" "+e.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function Bt(...s){s=gg(s);let t="THREE."+s.shift();if(rs)rs("warn",t,...s);else{let e=s[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...s)}}function Qt(...s){s=gg(s);let t="THREE."+s.shift();if(rs)rs("error",t,...s);else{let e=s[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...s)}}function di(...s){let t=s.join(" ");t in cm||(cm[t]=!0,Bt(...s))}function xg(s,t,e){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}function Dn(){let s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(un[s&255]+un[s>>8&255]+un[s>>16&255]+un[s>>24&255]+"-"+un[t&255]+un[t>>8&255]+"-"+un[t>>16&15|64]+un[t>>24&255]+"-"+un[e&63|128]+un[e>>8&255]+"-"+un[e>>16&255]+un[e>>24&255]+un[n&255]+un[n>>8&255]+un[n>>16&255]+un[n>>24&255]).toLowerCase()}function ie(s,t,e){return Math.max(t,Math.min(e,s))}function rp(s,t){return(s%t+t)%t}function Hx(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function Wx(s,t,e){return s!==t?(e-s)/(t-s):0}function va(s,t,e){return(1-e)*s+e*t}function Xx(s,t,e,n){return va(s,t,1-Math.exp(-e*n))}function qx(s,t=1){return t-Math.abs(rp(s,t*2)-t)}function Yx(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function $x(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function Zx(s,t){return s+Math.floor(Math.random()*(t-s+1))}function Jx(s,t){return s+Math.random()*(t-s)}function Kx(s){return s*(.5-Math.random())}function Qx(s){s!==void 0&&(hm=s);let t=hm+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function jx(s){return s*Ds}function t_(s){return s*Us}function e_(s){return s>0&&Number.isInteger(s)&&2**Math.round(Math.log2(s))===s}function n_(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function i_(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function s_(s,t,e,n,i){let r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+n)/2),h=o((t+n)/2),d=r((t-n)/2),u=o((t-n)/2),f=r((n-t)/2),p=o((n-t)/2);switch(i){case"XYX":s.set(a*h,l*d,l*u,a*c);break;case"YZY":s.set(l*u,a*h,l*d,a*c);break;case"ZXZ":s.set(l*d,l*u,a*h,a*c);break;case"XZX":s.set(a*h,l*p,l*f,a*c);break;case"YXY":s.set(l*f,a*h,l*p,a*c);break;case"ZYZ":s.set(l*p,l*f,a*h,a*c);break;default:Bt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function yn(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:case Uint8ClampedArray:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ae(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function r_(){let s={enabled:!0,workingColorSpace:Wr,spaces:{},convert:function(i,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===_e&&(i.r=Li(i.r),i.g=Li(i.g),i.b=Li(i.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===_e&&(i.r=zr(i.r),i.g=zr(i.g),i.b=zr(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===vi?Xr:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,o){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return di("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return di("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[Wr]:{primaries:t,whitePoint:n,transfer:Xr,toXYZ:dm,fromXYZ:fm,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ze},outputColorSpaceConfig:{drawingBufferColorSpace:Ze}},[Ze]:{primaries:t,whitePoint:n,transfer:_e,toXYZ:dm,fromXYZ:fm,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ze}}}),s}function Li(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function zr(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}function Cd(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?Ia.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(Bt("Texture: Unable to serialize Texture."),{})}function Id(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}function zd(s,t,e,n,i){for(let r=0,o=s.length-3;r<=o;r+=3){Ss.fromArray(s,r);let a=i.x*Math.abs(Ss.x)+i.y*Math.abs(Ss.y)+i.z*Math.abs(Ss.z),l=t.dot(Ss),c=e.dot(Ss),h=n.dot(Ss);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}function m_(){let s=new ArrayBuffer(4),t=new Float32Array(s),e=new Uint32Array(s),n=new Uint32Array(512),i=new Uint32Array(512);for(let l=0;l<256;++l){let c=l-127;c<-27?(n[l]=0,n[l|256]=32768,i[l]=24,i[l|256]=24):c<-14?(n[l]=1024>>-c-14,n[l|256]=1024>>-c-14|32768,i[l]=-c-1,i[l|256]=-c-1):c<=15?(n[l]=c+15<<10,n[l|256]=c+15<<10|32768,i[l]=13,i[l|256]=13):c<128?(n[l]=31744,n[l|256]=64512,i[l]=24,i[l|256]=24):(n[l]=31744,n[l|256]=64512,i[l]=13,i[l|256]=13)}let r=new Uint32Array(2048),o=new Uint32Array(64),a=new Uint32Array(64);for(let l=1;l<1024;++l){let c=l<<13,h=0;for(;(c&8388608)===0;)c<<=1,h-=8388608;c&=-8388609,h+=947912704,r[l]=c|h}for(let l=1024;l<2048;++l)r[l]=939524096+(l-1024<<13);for(let l=1;l<31;++l)o[l]=l<<23;o[31]=1199570944,o[32]=2147483648;for(let l=33;l<63;++l)o[l]=2147483648+(l-32<<23);o[63]=3347054592;for(let l=1;l<64;++l)l!==32&&(a[l]=1024);return{floatView:t,uint32View:e,baseTable:n,shiftTable:i,mantissaTable:r,exponentTable:o,offsetTable:a}}function En(s){Math.abs(s)>65504&&Bt("DataUtils.toHalfFloat(): Value out of range."),s=ie(s,-65504,65504),Pi.floatView[0]=s;let t=Pi.uint32View[0],e=t>>23&511;return Pi.baseTable[e]+((t&8388607)>>Pi.shiftTable[e])}function ma(s){let t=s>>10;return Pi.uint32View[0]=Pi.mantissaTable[Pi.offsetTable[t]+(s&1023)]+Pi.exponentTable[t],Pi.floatView[0]}function Zc(s,t,e,n,i,r){Ir.subVectors(s,e).addScalar(.5).multiply(n),i!==void 0?(la.x=r*Ir.x-i*Ir.y,la.y=i*Ir.x+r*Ir.y):la.copy(Ir),s.copy(t),s.x+=la.x,s.y+=la.y,s.applyMatrix4(Mg)}function S_(s,t,e,n,i,r,o,a){let l;if(t.side===nn?l=n.intersectTriangle(o,r,i,!0,a):l=n.intersectTriangle(i,r,o,t.side===ki,a),l===null)return null;sh.copy(a),sh.applyMatrix4(s.matrixWorld);let c=e.ray.origin.distanceTo(sh);return c<e.near||c>e.far?null:{distance:c,point:sh.clone(),object:s}}function rh(s,t,e,n,i,r,o,a,l,c){s.getVertexPosition(a,th),s.getVertexPosition(l,eh),s.getVertexPosition(c,nh);let h=S_(s,t,e,n,th,eh,nh,Em);if(h){let d=new U;ti.getBarycoord(Em,th,eh,nh,d),i&&(h.uv=ti.getInterpolatedAttribute(i,a,l,c,d,new Mt)),r&&(h.uv1=ti.getInterpolatedAttribute(r,a,l,c,d,new Mt)),o&&(h.normal=ti.getInterpolatedAttribute(o,a,l,c,d,new U),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new U,materialIndex:0};ti.getNormal(th,eh,nh,u.normal),h.face=u,h.barycoord=d}return h}function $d(s,t){return s-t}function E_(s,t){return s.z-t.z}function C_(s,t){return t.z-s.z}function D_(s,t,e=0){let n=t.itemSize;if(s.isInterleavedBufferAttribute||s.array.constructor!==t.array.constructor){let i=s.count;for(let r=0;r<i;r++)for(let o=0;o<n;o++)t.setComponent(r+e,o,s.getComponent(r,o))}else t.array.set(s.array,e*n);t.needsUpdate=!0}function As(s,t){if(s.constructor!==t.constructor){let e=Math.min(s.length,t.length);for(let n=0;n<e;n++)t[n]=s[n]}else{let e=Math.min(s.length,t.length);t.set(new s.constructor(s.buffer,0,e))}}function dh(s,t,e,n,i,r,o){let a=s.geometry.attributes.position;if(Vh.fromBufferAttribute(a,i),Gh.fromBufferAttribute(a,r),e.distanceSqToSegment(Vh,Gh,Jd,Bm)>n)return;Jd.applyMatrix4(s.matrixWorld);let c=t.ray.origin.distanceTo(Jd);if(!(c<t.near||c>t.far))return{distance:c,point:Bm.clone().applyMatrix4(s.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:s}}function Gm(s,t,e,n,i,r,o){let a=hf.distanceSqToPoint(s);if(a<e){let l=new U;hf.closestPointToPoint(s,l),l.applyMatrix4(n);let c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}function op(){let s=0,t=0,e=0,n=0;function i(r,o,a,l){s=r,t=a,e=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){i(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,d){let u=(o-r)/c-(a-r)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+d)+(l-a)/d;u*=h,f*=h,i(o,a,u,f)},calc:function(r){let o=r*r,a=o*r;return s+t*r+e*o+n*a}}}function Xm(s,t,e,n,i){let r=(n-t)*.5,o=(i-e)*.5,a=s*s,l=s*a;return(2*e-2*n+r+o)*l+(-3*e+3*n-2*r-o)*a+r*s+e}function N_(s,t){let e=1-s;return e*e*t}function U_(s,t){return 2*(1-s)*s*t}function F_(s,t){return s*s*t}function ya(s,t,e,n){return N_(s,t)+U_(s,e)+F_(s,n)}function O_(s,t){let e=1-s;return e*e*e*t}function B_(s,t){let e=1-s;return 3*e*e*s*t}function z_(s,t){return 3*(1-s)*s*s*t}function k_(s,t){return s*s*s*t}function Ma(s,t,e,n,i){return O_(s,t)+B_(s,e)+z_(s,n)+k_(s,i)}function V_(s,t,e=2){let n=t&&t.length,i=n?t[0]*e:s.length,r=Sg(s,0,i,e,!0),o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=q_(s,t,r,e)),s.length>80*e){a=s[0],l=s[1];let h=a,d=l;for(let u=e;u<i;u+=e){let f=s[u],p=s[u+1];f<a&&(a=f),p<l&&(l=p),f>h&&(h=f),p>d&&(d=p)}c=Math.max(h-a,d-l),c=c!==0?32767/c:0}return Qa(r,o,e,a,l,c,0),o}function Sg(s,t,e,n,i){let r;if(i===iv(s,t,e,n)>0)for(let o=t;o<e;o+=n)r=qm(o/n|0,s[o],s[o+1],r);else for(let o=e-n;o>=t;o-=n)r=qm(o/n|0,s[o],s[o+1],r);return r&&lo(r,r.next)&&(tl(r),r=r.next),r}function qs(s,t){if(!s)return s;t||(t=s);let e=s,n;do if(n=!1,!e.steiner&&(lo(e,e.next)||De(e.prev,e,e.next)===0)){if(tl(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Qa(s,t,e,n,i,r,o){if(!s)return;!o&&r&&K_(s,n,i,r);let a=s;for(;s.prev!==s.next;){let l=s.prev,c=s.next;if(r?H_(s,n,i,r):G_(s)){t.push(l.i,s.i,c.i),tl(s),s=c.next,a=c.next;continue}if(s=c,s===a){o?o===1?(s=W_(qs(s),t),Qa(s,t,e,n,i,r,2)):o===2&&X_(s,t,e,n,i,r):Qa(qs(s),t,e,n,i,r,1);break}}}function G_(s){let t=s.prev,e=s,n=s.next;if(De(t,e,n)>=0)return!1;let i=t.x,r=e.x,o=n.x,a=t.y,l=e.y,c=n.y,h=Math.min(i,r,o),d=Math.min(a,l,c),u=Math.max(i,r,o),f=Math.max(a,l,c),p=n.next;for(;p!==t;){if(p.x>=h&&p.x<=u&&p.y>=d&&p.y<=f&&ga(i,a,r,l,o,c,p.x,p.y)&&De(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function H_(s,t,e,n){let i=s.prev,r=s,o=s.next;if(De(i,r,o)>=0)return!1;let a=i.x,l=r.x,c=o.x,h=i.y,d=r.y,u=o.y,f=Math.min(a,l,c),p=Math.min(h,d,u),x=Math.max(a,l,c),g=Math.max(h,d,u),m=uf(f,p,t,e,n),M=uf(x,g,t,e,n),w=s.prevZ,y=s.nextZ;for(;w&&w.z>=m&&y&&y.z<=M;){if(w.x>=f&&w.x<=x&&w.y>=p&&w.y<=g&&w!==i&&w!==o&&ga(a,h,l,d,c,u,w.x,w.y)&&De(w.prev,w,w.next)>=0||(w=w.prevZ,y.x>=f&&y.x<=x&&y.y>=p&&y.y<=g&&y!==i&&y!==o&&ga(a,h,l,d,c,u,y.x,y.y)&&De(y.prev,y,y.next)>=0))return!1;y=y.nextZ}for(;w&&w.z>=m;){if(w.x>=f&&w.x<=x&&w.y>=p&&w.y<=g&&w!==i&&w!==o&&ga(a,h,l,d,c,u,w.x,w.y)&&De(w.prev,w,w.next)>=0)return!1;w=w.prevZ}for(;y&&y.z<=M;){if(y.x>=f&&y.x<=x&&y.y>=p&&y.y<=g&&y!==i&&y!==o&&ga(a,h,l,d,c,u,y.x,y.y)&&De(y.prev,y,y.next)>=0)return!1;y=y.nextZ}return!0}function W_(s,t){let e=s;do{let n=e.prev,i=e.next.next;!lo(n,i)&&wg(n,e,e.next,i)&&ja(n,i)&&ja(i,n)&&(t.push(n.i,e.i,i.i),tl(e),tl(e.next),e=s=i),e=e.next}while(e!==s);return qs(e)}function X_(s,t,e,n,i,r){let o=s;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&tv(o,a)){let l=Tg(o,a);o=qs(o,o.next),l=qs(l,l.next),Qa(o,t,e,n,i,r,0),Qa(l,t,e,n,i,r,0);return}a=a.next}o=o.next}while(o!==s)}function q_(s,t,e,n){let i=[];for(let r=0,o=t.length;r<o;r++){let a=t[r]*n,l=r<o-1?t[r+1]*n:s.length,c=Sg(s,a,l,n,!1);c===c.next&&(c.steiner=!0),i.push(j_(c))}i.sort(Y_);for(let r=0;r<i.length;r++)e=$_(i[r],e);return e}function Y_(s,t){let e=s.x-t.x;if(e===0&&(e=s.y-t.y,e===0)){let n=(s.next.y-s.y)/(s.next.x-s.x),i=(t.next.y-t.y)/(t.next.x-t.x);e=n-i}return e}function $_(s,t){let e=Z_(s,t);if(!e)return t;let n=Tg(e,s);return qs(n,n.next),qs(e,e.next)}function Z_(s,t){let e=t,n=s.x,i=s.y,r=-1/0,o;if(lo(s,e))return e;do{if(lo(s,e.next))return e.next;if(i<=e.y&&i>=e.next.y&&e.next.y!==e.y){let d=e.x+(i-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(d<=n&&d>r&&(r=d,o=e.x<e.next.x?e:e.next,d===n))return o}e=e.next}while(e!==t);if(!o)return null;let a=o,l=o.x,c=o.y,h=1/0;e=o;do{if(n>=e.x&&e.x>=l&&n!==e.x&&bg(i<c?n:r,i,l,c,i<c?r:n,i,e.x,e.y)){let d=Math.abs(i-e.y)/(n-e.x);ja(e,s)&&(d<h||d===h&&(e.x>o.x||e.x===o.x&&J_(o,e)))&&(o=e,h=d)}e=e.next}while(e!==a);return o}function J_(s,t){return De(s.prev,s,t.prev)<0&&De(t.next,s,s.next)<0}function K_(s,t,e,n){let i=s;do i.z===0&&(i.z=uf(i.x,i.y,t,e,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==s);i.prevZ.nextZ=null,i.prevZ=null,Q_(i)}function Q_(s){let t,e=1;do{let n=s,i;s=null;let r=null;for(t=0;n;){t++;let o=n,a=0;for(let c=0;c<e&&(a++,o=o.nextZ,!!o);c++);let l=e;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(i=n,n=n.nextZ,a--):(i=o,o=o.nextZ,l--),r?r.nextZ=i:s=i,i.prevZ=r,r=i;n=o}r.nextZ=null,e*=2}while(t>1);return s}function uf(s,t,e,n,i){return s=(s-e)*i|0,t=(t-n)*i|0,s=(s|s<<8)&16711935,s=(s|s<<4)&252645135,s=(s|s<<2)&858993459,s=(s|s<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,s|t<<1}function j_(s){let t=s,e=s;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==s);return e}function bg(s,t,e,n,i,r,o,a){return(i-o)*(t-a)>=(s-o)*(r-a)&&(s-o)*(n-a)>=(e-o)*(t-a)&&(e-o)*(r-a)>=(i-o)*(n-a)}function ga(s,t,e,n,i,r,o,a){return!(s===o&&t===a)&&bg(s,t,e,n,i,r,o,a)}function tv(s,t){return s.next.i!==t.i&&s.prev.i!==t.i&&!ev(s,t)&&(ja(s,t)&&ja(t,s)&&nv(s,t)&&(De(s.prev,s,t.prev)||De(s,t.prev,t))||lo(s,t)&&De(s.prev,s,s.next)>0&&De(t.prev,t,t.next)>0)}function De(s,t,e){return(t.y-s.y)*(e.x-t.x)-(t.x-s.x)*(e.y-t.y)}function lo(s,t){return s.x===t.x&&s.y===t.y}function wg(s,t,e,n){let i=vh(De(s,t,e)),r=vh(De(s,t,n)),o=vh(De(e,n,s)),a=vh(De(e,n,t));return!!(i!==r&&o!==a||i===0&&_h(s,e,t)||r===0&&_h(s,n,t)||o===0&&_h(e,s,n)||a===0&&_h(e,t,n))}function _h(s,t,e){return t.x<=Math.max(s.x,e.x)&&t.x>=Math.min(s.x,e.x)&&t.y<=Math.max(s.y,e.y)&&t.y>=Math.min(s.y,e.y)}function vh(s){return s>0?1:s<0?-1:0}function ev(s,t){let e=s;do{if(e.i!==s.i&&e.next.i!==s.i&&e.i!==t.i&&e.next.i!==t.i&&wg(e,e.next,s,t))return!0;e=e.next}while(e!==s);return!1}function ja(s,t){return De(s.prev,s,s.next)<0?De(s,t,s.next)>=0&&De(s,s.prev,t)>=0:De(s,t,s.prev)<0||De(s,s.next,t)<0}function nv(s,t){let e=s,n=!1,i=(s.x+t.x)/2,r=(s.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&i<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==s);return n}function Tg(s,t){let e=df(s.i,s.x,s.y),n=df(t.i,t.x,t.y),i=s.next,r=t.prev;return s.next=t,t.prev=s,e.next=i,i.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function qm(s,t,e,n){let i=df(s,t,e);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function tl(s){s.next.prev=s.prev,s.prev.next=s.next,s.prevZ&&(s.prevZ.nextZ=s.nextZ),s.nextZ&&(s.nextZ.prevZ=s.prevZ)}function df(s,t,e){return{i:s,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function iv(s,t,e,n){let i=0;for(let r=t,o=e-n;r<e;r+=n)i+=(s[o]-s[r])*(s[r+1]+s[o+1]),o=r;return i}function Ym(s){let t=s.length;t>2&&s[t-1].equals(s[0])&&s.pop()}function $m(s,t){for(let e=0;e<t.length;e++)s.push(t[e].x),s.push(t[e].y)}function rv(s,t,e){if(e.shapes=[],Array.isArray(s))for(let n=0,i=s.length;n<i;n++){let r=s[n];e.shapes.push(r.uuid)}else e.shapes.push(s.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}function ov(s,t){if(t.shapes=[],Array.isArray(s))for(let e=0,n=s.length;e<n;e++){let i=s[e];t.shapes.push(i.uuid)}else t.shapes.push(s.uuid);return t}function Zm(s,t,e){let n=`${s.x},${s.y},${s.z}-${t.x},${t.y},${t.z}`,i=`${t.x},${t.y},${t.z}-${s.x},${s.y},${s.z}`;return e.has(n)===!0||e.has(i)===!0?!1:(e.add(n),e.add(i),!0)}function ar(s){let t={};for(let e in s){t[e]={};for(let n in s[e]){let i=s[e][n];if(Km(i))i.isRenderTargetTexture?(Bt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone();else if(Array.isArray(i))if(Km(i[0])){let r=[];for(let o=0,a=i.length;o<a;o++)r[o]=i[o].clone();t[e][n]=r}else t[e][n]=i.slice();else t[e][n]=i}}return t}function gn(s){let t={};for(let e=0;e<s.length;e++){let n=ar(s[e]);for(let i in n)t[i]=n[i]}return t}function Km(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function av(s){let t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function ap(s){let t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:he.workingColorSpace}function jn(s,t){return!s||s.constructor===t?s:typeof t.BYTES_PER_ELEMENT=="number"?new t(s):Array.prototype.slice.call(s)}function Sa(s){return s!==void 0&&s.inTangents!==void 0&&s.outTangents!==void 0}function Ag(s){function t(i,r){return s[i]-s[r]}let e=s.length,n=new Array(e);for(let i=0;i!==e;++i)n[i]=i;return n.sort(t),n}function pf(s,t,e){let n=s.length,i=new s.constructor(n);for(let r=0,o=0;o!==n;++r){let a=e[r]*t;for(let l=0;l!==t;++l)i[o++]=s[a+l]}return i}function Eg(s,t,e,n){let i=1,r=s[0];for(;r!==void 0&&r[n]===void 0;)r=s[i++];if(r===void 0)return;let o=r[n];if(o!==void 0)if(Array.isArray(o))do o=r[n],o!==void 0&&(t.push(r.time),e.push(...o)),r=s[i++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[n],o!==void 0&&(t.push(r.time),o.toArray(e,e.length)),r=s[i++];while(r!==void 0);else do o=r[n],o!==void 0&&(t.push(r.time),e.push(o)),r=s[i++];while(r!==void 0)}function hv(s,t,e,n,i=30){let r=s.clone();r.name=t;let o=[];for(let l=0;l<r.tracks.length;++l){let c=r.tracks[l],h=c.getValueSize(),d=[],u=[];for(let f=0;f<c.times.length;++f){let p=c.times[f]*i;if(!(p<e||p>=n)){d.push(c.times[f]);for(let x=0;x<h;++x)u.push(c.values[f*h+x])}}d.length!==0&&(c.times=jn(d,c.times.constructor),c.values=jn(u,c.values.constructor),o.push(c))}r.tracks=o;let a=1/0;for(let l=0;l<r.tracks.length;++l)a>r.tracks[l].times[0]&&(a=r.tracks[l].times[0]);for(let l=0;l<r.tracks.length;++l)r.tracks[l].shift(-1*a);return r.resetDuration(),r}function uv(s,t=0,e=s,n=30){n<=0&&(n=30);let i=e.tracks.length,r=t/n;for(let o=0;o<i;++o){let a=e.tracks[o],l=a.ValueTypeName;if(l==="bool"||l==="string")continue;let c=s.tracks.find(function(m){return m.name===a.name&&m.ValueTypeName===l});if(c===void 0)continue;let h=0,d=a.getValueSize();a.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(h=d/3);let u=0,f=c.getValueSize();c.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(u=f/3);let p=a.times.length-1,x;if(r<=a.times[0]){let m=h,M=d-h;x=a.values.slice(m,M)}else if(r>=a.times[p]){let m=p*d+h,M=m+d-h;x=a.values.slice(m,M)}else{let m=a.createInterpolant(),M=h,w=d-h;m.evaluate(r),x=m.resultBuffer.slice(M,w)}l==="quaternion"&&new tn().fromArray(x).normalize().conjugate().toArray(x);let g=c.times.length;for(let m=0;m<g;++m){let M=m*f+u;if(l==="quaternion")tn.multiplyQuaternionsFlat(c.values,M,x,0,c.values,M);else{let w=f-u*2;for(let y=0;y<w;++y)c.values[M+y]-=x[y]}}}return s.blendMode=Ju,s}function Cg(s,t,e,n,i){let r=1-s;return r*r*r*t+3*r*r*s*e+3*r*s*s*n+s*s*s*i}function dv(s,t,e,n,i){let r=1-s;return 3*r*r*(e-t)+6*r*s*(n-e)+3*s*s*(i-n)}function fv(s,t,e,n,i){let r=(s-t)/(i-t);for(let o=0;o<8;o++){let a=Cg(r,t,e,n,i)-s;if(Math.abs(a)<1e-10)break;let l=dv(r,t,e,n,i);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}function Qm(s,t){for(let e=0,n=s.length;e!==n;e+=2)s[e]*=t}function pv(s){switch(s.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Zs;case"vector":case"vector2":case"vector3":case"vector4":return go;case"color":return mo;case"quaternion":return Js;case"bool":case"boolean":return mi;case"string":return gi}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+s)}function mv(s){if(s.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let t=pv(s.type);if(s.times===void 0){let n=[],i=[];Eg(s.keys,n,i,"value"),s.times=n,s.values=i}let e;return t.parse!==void 0?e=t.parse(s):e=new t(s.name,s.times,s.values,s.interpolation),Sa(s.settings)&&(e.settings={inTangents:jn(s.settings.inTangents,Float32Array),outTangents:jn(s.settings.outTangents,Float32Array)}),e}function jm(s){try{let t=s.slice(s.indexOf(":")+1);return new URL(t).protocol==="blob:"}catch{return!1}}function xv(){this._document.hidden===!1&&this.reset()}function u0(s,t){return s.distance-t.distance}function yf(s,t,e,n){let i=!0;if(s.layers.test(t.layers)&&s.raycast(t,e)===!1&&(i=!1),i===!0&&n===!0){let r=s.children;for(let o=0,a=r.length;o<a;o++)yf(r[o],t,e,!0)}}function Rg(s){let t=[];s.isBone===!0&&t.push(s);for(let e=0;e<s.children.length;e++)t.push(...Rg(s.children[e]));return t}function We(s,t,e,n,i,r,o){Ah.set(i,r,o).unproject(n);let a=t[s];if(a!==void 0){let l=e.getAttribute("position");for(let c=0,h=a.length;c<h;c++)l.setXYZ(a[c],Ah.x,Ah.y,Ah.z)}}function Dv(s,t){let e=s.image&&s.image.width?s.image.width/s.image.height:1;return e>t?(s.repeat.x=1,s.repeat.y=e/t,s.offset.x=0,s.offset.y=(1-s.repeat.y)/2):(s.repeat.x=t/e,s.repeat.y=1,s.offset.x=(1-s.repeat.x)/2,s.offset.y=0),s}function Nv(s,t){let e=s.image&&s.image.width?s.image.width/s.image.height:1;return e>t?(s.repeat.x=t/e,s.repeat.y=1,s.offset.x=(1-s.repeat.x)/2,s.offset.y=0):(s.repeat.x=1,s.repeat.y=e/t,s.offset.x=0,s.offset.y=(1-s.repeat.y)/2),s}function Uv(s){return s.repeat.x=1,s.repeat.y=1,s.offset.x=0,s.offset.y=0,s}function Qu(s,t,e,n){let i=Fv(n);switch(e){case $u:return s*t;case Vl:return s*t/i.components*i.byteLength;case Lo:return s*t/i.components*i.byteLength;case Hi:return s*t*2/i.components*i.byteLength;case Gl:return s*t*2/i.components*i.byteLength;case Zu:return s*t*3/i.components*i.byteLength;case mn:return s*t*4/i.components*i.byteLength;case Hl:return s*t*4/i.components*i.byteLength;case Do:case No:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Uo:case Fo:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Xl:case Yl:return Math.max(s,16)*Math.max(t,8)/4;case Wl:case ql:return Math.max(s,8)*Math.max(t,8)/2;case $l:case Zl:case Kl:case Ql:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Jl:case Oo:case jl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case tc:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case ec:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case nc:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case ic:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case sc:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case rc:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case oc:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case ac:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case lc:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case cc:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case hc:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case uc:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case dc:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case fc:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case pc:case mc:case gc:return Math.ceil(s/4)*Math.ceil(t/4)*16;case xc:case _c:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Bo:case vc:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Fv(s){switch(s){case wn:case Wu:return{byteLength:1,components:1};case rr:case Xu:case sn:return{byteLength:2,components:1};case zl:case kl:return{byteLength:2,components:4};case On:case Bl:case pn:return{byteLength:4,components:1};case qu:case Yu:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${s}.`)}var Mf,y0,M0,Sf,Bu,bf,S0,b0,Mo,wf,er,ki,nn,ri,Fn,nr,fs,zu,ku,Tf,w0,ps,Af,Ef,Cf,Rf,Pf,If,Lf,Df,Vu,Gu,Nf,Uf,Ff,Of,Bf,zf,kf,Vf,Gf,ba,wa,Ta,Ns,Aa,Ea,Ca,Ra,So,Hf,Wf,Zn,bo,wo,To,ms,Ao,Eo,Co,Rh,Xf,Ol,oi,Vi,Ro,Po,ir,kr,Mn,Vr,ze,Hu,T0,sr,A0,Ce,Io,E0,ai,C0,wn,Wu,Xu,rr,Bl,On,pn,sn,zl,kl,or,qu,Yu,$u,Zu,mn,ni,Gi,Vl,Lo,Hi,Gl,R0,Hl,Do,No,Uo,Fo,Wl,Xl,ql,Yl,$l,Zl,Jl,Kl,Ql,Oo,jl,tc,ec,nc,ic,sc,rc,oc,ac,lc,cc,hc,uc,dc,fc,pc,mc,gc,xc,_c,Bo,vc,qf,Yf,$f,Gr,Pa,xa,Ph,ns,is,Hr,yc,Ju,P0,I0,L0,Zf,D0,N0,U0,_i,Jf,vi,Ze,Wr,Xr,_e,F0,O0,B0,z0,_a,k0,V0,G0,H0,W0,X0,q0,Y0,$0,Z0,J0,K0,Q0,Kf,Qf,jf,tp,Mc,ep,np,Sc,ip,bc,j0,tg,eg,ng,ig,sg,rg,og,ag,Ku,Cn,ss,lg,cg,hg,ug,dg,Gx,cm,rs,_g,Rn,un,hm,Ds,Us,vg,up,Mt,tn,dp,U,Ad,um,fp,oe,Ed,dm,fm,he,_r,Ia,o_,Xn,Ih,a_,Rd,ke,pp,be,$r,Ne,Fs,Lh,Os,Dh,Ou,re,vr,Jn,l_,c_,Ji,kc,In,pm,mm,Yn,Bs,h_,gm,yr,wi,Vc,ia,u_,d_,xm,_m,vm,ym,f_,Mr,Pd,me,Ii,p_,zs,yg,Ki,Gc,zt,dn,La,Da,Di,Kn,Ti,Ld,Ai,Sr,br,Mm,Dd,Nd,Ud,Fd,Od,Bd,ti,Je,Ei,Qn,Hc,wr,Tr,Ar,Qi,ji,Ms,sa,Wc,Xc,Ss,Pi,Nh,qe,qc,g_,pe,Uh,Fh,Oh,Bh,Zr,zh,Jr,kh,Xt,x_,ra,kd,Ye,__,Hn,Vd,Er,Ln,oa,je,se,ks,vn,os,Gd,v_,y_,Wn,M_,$e,Kr,Cr,aa,Rr,Pr,Ir,la,Mg,Yc,ca,$c,Sm,Hd,bm,Na,Jc,wm,Ua,Ci,Wd,Kc,Qc,Ni,Nn,Tm,bs,jc,Am,th,eh,nh,Xd,ih,Em,sh,ve,ha,Cm,Rm,b_,Pm,oh,qd,Im,Yd,Fa,Qr,Sn,Lm,w_,Oa,Ui,Lr,Dm,ah,Nm,T_,ua,da,Vs,ws,A_,lh,fi,Um,Ba,cf,An,R_,P_,I_,ch,Ts,fa,Fm,L_,Zd,fn,hh,za,en,Vh,Gh,Om,pa,uh,Jd,Bm,ii,zm,km,Un,ka,jr,Vm,hf,fh,ph,Gs,Va,Hh,Wh,Hs,Xh,qh,as,Ws,Yh,Fi,Ga,to,pi,Ha,Wa,eo,no,Oi,Xa,mh,gh,Kd,xh,qa,Pn,Xs,Ya,Hm,Wm,Qd,jd,tf,$a,io,Za,so,Ja,ro,oo,ao,$h,Ka,ls,cs,ff,qn,el,sv,nl,il,co,Ys,sl,rl,ho,ol,al,ll,cl,hl,Jm,ul,yi,lv,cv,Pe,hs,Bi,dl,fl,pl,ml,$s,uo,fo,gl,xl,Zh,zi,_l,po,vl,yl,bn,mi,mo,Zs,Ml,Js,gi,go,us,ei,xo,lp,ln,Ri,mf,$n,Jh,Kh,Dr,ds,Qh,jh,tu,si,Sl,ef,t0,e0,Ks,yh,Mh,ui,Qs,ts,n0,i0,Be,gf,bl,xf,js,xi,_f,wl,Tl,Al,_o,El,s0,Cl,vo,Rl,Pl,nf,eu,gv,r0,o0,sf,nu,Sh,yo,iu,a0,l0,Es,su,Nr,Ur,Il,Ll,tr,Cs,rf,_v,Rs,Ps,ru,Dl,Is,c0,vv,Ls,ou,au,Nl,cp,yv,hp,Mv,Sv,bv,wv,Tv,Av,Ev,vf,Se,lu,Ul,Cv,cu,hu,uu,Rv,du,fu,pu,h0,mu,gu,xu,_u,mp,vu,d0,Fl,f0,bh,Fr,Or,of,Pv,Iv,yu,p0,Mu,es,wh,af,Su,bu,Lv,m0,g0,wu,Tu,Au,x0,Th,_0,Eu,Ah,Oe,Cu,Eh,Ru,Pu,Iu,v0,Ch,lf,Lu,Du,Nu,Uu,Fu,gp=Le(()=>{Mf="186",y0={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},M0={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Sf=0,Bu=1,bf=2,S0=3,b0=0,Mo=1,wf=2,er=3,ki=0,nn=1,ri=2,Fn=0,nr=1,fs=2,zu=3,ku=4,Tf=5,w0=6,ps=100,Af=101,Ef=102,Cf=103,Rf=104,Pf=200,If=201,Lf=202,Df=203,Vu=204,Gu=205,Nf=206,Uf=207,Ff=208,Of=209,Bf=210,zf=211,kf=212,Vf=213,Gf=214,ba=0,wa=1,Ta=2,Ns=3,Aa=4,Ea=5,Ca=6,Ra=7,So=0,Hf=1,Wf=2,Zn=0,bo=1,wo=2,To=3,ms=4,Ao=5,Eo=6,Co=7,Rh="attached",Xf="detached",Ol=300,oi=301,Vi=302,Ro=303,Po=304,ir=306,kr=1e3,Mn=1001,Vr=1002,ze=1003,Hu=1004,T0=1004,sr=1005,A0=1005,Ce=1006,Io=1007,E0=1007,ai=1008,C0=1008,wn=1009,Wu=1010,Xu=1011,rr=1012,Bl=1013,On=1014,pn=1015,sn=1016,zl=1017,kl=1018,or=1020,qu=35902,Yu=35899,$u=1021,Zu=1022,mn=1023,ni=1026,Gi=1027,Vl=1028,Lo=1029,Hi=1030,Gl=1031,R0=1032,Hl=1033,Do=33776,No=33777,Uo=33778,Fo=33779,Wl=35840,Xl=35841,ql=35842,Yl=35843,$l=36196,Zl=37492,Jl=37496,Kl=37488,Ql=37489,Oo=37490,jl=37491,tc=37808,ec=37809,nc=37810,ic=37811,sc=37812,rc=37813,oc=37814,ac=37815,lc=37816,cc=37817,hc=37818,uc=37819,dc=37820,fc=37821,pc=36492,mc=36494,gc=36495,xc=36283,_c=36284,Bo=36285,vc=36286,qf=2200,Yf=2201,$f=2202,Gr=2300,Pa=2301,xa=2302,Ph=2303,ns=2400,is=2401,Hr=2402,yc=2500,Ju=2501,P0=0,I0=1,L0=2,Zf=3200,D0=3201,N0=3202,U0=3203,_i=0,Jf=1,vi="",Ze="srgb",Wr="srgb-linear",Xr="linear",_e="srgb",F0="",O0="rg",B0="ga",z0=0,_a=7680,k0=7681,V0=7682,G0=7683,H0=34055,W0=34056,X0=5386,q0=512,Y0=513,$0=514,Z0=515,J0=516,K0=517,Q0=518,Kf=519,Qf=512,jf=513,tp=514,Mc=515,ep=516,np=517,Sc=518,ip=519,bc=35044,j0=35048,tg=35040,eg=35045,ng=35049,ig=35041,sg=35046,rg=35050,og=35042,ag="100",Ku="300 es",Cn=2e3,ss=2001,lg={COMPUTE:"compute",RENDER:"render"},cg={PERSPECTIVE:"perspective",LINEAR:"linear",FLAT:"flat"},hg={NORMAL:"normal",CENTROID:"centroid",SAMPLE:"sample",FIRST:"first",EITHER:"either"},ug={TEXTURE_COMPARE:"depthTextureCompare"},dg={NONE:0,SHARED:1,FULL:2};Gx={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};cm={},rs=null;_g={[ba]:wa,[Ta]:Ca,[Aa]:Ra,[Ns]:Ea,[wa]:ba,[Ca]:Ta,[Ra]:Aa,[Ea]:Ns},Rn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let i=n[t];if(i!==void 0){let r=i.indexOf(e);r!==-1&&i.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,t);t.target=null}}},un=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],hm=1234567,Ds=Math.PI/180,Us=180/Math.PI;vg={DEG2RAD:Ds,RAD2DEG:Us,generateUUID:Dn,clamp:ie,euclideanModulo:rp,mapLinear:Hx,inverseLerp:Wx,lerp:va,damp:Xx,pingpong:qx,smoothstep:Yx,smootherstep:$x,randInt:Zx,randFloat:Jx,randFloatSpread:Kx,seededRandom:Qx,degToRad:jx,radToDeg:t_,isPowerOfTwo:e_,ceilPowerOfTwo:n_,floorPowerOfTwo:i_,setQuaternionFromProperEuler:s_,normalize:ae,denormalize:yn},up=class up{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=ie(this.x,t.x,e.x),this.y=ie(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=ie(this.x,t,e),this.y=ie(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ie(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(ie(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),i=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*i+t.x,this.y=r*i+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};up.prototype.isVector2=!0;Mt=up,tn=class{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,r,o,a){let l=n[i+0],c=n[i+1],h=n[i+2],d=n[i+3],u=r[o+0],f=r[o+1],p=r[o+2],x=r[o+3];if(d!==x||l!==u||c!==f||h!==p){let g=l*u+c*f+h*p+d*x;g<0&&(u=-u,f=-f,p=-p,x=-x,g=-g);let m=1-a;if(g<.9995){let M=Math.acos(g),w=Math.sin(M);m=Math.sin(m*M)/w,a=Math.sin(a*M)/w,l=l*m+u*a,c=c*m+f*a,h=h*m+p*a,d=d*m+x*a}else{l=l*m+u*a,c=c*m+f*a,h=h*m+p*a,d=d*m+x*a;let M=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=M,c*=M,h*=M,d*=M}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,r,o){let a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],d=r[o],u=r[o+1],f=r[o+2],p=r[o+3];return t[e]=a*p+h*d+l*f-c*u,t[e+1]=l*p+h*u+c*d-a*f,t[e+2]=c*p+h*f+a*u-l*d,t[e+3]=h*p-a*d-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,i=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),d=a(r/2),u=l(n/2),f=l(i/2),p=l(r/2);switch(o){case"XYZ":this._x=u*h*d+c*f*p,this._y=c*f*d-u*h*p,this._z=c*h*p+u*f*d,this._w=c*h*d-u*f*p;break;case"YXZ":this._x=u*h*d+c*f*p,this._y=c*f*d-u*h*p,this._z=c*h*p-u*f*d,this._w=c*h*d+u*f*p;break;case"ZXY":this._x=u*h*d-c*f*p,this._y=c*f*d+u*h*p,this._z=c*h*p+u*f*d,this._w=c*h*d-u*f*p;break;case"ZYX":this._x=u*h*d-c*f*p,this._y=c*f*d+u*h*p,this._z=c*h*p-u*f*d,this._w=c*h*d+u*f*p;break;case"YZX":this._x=u*h*d+c*f*p,this._y=c*f*d+u*h*p,this._z=c*h*p-u*f*d,this._w=c*h*d-u*f*p;break;case"XZY":this._x=u*h*d-c*f*p,this._y=c*f*d-u*h*p,this._z=c*h*p+u*f*d,this._w=c*h*d+u*f*p;break;default:Bt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],i=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-i)*f}else if(n>a&&n>d){let f=2*Math.sqrt(1+n-a-d);this._w=(h-l)/f,this._x=.25*f,this._y=(i+o)/f,this._z=(r+c)/f}else if(a>d){let f=2*Math.sqrt(1+a-n-d);this._w=(r-c)/f,this._x=(i+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+d-n-a);this._w=(o-i)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ie(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,i=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+i*c-r*l,this._y=i*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-i*a,this._w=o*h-n*a-i*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,i=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,i=-i,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+i*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+i*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},dp=class dp{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(um.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(um.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*i,this.y=r[1]*e+r[4]*n+r[7]*i,this.z=r[2]*e+r[5]*n+r[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,i=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,i=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*i-a*n),h=2*(a*e-r*i),d=2*(r*n-o*e);return this.x=e+l*c+o*d-a*h,this.y=n+l*h+a*c-r*d,this.z=i+l*d+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i,this.y=r[1]*e+r[5]*n+r[9]*i,this.z=r[2]*e+r[6]*n+r[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=ie(this.x,t.x,e.x),this.y=ie(this.y,t.y,e.y),this.z=ie(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=ie(this.x,t,e),this.y=ie(this.y,t,e),this.z=ie(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ie(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,i=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=i*l-r*a,this.y=r*o-n*l,this.z=n*a-i*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Ad.copy(this).projectOnVector(t),this.sub(Ad)}reflect(t){return this.sub(Ad.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(ie(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};dp.prototype.isVector3=!0;U=dp,Ad=new U,um=new tn,fp=class fp{constructor(t,e,n,i,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,o,a,l,c)}set(t,e,n,i,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=i,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,i=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],p=n[8],x=i[0],g=i[3],m=i[6],M=i[1],w=i[4],y=i[7],S=i[2],b=i[5],R=i[8];return r[0]=o*x+a*M+l*S,r[3]=o*g+a*w+l*b,r[6]=o*m+a*y+l*R,r[1]=c*x+h*M+d*S,r[4]=c*g+h*w+d*b,r[7]=c*m+h*y+d*R,r[2]=u*x+f*M+p*S,r[5]=u*g+f*w+p*b,r[8]=u*m+f*y+p*R,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+i*r*c-i*o*l}invert(){let t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=h*o-a*c,u=a*l-h*r,f=c*r-o*l,p=e*d+n*u+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let x=1/p;return t[0]=d*x,t[1]=(i*c-h*n)*x,t[2]=(a*n-i*o)*x,t[3]=u*x,t[4]=(h*e-i*l)*x,t[5]=(i*r-a*e)*x,t[6]=f*x,t[7]=(n*l-c*e)*x,t[8]=(o*e-n*r)*x,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-i*c,i*l,-i*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return di("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Ed.makeScale(t,e)),this}rotate(t){return di("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Ed.makeRotation(-t)),this}translate(t,e){return di("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Ed.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};fp.prototype.isMatrix3=!0;oe=fp,Ed=new oe,dm=new oe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),fm=new oe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);he=r_();Ia=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{_r===void 0&&(_r=qr("canvas")),_r.width=t.width,_r.height=t.height;let i=_r.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),n=_r}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=qr("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let i=n.getImageData(0,0,t.width,t.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=Li(r[o]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Li(e[n]/255)*255):e[n]=Li(e[n]);return{data:e,width:t.width,height:t.height}}else return Bt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},o_=0,Xn=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:o_++}),this.uuid=Dn(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(Cd(i[o].image)):r.push(Cd(i[o]))}else r=Cd(i);n.url=r}return e||(t.images[this.uuid]=n),n}};Ih=class extends Xn{constructor(t=null){di('Source: "Source" has been renamed to "TextureSource". Please update your code to use "THREE.TextureSource" instead.'),super(t),this.isSource=!0}},a_=0,Rd=new U,ke=class s extends Rn{constructor(t=s.DEFAULT_IMAGE,e=s.DEFAULT_MAPPING,n=Mn,i=Mn,r=Ce,o=ai,a=mn,l=wn,c=s.DEFAULT_ANISOTROPY,h=vi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:a_++}),this.uuid=Dn(),this.name="",this.source=new Xn(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Mt(0,0),this.repeat=new Mt(1,1),this.center=new Mt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new oe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Rd).x}get height(){return this.source.getSize(Rd).y}get depth(){return this.source.getSize(Rd).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Bt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let i=this[e];if(i===void 0){Bt(`Texture.setValues(): property '${e}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Ol)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case kr:t.x=t.x-Math.floor(t.x);break;case Mn:t.x=t.x<0?0:1;break;case Vr:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case kr:t.y=t.y-Math.floor(t.y);break;case Mn:t.y=t.y<0?0:1;break;case Vr:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};ke.DEFAULT_IMAGE=null;ke.DEFAULT_MAPPING=Ol;ke.DEFAULT_ANISOTROPY=1;pp=class pp{constructor(t=0,e=0,n=0,i=1){this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,i=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*i+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*i+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*i+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*i+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,r,l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],p=l[9],x=l[2],g=l[6],m=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-x)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+x)<.1&&Math.abs(p+g)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let w=(c+1)/2,y=(f+1)/2,S=(m+1)/2,b=(h+u)/4,R=(d+x)/4,v=(p+g)/4;return w>y&&w>S?w<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(w),i=b/n,r=R/n):y>S?y<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(y),n=b/i,r=v/i):S<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(S),n=R/r,i=v/r),this.set(n,i,r,e),this}let M=Math.sqrt((g-p)*(g-p)+(d-x)*(d-x)+(u-h)*(u-h));return Math.abs(M)<.001&&(M=1),this.x=(g-p)/M,this.y=(d-x)/M,this.z=(u-h)/M,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=ie(this.x,t.x,e.x),this.y=ie(this.y,t.y,e.y),this.z=ie(this.z,t.z,e.z),this.w=ie(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=ie(this.x,t,e),this.y=ie(this.y,t,e),this.z=ie(this.z,t,e),this.w=ie(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ie(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};pp.prototype.isVector4=!0;be=pp,$r=class extends Rn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ce,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new be(0,0,t,e),this.scissorTest=!1,this.viewport=new be(0,0,t,e),this.textures=[];let i={width:t,height:e,depth:n.depth},r=new ke(i),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Ce,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let i=Object.assign({},t.textures[e].image);this.textures[e].source=new Xn(i)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ne=class extends $r{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Fs=class extends ke{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=ze,this.minFilter=ze,this.wrapR=Mn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}},Lh=class extends Ne{constructor(t=1,e=1,n=1,i={}){super(t,e,i),this.isWebGLArrayRenderTarget=!0,this.depth=n,this.texture=new Fs(null,t,e,n),this._setTextureOptions(i),this.texture.isRenderTargetTexture=!0}},Os=class extends ke{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=ze,this.minFilter=ze,this.wrapR=Mn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}},Dh=class extends Ne{constructor(t=1,e=1,n=1,i={}){super(t,e,i),this.isWebGL3DRenderTarget=!0,this.depth=n,this.texture=new Os(null,t,e,n),this._setTextureOptions(i),this.texture.isRenderTargetTexture=!0}},Ou=class Ou{constructor(t,e,n,i,r,o,a,l,c,h,d,u,f,p,x,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,o,a,l,c,h,d,u,f,p,x,g)}set(t,e,n,i,r,o,a,l,c,h,d,u,f,p,x,g){let m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=i,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=d,m[14]=u,m[3]=f,m[7]=p,m[11]=x,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ou().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,i=1/vr.setFromMatrixColumn(t,0).length(),r=1/vr.setFromMatrixColumn(t,1).length(),o=1/vr.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,i=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){let u=o*h,f=o*d,p=a*h,x=a*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=f+p*c,e[5]=u-x*c,e[9]=-a*l,e[2]=x-u*c,e[6]=p+f*c,e[10]=o*l}else if(t.order==="YXZ"){let u=l*h,f=l*d,p=c*h,x=c*d;e[0]=u+x*a,e[4]=p*a-f,e[8]=o*c,e[1]=o*d,e[5]=o*h,e[9]=-a,e[2]=f*a-p,e[6]=x+u*a,e[10]=o*l}else if(t.order==="ZXY"){let u=l*h,f=l*d,p=c*h,x=c*d;e[0]=u-x*a,e[4]=-o*d,e[8]=p+f*a,e[1]=f+p*a,e[5]=o*h,e[9]=x-u*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let u=o*h,f=o*d,p=a*h,x=a*d;e[0]=l*h,e[4]=p*c-f,e[8]=u*c+x,e[1]=l*d,e[5]=x*c+u,e[9]=f*c-p,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let u=o*l,f=o*c,p=a*l,x=a*c;e[0]=l*h,e[4]=x-u*d,e[8]=p*d+f,e[1]=d,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*d+p,e[10]=u-x*d}else if(t.order==="XZY"){let u=o*l,f=o*c,p=a*l,x=a*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+x,e[5]=o*h,e[9]=f*d-p,e[2]=p*d-f,e[6]=a*h,e[10]=x*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(l_,t,c_)}lookAt(t,e,n){let i=this.elements;return In.subVectors(t,e),In.lengthSq()===0&&(In.z=1),In.normalize(),Ji.crossVectors(n,In),Ji.lengthSq()===0&&(Math.abs(n.z)===1?In.x+=1e-4:In.z+=1e-4,In.normalize(),Ji.crossVectors(n,In)),Ji.normalize(),kc.crossVectors(In,Ji),i[0]=Ji.x,i[4]=kc.x,i[8]=In.x,i[1]=Ji.y,i[5]=kc.y,i[9]=In.y,i[2]=Ji.z,i[6]=kc.z,i[10]=In.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,i=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],p=n[2],x=n[6],g=n[10],m=n[14],M=n[3],w=n[7],y=n[11],S=n[15],b=i[0],R=i[4],v=i[8],C=i[12],I=i[1],z=i[5],N=i[9],O=i[13],G=i[2],Y=i[6],J=i[10],rt=i[14],K=i[3],Q=i[7],et=i[11],ot=i[15];return r[0]=o*b+a*I+l*G+c*K,r[4]=o*R+a*z+l*Y+c*Q,r[8]=o*v+a*N+l*J+c*et,r[12]=o*C+a*O+l*rt+c*ot,r[1]=h*b+d*I+u*G+f*K,r[5]=h*R+d*z+u*Y+f*Q,r[9]=h*v+d*N+u*J+f*et,r[13]=h*C+d*O+u*rt+f*ot,r[2]=p*b+x*I+g*G+m*K,r[6]=p*R+x*z+g*Y+m*Q,r[10]=p*v+x*N+g*J+m*et,r[14]=p*C+x*O+g*rt+m*ot,r[3]=M*b+w*I+y*G+S*K,r[7]=M*R+w*z+y*Y+S*Q,r[11]=M*v+w*N+y*J+S*et,r[15]=M*C+w*O+y*rt+S*ot,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],i=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],f=t[14],p=t[3],x=t[7],g=t[11],m=t[15],M=l*f-c*u,w=a*f-c*d,y=a*u-l*d,S=o*f-c*h,b=o*u-l*h,R=o*d-a*h;return e*(x*M-g*w+m*y)-n*(p*M-g*S+m*b)+i*(p*w-x*S+m*R)-r*(p*y-x*b+g*R)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],i=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-n*(r*h-a*l)+i*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],f=t[11],p=t[12],x=t[13],g=t[14],m=t[15],M=e*a-n*o,w=e*l-i*o,y=e*c-r*o,S=n*l-i*a,b=n*c-r*a,R=i*c-r*l,v=h*x-d*p,C=h*g-u*p,I=h*m-f*p,z=d*g-u*x,N=d*m-f*x,O=u*m-f*g,G=M*O-w*N+y*z+S*I-b*C+R*v;if(G===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let Y=1/G;return t[0]=(a*O-l*N+c*z)*Y,t[1]=(i*N-n*O-r*z)*Y,t[2]=(x*R-g*b+m*S)*Y,t[3]=(u*b-d*R-f*S)*Y,t[4]=(l*I-o*O-c*C)*Y,t[5]=(e*O-i*I+r*C)*Y,t[6]=(g*y-p*R-m*w)*Y,t[7]=(h*R-u*y+f*w)*Y,t[8]=(o*N-a*I+c*v)*Y,t[9]=(n*I-e*N-r*v)*Y,t[10]=(p*b-x*y+m*M)*Y,t[11]=(d*y-h*b-f*M)*Y,t[12]=(a*C-o*z-l*v)*Y,t[13]=(e*z-n*C+i*v)*Y,t[14]=(x*w-p*S-g*M)*Y,t[15]=(h*S-d*w+u*M)*Y,this}scale(t){let e=this.elements,n=t.x,i=t.y,r=t.z;return e[0]*=n,e[4]*=i,e[8]*=r,e[1]*=n,e[5]*=i,e[9]*=r,e[2]*=n,e[6]*=i,e[10]*=r,e[3]*=n,e[7]*=i,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),i=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*o,0,c*l-i*a,h*l+i*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,r,o){return this.set(1,n,r,0,t,1,o,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){let i=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,d=a+a,u=r*c,f=r*h,p=r*d,x=o*h,g=o*d,m=a*d,M=l*c,w=l*h,y=l*d,S=n.x,b=n.y,R=n.z;return i[0]=(1-(x+m))*S,i[1]=(f+y)*S,i[2]=(p-w)*S,i[3]=0,i[4]=(f-y)*b,i[5]=(1-(u+m))*b,i[6]=(g+M)*b,i[7]=0,i[8]=(p+w)*R,i[9]=(g-M)*R,i[10]=(1-(u+x))*R,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){let i=this.elements;t.x=i[12],t.y=i[13],t.z=i[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=vr.set(i[0],i[1],i[2]).length(),a=vr.set(i[4],i[5],i[6]).length(),l=vr.set(i[8],i[9],i[10]).length();r<0&&(o=-o),Jn.copy(this);let c=1/o,h=1/a,d=1/l;return Jn.elements[0]*=c,Jn.elements[1]*=c,Jn.elements[2]*=c,Jn.elements[4]*=h,Jn.elements[5]*=h,Jn.elements[6]*=h,Jn.elements[8]*=d,Jn.elements[9]*=d,Jn.elements[10]*=d,e.setFromRotationMatrix(Jn),n.x=o,n.y=a,n.z=l,this}makePerspective(t,e,n,i,r,o,a=Cn,l=!1){let c=this.elements,h=2*r/(e-t),d=2*r/(n-i),u=(e+t)/(e-t),f=(n+i)/(n-i),p,x;if(l)p=r/(o-r),x=o*r/(o-r);else if(a===Cn)p=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===ss)p=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,i,r,o,a=Cn,l=!1){let c=this.elements,h=2/(e-t),d=2/(n-i),u=-(e+t)/(e-t),f=-(n+i)/(n-i),p,x;if(l)p=1/(o-r),x=o/(o-r);else if(a===Cn)p=-2/(o-r),x=-(o+r)/(o-r);else if(a===ss)p=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};Ou.prototype.isMatrix4=!0;re=Ou,vr=new U,Jn=new re,l_=new U(0,0,0),c_=new U(1,1,1),Ji=new U,kc=new U,In=new U,pm=new re,mm=new tn,Yn=class s{constructor(t=0,e=0,n=0,i=s.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let i=t.elements,r=i[0],o=i[4],a=i[8],l=i[1],c=i[5],h=i[9],d=i[2],u=i[6],f=i[10];switch(e){case"XYZ":this._y=Math.asin(ie(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ie(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(ie(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-ie(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(ie(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-ie(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Bt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return pm.makeRotationFromQuaternion(t),this.setFromRotationMatrix(pm,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return mm.setFromEuler(this),this.setFromQuaternion(mm,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Yn.DEFAULT_ORDER="XYZ";Bs=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},h_=0,gm=new U,yr=new tn,wi=new re,Vc=new U,ia=new U,u_=new U,d_=new tn,xm=new U(1,0,0),_m=new U(0,1,0),vm=new U(0,0,1),ym={type:"added"},f_={type:"removed"},Mr={type:"childadded",child:null},Pd={type:"childremoved",child:null},me=class s extends Rn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:h_++}),this.uuid=Dn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=s.DEFAULT_UP.clone();let t=new U,e=new Yn,n=new tn,i=new U(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new re},normalMatrix:{value:new oe}}),this.matrix=new re,this.matrixWorld=new re,this.matrixAutoUpdate=s.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=s.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Bs,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return yr.setFromAxisAngle(t,e),this.quaternion.multiply(yr),this}rotateOnWorldAxis(t,e){return yr.setFromAxisAngle(t,e),this.quaternion.premultiply(yr),this}rotateX(t){return this.rotateOnAxis(xm,t)}rotateY(t){return this.rotateOnAxis(_m,t)}rotateZ(t){return this.rotateOnAxis(vm,t)}translateOnAxis(t,e){return gm.copy(t).applyQuaternion(this.quaternion),this.position.add(gm.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(xm,t)}translateY(t){return this.translateOnAxis(_m,t)}translateZ(t){return this.translateOnAxis(vm,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(wi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Vc.copy(t):Vc.set(t,e,n);let i=this.parent;this.updateWorldMatrix(!0,!1),ia.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?wi.lookAt(ia,Vc,this.up):wi.lookAt(Vc,ia,this.up),this.quaternion.setFromRotationMatrix(wi),i&&(wi.extractRotation(i.matrixWorld),yr.setFromRotationMatrix(wi),this.quaternion.premultiply(yr.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Qt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(ym),Mr.child=t,this.dispatchEvent(Mr),Mr.child=null):Qt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(f_),Pd.child=t,this.dispatchEvent(Pd),Pd.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),wi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),wi.multiply(t.parent.matrixWorld)),t.applyMatrix4(wi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(ym),Mr.child=t,this.dispatchEvent(Mr),Mr.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ia,t,u_),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ia,d_,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,i=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*i,r[13]+=n-r[1]*e-r[5]*n-r[9]*i,r[14]+=i-r[2]*e-r[6]*n-r[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let i={};i.uuid=this.uuid,i.type=this.type,i.name=this.name,i.castShadow=this.castShadow,i.receiveShadow=this.receiveShadow,i.visible=this.visible,i.frustumCulled=this.frustumCulled,i.renderOrder=this.renderOrder,i.static=this.static,i.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null&&(i.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(i.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(t),i.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];r(t.shapes,d)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));i.material=a}else i.material=r(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];i.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),d=o(t.shapes),u=o(t.skeletons),f=o(t.animations),p=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=i,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let i=t.children[n];this.add(i.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};me.DEFAULT_UP=new U(0,1,0);me.DEFAULT_MATRIX_AUTO_UPDATE=!0;me.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;Ii=class extends me{constructor(){super(),this.isGroup=!0,this.type="Group"}},p_={type:"move"},zs=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ii,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ii,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ii,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let x of t.hand.values()){let g=e.getJointPose(x,n),m=this._getHandJoint(c,x);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,p=.005;c.inputState.pinching&&u>f+p?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-p&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(p_)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new Ii;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},yg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ki={h:0,s:0,l:0},Gc={h:0,s:0,l:0};zt=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ze){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,he.colorSpaceToWorking(this,e),this}setRGB(t,e,n,i=he.workingColorSpace){return this.r=t,this.g=e,this.b=n,he.colorSpaceToWorking(this,i),this}setHSL(t,e,n,i=he.workingColorSpace){if(t=rp(t,1),e=ie(e,0,1),n=ie(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=Id(o,r,t+1/3),this.g=Id(o,r,t),this.b=Id(o,r,t-1/3)}return he.colorSpaceToWorking(this,i),this}setStyle(t,e=Ze){function n(r){r!==void 0&&parseFloat(r)<1&&Bt("Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Bt("Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Bt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ze){let n=yg[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Bt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Li(t.r),this.g=Li(t.g),this.b=Li(t.b),this}copyLinearToSRGB(t){return this.r=zr(t.r),this.g=zr(t.g),this.b=zr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ze){return he.workingToColorSpace(dn.copy(this),t),Math.round(ie(dn.r*255,0,255))*65536+Math.round(ie(dn.g*255,0,255))*256+Math.round(ie(dn.b*255,0,255))}getHexString(t=Ze){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=he.workingColorSpace){he.workingToColorSpace(dn.copy(this),e);let n=dn.r,i=dn.g,r=dn.b,o=Math.max(n,i,r),a=Math.min(n,i,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let d=o-a;switch(c=h<=.5?d/(o+a):d/(2-o-a),o){case n:l=(i-r)/d+(i<r?6:0);break;case i:l=(r-n)/d+2;break;case r:l=(n-i)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=he.workingColorSpace){return he.workingToColorSpace(dn.copy(this),e),t.r=dn.r,t.g=dn.g,t.b=dn.b,t}getStyle(t=Ze){he.workingToColorSpace(dn.copy(this),t);let e=dn.r,n=dn.g,i=dn.b;return t!==Ze?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(Ki),this.setHSL(Ki.h+t,Ki.s+e,Ki.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Ki),t.getHSL(Gc);let n=va(Ki.h,Gc.h,e),i=va(Ki.s,Gc.s,e),r=va(Ki.l,Gc.l,e);return this.setHSL(n,i,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,i=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*i,this.g=r[1]*e+r[4]*n+r[7]*i,this.b=r[2]*e+r[5]*n+r[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},dn=new zt;zt.NAMES=yg;La=class s{constructor(t,e=25e-5){this.isFogExp2=!0,this.name="",this.color=new zt(t),this.density=e}clone(){return new s(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}},Da=class s{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new zt(t),this.near=e,this.far=n}clone(){return new s(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Di=class extends me{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Yn,this.environmentIntensity=1,this.environmentRotation=new Yn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Kn=new U,Ti=new U,Ld=new U,Ai=new U,Sr=new U,br=new U,Mm=new U,Dd=new U,Nd=new U,Ud=new U,Fd=new be,Od=new be,Bd=new be,ti=class s{constructor(t=new U,e=new U,n=new U){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),Kn.subVectors(t,e),i.cross(Kn);let r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(t,e,n,i,r){Kn.subVectors(i,e),Ti.subVectors(n,e),Ld.subVectors(t,e);let o=Kn.dot(Kn),a=Kn.dot(Ti),l=Kn.dot(Ld),c=Ti.dot(Ti),h=Ti.dot(Ld),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;let u=1/d,f=(c*l-a*h)*u,p=(o*h-a*l)*u;return r.set(1-f-p,p,f)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,Ai)===null?!1:Ai.x>=0&&Ai.y>=0&&Ai.x+Ai.y<=1}static getInterpolation(t,e,n,i,r,o,a,l){return this.getBarycoord(t,e,n,i,Ai)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ai.x),l.addScaledVector(o,Ai.y),l.addScaledVector(a,Ai.z),l)}static getInterpolatedAttribute(t,e,n,i,r,o){return Fd.setScalar(0),Od.setScalar(0),Bd.setScalar(0),Fd.fromBufferAttribute(t,e),Od.fromBufferAttribute(t,n),Bd.fromBufferAttribute(t,i),o.setScalar(0),o.addScaledVector(Fd,r.x),o.addScaledVector(Od,r.y),o.addScaledVector(Bd,r.z),o}static isFrontFacing(t,e,n,i){return Kn.subVectors(n,e),Ti.subVectors(t,e),Kn.cross(Ti).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Kn.subVectors(this.c,this.b),Ti.subVectors(this.a,this.b),Kn.cross(Ti).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return s.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return s.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,r){return s.getInterpolation(t,this.a,this.b,this.c,e,n,i,r)}containsPoint(t){return s.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return s.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,i=this.b,r=this.c,o,a;Sr.subVectors(i,n),br.subVectors(r,n),Dd.subVectors(t,n);let l=Sr.dot(Dd),c=br.dot(Dd);if(l<=0&&c<=0)return e.copy(n);Nd.subVectors(t,i);let h=Sr.dot(Nd),d=br.dot(Nd);if(h>=0&&d<=h)return e.copy(i);let u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(Sr,o);Ud.subVectors(t,r);let f=Sr.dot(Ud),p=br.dot(Ud);if(p>=0&&f<=p)return e.copy(r);let x=f*c-l*p;if(x<=0&&c>=0&&p<=0)return a=c/(c-p),e.copy(n).addScaledVector(br,a);let g=h*p-f*d;if(g<=0&&d-h>=0&&f-p>=0)return Mm.subVectors(r,i),a=(d-h)/(d-h+(f-p)),e.copy(i).addScaledVector(Mm,a);let m=1/(g+x+u);return o=x*m,a=u*m,e.copy(n).addScaledVector(Sr,o).addScaledVector(br,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Je=class{constructor(t=new U(1/0,1/0,1/0),e=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Qn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Qn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=Qn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Qn):Qn.fromBufferAttribute(r,o),Qn.applyMatrix4(t.matrixWorld),this.expandByPoint(Qn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Hc.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Hc.copy(n.boundingBox)),Hc.applyMatrix4(t.matrixWorld),this.union(Hc)}let i=t.children;for(let r=0,o=i.length;r<o;r++)this.expandByObject(i[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Qn),Qn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(sa),Wc.subVectors(this.max,sa),wr.subVectors(t.a,sa),Tr.subVectors(t.b,sa),Ar.subVectors(t.c,sa),Qi.subVectors(Tr,wr),ji.subVectors(Ar,Tr),Ms.subVectors(wr,Ar);let e=[0,-Qi.z,Qi.y,0,-ji.z,ji.y,0,-Ms.z,Ms.y,Qi.z,0,-Qi.x,ji.z,0,-ji.x,Ms.z,0,-Ms.x,-Qi.y,Qi.x,0,-ji.y,ji.x,0,-Ms.y,Ms.x,0];return!zd(e,wr,Tr,Ar,Wc)||(e=[1,0,0,0,1,0,0,0,1],!zd(e,wr,Tr,Ar,Wc))?!1:(Xc.crossVectors(Qi,ji),e=[Xc.x,Xc.y,Xc.z],zd(e,wr,Tr,Ar,Wc))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Qn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Qn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Ei[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Ei[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Ei[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Ei[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Ei[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Ei[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Ei[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Ei[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Ei),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Ei=[new U,new U,new U,new U,new U,new U,new U,new U],Qn=new U,Hc=new Je,wr=new U,Tr=new U,Ar=new U,Qi=new U,ji=new U,Ms=new U,sa=new U,Wc=new U,Xc=new U,Ss=new U;Pi=m_();Nh=class{static toHalfFloat(t){return En(t)}static fromHalfFloat(t){return ma(t)}},qe=new U,qc=new Mt,g_=0,pe=class extends Rn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:g_++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=bc,this.updateRanges=[],this.gpuType=pn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)qc.fromBufferAttribute(this,e),qc.applyMatrix3(t),this.setXY(e,qc.x,qc.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)qe.fromBufferAttribute(this,e),qe.applyMatrix3(t),this.setXYZ(e,qe.x,qe.y,qe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)qe.fromBufferAttribute(this,e),qe.applyMatrix4(t),this.setXYZ(e,qe.x,qe.y,qe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)qe.fromBufferAttribute(this,e),qe.applyNormalMatrix(t),this.setXYZ(e,qe.x,qe.y,qe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)qe.fromBufferAttribute(this,e),qe.transformDirection(t),this.setXYZ(e,qe.x,qe.y,qe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=yn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ae(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=yn(e,this.array)),e}setX(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=yn(e,this.array)),e}setY(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=yn(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=yn(e,this.array)),e}setW(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),i=ae(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,r){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),i=ae(i,this.array),r=ae(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}},Uh=class extends pe{constructor(t,e,n){super(new Int8Array(t),e,n)}},Fh=class extends pe{constructor(t,e,n){super(new Uint8Array(t),e,n)}},Oh=class extends pe{constructor(t,e,n){super(new Uint8ClampedArray(t),e,n)}},Bh=class extends pe{constructor(t,e,n){super(new Int16Array(t),e,n)}},Zr=class extends pe{constructor(t,e,n){super(new Uint16Array(t),e,n)}},zh=class extends pe{constructor(t,e,n){super(new Int32Array(t),e,n)}},Jr=class extends pe{constructor(t,e,n){super(new Uint32Array(t),e,n)}},kh=class extends pe{constructor(t,e,n){super(new Uint16Array(t),e,n),this.isFloat16BufferAttribute=!0}getX(t){let e=ma(this.array[t*this.itemSize]);return this.normalized&&(e=yn(e,this.array)),e}setX(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize]=En(e),this}getY(t){let e=ma(this.array[t*this.itemSize+1]);return this.normalized&&(e=yn(e,this.array)),e}setY(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+1]=En(e),this}getZ(t){let e=ma(this.array[t*this.itemSize+2]);return this.normalized&&(e=yn(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+2]=En(e),this}getW(t){let e=ma(this.array[t*this.itemSize+3]);return this.normalized&&(e=yn(e,this.array)),e}setW(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+3]=En(e),this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array)),this.array[t+0]=En(e),this.array[t+1]=En(n),this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),i=ae(i,this.array)),this.array[t+0]=En(e),this.array[t+1]=En(n),this.array[t+2]=En(i),this}setXYZW(t,e,n,i,r){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),i=ae(i,this.array),r=ae(r,this.array)),this.array[t+0]=En(e),this.array[t+1]=En(n),this.array[t+2]=En(i),this.array[t+3]=En(r),this}},Xt=class extends pe{constructor(t,e,n){super(new Float32Array(t),e,n)}},x_=new Je,ra=new U,kd=new U,Ye=class{constructor(t=new U,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):x_.setFromPoints(t).getCenter(n);let i=0;for(let r=0,o=t.length;r<o;r++)i=Math.max(i,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;ra.subVectors(t,this.center);let e=ra.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(ra,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(kd.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(ra.copy(t.center).add(kd)),this.expandByPoint(ra.copy(t.center).sub(kd))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},__=0,Hn=new re,Vd=new me,Er=new U,Ln=new Je,oa=new Je,je=new U,se=class s extends Rn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:__++}),this.uuid=Dn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Vx(t)?Jr:Zr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new oe().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Hn.makeRotationFromQuaternion(t),this.applyMatrix4(Hn),this}rotateX(t){return Hn.makeRotationX(t),this.applyMatrix4(Hn),this}rotateY(t){return Hn.makeRotationY(t),this.applyMatrix4(Hn),this}rotateZ(t){return Hn.makeRotationZ(t),this.applyMatrix4(Hn),this}translate(t,e,n){return Hn.makeTranslation(t,e,n),this.applyMatrix4(Hn),this}scale(t,e,n){return Hn.makeScale(t,e,n),this.applyMatrix4(Hn),this}lookAt(t){return Vd.lookAt(t),Vd.updateMatrix(),this.applyMatrix4(Vd.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Er).negate(),this.translate(Er.x,Er.y,Er.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let i=0,r=t.length;i<r;i++){let o=t[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Xt(n,3))}else{let n=Math.min(t.length,e.count);for(let i=0;i<n;i++){let r=t[i];e.setXYZ(i,r.x,r.y,r.z||0)}t.length>e.count&&Bt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Je);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Qt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){let r=e[n];Ln.setFromBufferAttribute(r),this.morphTargetsRelative?(je.addVectors(this.boundingBox.min,Ln.min),this.boundingBox.expandByPoint(je),je.addVectors(this.boundingBox.max,Ln.max),this.boundingBox.expandByPoint(je)):(this.boundingBox.expandByPoint(Ln.min),this.boundingBox.expandByPoint(Ln.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Qt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ye);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Qt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new U,1/0);return}if(t){let n=this.boundingSphere.center;if(Ln.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];oa.setFromBufferAttribute(a),this.morphTargetsRelative?(je.addVectors(Ln.min,oa.min),Ln.expandByPoint(je),je.addVectors(Ln.max,oa.max),Ln.expandByPoint(je)):(Ln.expandByPoint(oa.min),Ln.expandByPoint(oa.max))}Ln.getCenter(n);let i=0;for(let r=0,o=t.count;r<o;r++)je.fromBufferAttribute(t,r),i=Math.max(i,n.distanceToSquared(je));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)je.fromBufferAttribute(a,c),l&&(Er.fromBufferAttribute(t,c),je.add(Er)),i=Math.max(i,n.distanceToSquared(je))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&Qt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Qt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,i=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new pe(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let v=0;v<n.count;v++)a[v]=new U,l[v]=new U;let c=new U,h=new U,d=new U,u=new Mt,f=new Mt,p=new Mt,x=new U,g=new U;function m(v,C,I){c.fromBufferAttribute(n,v),h.fromBufferAttribute(n,C),d.fromBufferAttribute(n,I),u.fromBufferAttribute(r,v),f.fromBufferAttribute(r,C),p.fromBufferAttribute(r,I),h.sub(c),d.sub(c),f.sub(u),p.sub(u);let z=1/(f.x*p.y-p.x*f.y);isFinite(z)&&(x.copy(h).multiplyScalar(p.y).addScaledVector(d,-f.y).multiplyScalar(z),g.copy(d).multiplyScalar(f.x).addScaledVector(h,-p.x).multiplyScalar(z),a[v].add(x),a[C].add(x),a[I].add(x),l[v].add(g),l[C].add(g),l[I].add(g))}let M=this.groups;M.length===0&&(M=[{start:0,count:t.count}]);for(let v=0,C=M.length;v<C;++v){let I=M[v],z=I.start,N=I.count;for(let O=z,G=z+N;O<G;O+=3)m(t.getX(O+0),t.getX(O+1),t.getX(O+2))}let w=new U,y=new U,S=new U,b=new U;function R(v){S.fromBufferAttribute(i,v),b.copy(S);let C=a[v];w.copy(C),w.sub(S.multiplyScalar(S.dot(C))).normalize(),y.crossVectors(b,C);let z=y.dot(l[v])<0?-1:1;o.setXYZW(v,w.x,w.y,w.z,z)}for(let v=0,C=M.length;v<C;++v){let I=M[v],z=I.start,N=I.count;for(let O=z,G=z+N;O<G;O+=3)R(t.getX(O+0)),R(t.getX(O+1)),R(t.getX(O+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new pe(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let i=new U,r=new U,o=new U,a=new U,l=new U,c=new U,h=new U,d=new U;if(t)for(let u=0,f=t.count;u<f;u+=3){let p=t.getX(u+0),x=t.getX(u+1),g=t.getX(u+2);i.fromBufferAttribute(e,p),r.fromBufferAttribute(e,x),o.fromBufferAttribute(e,g),h.subVectors(o,r),d.subVectors(i,r),h.cross(d),a.fromBufferAttribute(n,p),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,g),a.add(h),l.add(h),c.add(h),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)i.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),o.fromBufferAttribute(e,u+2),h.subVectors(o,r),d.subVectors(i,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)je.fromBufferAttribute(t,e),je.normalize(),t.setXYZ(e,je.x,je.y,je.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h),f=0,p=0;for(let x=0,g=l.length;x<g;x++){a.isInterleavedBufferAttribute?f=l[x]*a.data.stride+a.offset:f=l[x]*h;for(let m=0;m<h;m++)u[p++]=c[f++]}return new pe(u,h,d)}if(this.index===null)return Bt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new s,n=this.index.array,i=this.attributes;for(let a in i){let l=i[a],c=t(l,n);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,d=c.length;h<d;h++){let u=c[h],f=t(u,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let i={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){let f=c[d];h.push(f.toJSON(t.data))}h.length>0&&(i[l]=h,r=!0)}r&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let i=t.attributes;for(let c in i){let h=i[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],d=r[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},ks=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=bc,this.updateRanges=[],this.version=0,this.uuid=Dn()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let i=0,r=this.stride;i<r;i++)this.array[t+i]=e.array[n+i];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Dn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Dn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},vn=new U,os=class s{constructor(t,e,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)vn.fromBufferAttribute(this,e),vn.applyMatrix4(t),this.setXYZ(e,vn.x,vn.y,vn.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)vn.fromBufferAttribute(this,e),vn.applyNormalMatrix(t),this.setXYZ(e,vn.x,vn.y,vn.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)vn.fromBufferAttribute(this,e),vn.transformDirection(t),this.setXYZ(e,vn.x,vn.y,vn.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=yn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ae(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=yn(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=yn(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=yn(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=yn(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,i){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),i=ae(i,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this}setXYZW(t,e,n,i,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),i=ae(i,this.array),r=ae(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this.data.array[t+3]=r,this}clone(t){if(t===void 0){Yr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[i+r])}return new pe(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new s(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){Yr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[i+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Gd=new U,v_=new U,y_=new oe,Wn=class{constructor(t=new U(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let i=Gd.subVectors(n,e).cross(v_.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let i=t.delta(Gd),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(i,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||y_.getNormalMatrix(t),i=this.coplanarPoint(Gd).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},M_=0,$e=class extends Rn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:M_++}),this.uuid=Dn(),this.name="",this.type="Material",this.blending=nr,this.side=ki,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Vu,this.blendDst=Gu,this.blendEquation=ps,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new zt(0,0,0),this.blendAlpha=0,this.depthFunc=Ns,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Kf,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=_a,this.stencilZFail=_a,this.stencilZPass=_a,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Bt(`Material: parameter '${e}' has value of undefined.`);continue}let i=this[e];if(i===void 0){Bt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector2&&n&&n.isVector2||i&&i.isEuler&&n&&n.isEuler||i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=i(t.textures),o=i(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new zt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new Wn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Mt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Mt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let i=e.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Kr=class extends $e{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new zt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},aa=new U,Rr=new U,Pr=new U,Ir=new Mt,la=new Mt,Mg=new re,Yc=new U,ca=new U,$c=new U,Sm=new Mt,Hd=new Mt,bm=new Mt,Na=class extends me{constructor(t=new Kr){if(super(),this.isSprite=!0,this.type="Sprite",Cr===void 0){Cr=new se;let e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new ks(e,5);Cr.setIndex([0,1,2,0,2,3]),Cr.setAttribute("position",new os(n,3,0,!1)),Cr.setAttribute("uv",new os(n,2,3,!1))}this.geometry=Cr,this.material=t,this.center=new Mt(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Qt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Rr.setFromMatrixScale(this.matrixWorld),Mg.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),Pr.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Rr.multiplyScalar(-Pr.z);let n=this.material.rotation,i,r;n!==0&&(r=Math.cos(n),i=Math.sin(n));let o=this.center;Zc(Yc.set(-.5,-.5,0),Pr,o,Rr,i,r),Zc(ca.set(.5,-.5,0),Pr,o,Rr,i,r),Zc($c.set(.5,.5,0),Pr,o,Rr,i,r),Sm.set(0,0),Hd.set(1,0),bm.set(1,1);let a=t.ray.intersectTriangle(Yc,ca,$c,!1,aa);if(a===null&&(Zc(ca.set(-.5,.5,0),Pr,o,Rr,i,r),Hd.set(0,1),a=t.ray.intersectTriangle(Yc,$c,ca,!1,aa),a===null))return;let l=t.ray.origin.distanceTo(aa);l<t.near||l>t.far||e.push({distance:l,point:aa.clone(),uv:ti.getInterpolation(aa,Yc,ca,$c,Sm,Hd,bm,new Mt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};Jc=new U,wm=new U,Ua=class extends me{constructor(){super(),this.isLOD=!0,this._currentLevel=0,this.type="LOD",Object.defineProperties(this,{levels:{enumerable:!0,value:[]}}),this.autoUpdate=!0}copy(t){super.copy(t,!1);let e=t.levels;for(let n=0,i=e.length;n<i;n++){let r=e[n];this.addLevel(r.object.clone(),r.distance,r.hysteresis)}return this.autoUpdate=t.autoUpdate,this}addLevel(t,e=0,n=0){e=Math.abs(e);let i=this.levels,r;for(r=0;r<i.length&&!(e<i[r].distance);r++);return i.splice(r,0,{distance:e,hysteresis:n,object:t}),this.add(t),this}removeLevel(t){let e=this.levels;for(let n=0;n<e.length;n++)if(e[n].distance===t){let i=e.splice(n,1);return this.remove(i[0].object),!0}return!1}getCurrentLevel(){return this._currentLevel}getObjectForDistance(t){let e=this.levels;if(e.length>0){let n,i;for(n=1,i=e.length;n<i;n++){let r=e[n].distance;if(e[n].object.visible&&(r-=r*e[n].hysteresis),t<r)break}return e[n-1].object}return null}raycast(t,e){if(this.levels.length>0){Jc.setFromMatrixPosition(this.matrixWorld);let i=t.ray.origin.distanceTo(Jc);this.getObjectForDistance(i).raycast(t,e)}}update(t){let e=this.levels;if(e.length>1){Jc.setFromMatrixPosition(t.matrixWorld),wm.setFromMatrixPosition(this.matrixWorld);let n=Jc.distanceTo(wm)/t.zoom;e[0].object.visible=!0;let i,r;for(i=1,r=e.length;i<r;i++){let o=e[i].distance;if(e[i].object.visible&&(o-=o*e[i].hysteresis),n>=o)e[i-1].object.visible=!1,e[i].object.visible=!0;else break}for(this._currentLevel=i-1;i<r;i++)e[i].object.visible=!1}}toJSON(t){let e=super.toJSON(t);e.object.autoUpdate=this.autoUpdate,e.object.levels=[];let n=this.levels;for(let i=0,r=n.length;i<r;i++){let o=n[i];e.object.levels.push({object:o.object.uuid,distance:o.distance,hysteresis:o.hysteresis})}return e}},Ci=new U,Wd=new U,Kc=new U,Qc=new U,Ni=class{constructor(t=new U,e=new U(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Ci)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Ci.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Ci.copy(this.origin).addScaledVector(this.direction,e),Ci.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){Wd.copy(t).add(e).multiplyScalar(.5),Kc.copy(e).sub(t).normalize(),Qc.copy(this.origin).sub(Wd);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Kc),a=Qc.dot(this.direction),l=-Qc.dot(Kc),c=Qc.lengthSq(),h=Math.abs(1-o*o),d,u,f,p;if(h>0)if(d=o*l-a,u=o*a-l,p=r*h,d>=0)if(u>=-p)if(u<=p){let x=1/h;d*=x,u*=x,f=d*(d+o*u+2*a)+u*(o*d+u+2*l)+c}else u=r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u<=-p?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c):u<=p?(d=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(Wd).addScaledVector(Kc,u),f}intersectSphere(t,e){if(t.radius<0)return null;Ci.subVectors(t.center,this.origin);let n=Ci.dot(this.direction),i=Ci.dot(Ci)-n*n,r=t.radius*t.radius;if(i>r)return null;let o=Math.sqrt(r-i),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,i=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,i=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),d>=0?(a=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,Ci)!==null}intersectTriangle(t,e,n,i,r){let o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,d=t.x-o.x,u=t.y-o.y,f=t.z-o.z,p=e.x-o.x,x=e.y-o.y,g=e.z-o.z,m=n.x-o.x,M=n.y-o.y,w=n.z-o.z,y=Math.abs(l),S=Math.abs(c),b=Math.abs(h),R,v,C,I,z,N,O,G,Y,J,rt,K;if(y>=S&&y>=b?(C=l,N=d,Y=p,K=m,l>=0?(R=c,v=h,I=u,z=f,O=x,G=g,J=M,rt=w):(R=h,v=c,I=f,z=u,O=g,G=x,J=w,rt=M)):S>=b?(C=c,N=u,Y=x,K=M,c>=0?(R=h,v=l,I=f,z=d,O=g,G=p,J=w,rt=m):(R=l,v=h,I=d,z=f,O=p,G=g,J=m,rt=w)):(C=h,N=f,Y=g,K=w,h>=0?(R=l,v=c,I=d,z=u,O=p,G=x,J=m,rt=M):(R=c,v=l,I=u,z=d,O=x,G=p,J=M,rt=m)),C===0)return null;let Q=R/C,et=v/C,ot=1/C,Lt=I-Q*N,It=z-et*N,Wt=O-Q*Y,qt=G-et*Y,Zt=J-Q*K,st=rt-et*K,ht=Zt*qt-st*Wt,dt=Lt*st-It*Zt,Tt=Wt*It-qt*Lt;if(i){if(ht<0||dt<0||Tt<0)return null}else if((ht<0||dt<0||Tt<0)&&(ht>0||dt>0||Tt>0))return null;let At=ht+dt+Tt;if(At===0)return null;let Dt=ot*(ht*N+dt*Y+Tt*K);return(At>0?Dt<0:Dt>0)?null:this.at(Dt/At,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Nn=class extends $e{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new zt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yn,this.combine=So,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Tm=new re,bs=new Ni,jc=new Ye,Am=new U,th=new U,eh=new U,nh=new U,Xd=new U,ih=new U,Em=new U,sh=new U,ve=class extends me{constructor(t=new se,e=new Nn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){let a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(i,t);let a=this.morphTargetInfluences;if(r&&a){ih.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],d=r[l];h!==0&&(Xd.fromBufferAttribute(d,t),o?ih.addScaledVector(Xd,h):ih.addScaledVector(Xd.sub(e),h))}e.add(ih)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),jc.copy(n.boundingSphere),jc.applyMatrix4(r),bs.copy(t.ray).recast(t.near),!(jc.containsPoint(bs.origin)===!1&&(bs.intersectSphere(jc,Am)===null||bs.origin.distanceToSquared(Am)>(t.far-t.near)**2))&&(Tm.copy(r).invert(),bs.copy(t.ray).applyMatrix4(Tm),!(n.boundingBox!==null&&bs.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,bs)))}_computeIntersections(t,e,n){let i,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let p=0,x=u.length;p<x;p++){let g=u[p],m=o[g.materialIndex],M=Math.max(g.start,f.start),w=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let y=M,S=w;y<S;y+=3){let b=a.getX(y),R=a.getX(y+1),v=a.getX(y+2);i=rh(this,m,t,n,c,h,d,b,R,v),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=g.materialIndex,e.push(i))}}else{let p=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let g=p,m=x;g<m;g+=3){let M=a.getX(g),w=a.getX(g+1),y=a.getX(g+2);i=rh(this,o,t,n,c,h,d,M,w,y),i&&(i.faceIndex=Math.floor(g/3),e.push(i))}}else if(l!==void 0)if(Array.isArray(o))for(let p=0,x=u.length;p<x;p++){let g=u[p],m=o[g.materialIndex],M=Math.max(g.start,f.start),w=Math.min(l.count,Math.min(g.start+g.count,f.start+f.count));for(let y=M,S=w;y<S;y+=3){let b=y,R=y+1,v=y+2;i=rh(this,m,t,n,c,h,d,b,R,v),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=g.materialIndex,e.push(i))}}else{let p=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let g=p,m=x;g<m;g+=3){let M=g,w=g+1,y=g+2;i=rh(this,o,t,n,c,h,d,M,w,y),i&&(i.faceIndex=Math.floor(g/3),e.push(i))}}}};ha=new be,Cm=new be,Rm=new be,b_=new be,Pm=new re,oh=new U,qd=new Ye,Im=new re,Yd=new Ni,Fa=class extends ve{constructor(t,e){super(t,e),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Rh,this.bindMatrix=new re,this.bindMatrixInverse=new re,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let t=this.geometry;this.boundingBox===null&&(this.boundingBox=new Je),this.boundingBox.makeEmpty();let e=t.getAttribute("position");for(let n=0;n<e.count;n++)this.getVertexPosition(n,oh),this.boundingBox.expandByPoint(oh)}computeBoundingSphere(){let t=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Ye),this.boundingSphere.makeEmpty();let e=t.getAttribute("position");for(let n=0;n<e.count;n++)this.getVertexPosition(n,oh),this.boundingSphere.expandByPoint(oh)}copy(t,e){return super.copy(t,e),this.bindMode=t.bindMode,this.bindMatrix.copy(t.bindMatrix),this.bindMatrixInverse.copy(t.bindMatrixInverse),this.skeleton=t.skeleton,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}raycast(t,e){let n=this.material,i=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),qd.copy(this.boundingSphere),qd.applyMatrix4(i),t.ray.intersectsSphere(qd)!==!1&&(Im.copy(i).invert(),Yd.copy(t.ray).applyMatrix4(Im),!(this.boundingBox!==null&&Yd.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(t,e,Yd)))}getVertexPosition(t,e){return super.getVertexPosition(t,e),this.applyBoneTransform(t,e),e}bind(t,e){this.skeleton=t,e===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),e=this.matrixWorld),this.bindMatrix.copy(e),this.bindMatrixInverse.copy(e).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let t=new be,e=this.geometry.attributes.skinWeight;for(let n=0,i=e.count;n<i;n++){t.fromBufferAttribute(e,n);let r=1/t.manhattanLength();r!==1/0?t.multiplyScalar(r):t.set(1,0,0,0),e.setXYZW(n,t.x,t.y,t.z,t.w)}}updateMatrixWorld(t){super.updateMatrixWorld(t),this.bindMode===Rh?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Xf?this.bindMatrixInverse.copy(this.bindMatrix).invert():Bt("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(t,e){let n=this.skeleton,i=this.geometry;Cm.fromBufferAttribute(i.attributes.skinIndex,t),Rm.fromBufferAttribute(i.attributes.skinWeight,t),e.isVector4?(ha.copy(e),e.set(0,0,0,0)):(ha.set(...e,1),e.set(0,0,0)),ha.applyMatrix4(this.bindMatrix);for(let r=0;r<4;r++){let o=Rm.getComponent(r);if(o!==0){let a=Cm.getComponent(r);Pm.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),e.addScaledVector(b_.copy(ha).applyMatrix4(Pm),o)}}return e.isVector4&&(e.w=ha.w),e.applyMatrix4(this.bindMatrixInverse)}},Qr=class extends me{constructor(){super(),this.isBone=!0,this.type="Bone"}},Sn=class extends ke{constructor(t=null,e=1,n=1,i,r,o,a,l,c=ze,h=ze,d,u){super(null,o,a,l,c,h,i,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Lm=new re,w_=new re,Oa=class s{constructor(t=[],e=[]){this.uuid=Dn(),this.bones=t.slice(0),this.boneInverses=e,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let t=this.bones,e=this.boneInverses;if(this.boneMatrices=new Float32Array(t.length*16),e.length===0)this.calculateInverses();else if(t.length!==e.length){Bt("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new re)}}calculateInverses(){this.boneInverses.length=0;for(let t=0,e=this.bones.length;t<e;t++){let n=new re;this.bones[t]&&n.copy(this.bones[t].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let t=0,e=this.bones.length;t<e;t++){let n=this.bones[t];n&&n.matrixWorld.copy(this.boneInverses[t]).invert()}for(let t=0,e=this.bones.length;t<e;t++){let n=this.bones[t];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){let t=this.bones,e=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let r=0,o=t.length;r<o;r++){let a=t[r]?t[r].matrixWorld:w_;Lm.multiplyMatrices(a,e[r]),Lm.toArray(n,r*16)}i!==null&&(i.needsUpdate=!0)}clone(){return new s(this.bones,this.boneInverses)}computeBoneTexture(){let t=Math.sqrt(this.bones.length*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);let e=new Float32Array(t*t*4);e.set(this.boneMatrices);let n=new Sn(e,t,t,mn,pn);return n.needsUpdate=!0,this.boneMatrices=e,this.boneTexture=n,this}getBoneByName(t){for(let e=0,n=this.bones.length;e<n;e++){let i=this.bones[e];if(i.name===t)return i}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(t,e){this.uuid=t.uuid;for(let n=0,i=t.bones.length;n<i;n++){let r=t.bones[n],o=e[r];o===void 0&&(Bt("Skeleton: No bone found with UUID:",r),o=new Qr),this.bones.push(o),this.boneInverses.push(new re().fromArray(t.boneInverses[n]))}return this.init(),this}toJSON(){let t={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};t.uuid=this.uuid;let e=this.bones,n=this.boneInverses;for(let i=0,r=e.length;i<r;i++){let o=e[i];t.bones.push(o.uuid);let a=n[i];t.boneInverses.push(a.toArray())}return t}},Ui=class extends pe{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},Lr=new re,Dm=new re,ah=[],Nm=new Je,T_=new re,ua=new ve,da=new Ye,Vs=class extends ve{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new Ui(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,T_)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new Je),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Lr),Nm.copy(t.boundingBox).applyMatrix4(Lr),this.boundingBox.union(Nm)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ye),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Lr),da.copy(t.boundingSphere).applyMatrix4(Lr),this.boundingSphere.union(da)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,r=n.length+1,o=t*r+1;for(let a=0;a<n.length;a++)n[a]=i[o+a]}raycast(t,e){let n=this.matrixWorld,i=this.count;if(ua.geometry=this.geometry,ua.material=this.material,ua.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),da.copy(this.boundingSphere),da.applyMatrix4(n),t.ray.intersectsSphere(da)!==!1))for(let r=0;r<i;r++){this.getMatrixAt(r,Lr),Dm.multiplyMatrices(n,Lr),ua.matrixWorld=Dm,ua.raycast(t,ah);for(let o=0,a=ah.length;o<a;o++){let l=ah[o];l.instanceId=r,l.object=this,e.push(l)}ah.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new Ui(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Sn(new Float32Array(i*this.count),i,this.count,Vl,pn));let r=this.morphTexture.source.data.data,o=0;for(let c=0;c<n.length;c++)o+=n[c];let a=this.geometry.morphTargetsRelative?1:1-o,l=i*t;return r[l]=a,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},ws=new Ye,A_=new Mt(.5,.5),lh=new U,fi=class{constructor(t=new Wn,e=new Wn,n=new Wn,i=new Wn,r=new Wn,o=new Wn){this.planes=[t,e,n,i,r,o]}set(t,e,n,i,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Cn,n=!1){let i=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],f=r[7],p=r[8],x=r[9],g=r[10],m=r[11],M=r[12],w=r[13],y=r[14],S=r[15];if(i[0].setComponents(c-o,f-h,m-p,S-M).normalize(),i[1].setComponents(c+o,f+h,m+p,S+M).normalize(),i[2].setComponents(c+a,f+d,m+x,S+w).normalize(),i[3].setComponents(c-a,f-d,m-x,S-w).normalize(),n)i[4].setComponents(l,u,g,y).normalize(),i[5].setComponents(c-l,f-u,m-g,S-y).normalize();else if(i[4].setComponents(c-l,f-u,m-g,S-y).normalize(),e===Cn)i[5].setComponents(c+l,f+u,m+g,S+y).normalize();else if(e===ss)i[5].setComponents(l,u,g,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ws.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),ws.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ws)}intersectsSprite(t){ws.center.set(0,0,0);let e=A_.distanceTo(t.center);return ws.radius=.7071067811865476+e,ws.applyMatrix4(t.matrixWorld),this.intersectsSphere(ws)}intersectsSphere(t){let e=this.planes,n=t.center,i=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let i=e[n];if(lh.x=i.normal.x>0?t.max.x:t.min.x,lh.y=i.normal.y>0?t.max.y:t.min.y,lh.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(lh)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Um=new re,Ba=class s{constructor(){this.coordinateSystem=Cn,this._frustums=[],this._count=0}setFromArrayCamera(t){let e=t.cameras,n=this._frustums;for(let i=0;i<e.length;i++){let r=e[i];Um.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[i]===void 0&&(n[i]=new fi),n[i].setFromProjectionMatrix(Um,r.coordinateSystem,r.reversedDepth)}return this._count=e.length,this}intersectsObject(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsObject(t))return!0;return!1}intersectsSprite(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSprite(t))return!0;return!1}intersectsSphere(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSphere(t))return!0;return!1}intersectsBox(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsBox(t))return!0;return!1}containsPoint(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].containsPoint(t))return!0;return!1}copy(t){this.coordinateSystem=t.coordinateSystem;let e=this._frustums,n=t._frustums;for(let i=0;i<t._count;i++)e[i]===void 0&&(e[i]=new fi),e[i].copy(n[i]);return this._count=t._count,this}clone(){return new s().copy(this)}};cf=class{constructor(){this.index=0,this.pool=[],this.list=[]}push(t,e,n,i){let r=this.pool,o=this.list;this.index>=r.length&&r.push({start:-1,count:-1,z:-1,index:-1});let a=r[this.index];o.push(a),this.index++,a.start=t,a.count=e,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}},An=new re,R_=new zt(1,1,1),P_=new fi,I_=new Ba,ch=new Je,Ts=new Ye,fa=new U,Fm=new U,L_=new U,Zd=new cf,fn=new ve,hh=[];za=class extends ve{constructor(t,e,n=e*2,i){super(new se,i),this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=t,this._maxVertexCount=e,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(t),this._multiDrawStarts=new Int32Array(t),this._multiDrawCount=0,this._multiDrawBytesPerElement=1,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}_initMatricesTexture(){let t=Math.sqrt(this._maxInstanceCount*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);let e=new Float32Array(t*t*4),n=new Sn(e,t,t,mn,pn);this._matricesTexture=n}_initIndirectTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);let e=new Uint32Array(t*t),n=new Sn(e,t,t,Lo,On);this._indirectTexture=n}_initColorsTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);let e=new Float32Array(t*t*4).fill(1),n=new Sn(e,t,t,mn,pn);n.colorSpace=he.workingColorSpace,this._colorsTexture=n}_initializeGeometry(t){let e=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(let r in t.attributes){let o=t.getAttribute(r),{array:a,itemSize:l,normalized:c}=o,h=new a.constructor(n*l),d=new pe(h,l,c);e.setAttribute(r,d)}if(t.getIndex()!==null){let r=n>65535?new Uint32Array(i):new Uint16Array(i);e.setIndex(new pe(r,1))}this._geometryInitialized=!0}}_validateGeometry(t){let e=this.geometry;if(!!t.getIndex()!=!!e.getIndex())throw new Error('THREE.BatchedMesh: All geometries must consistently have "index".');for(let n in e.attributes){if(!t.hasAttribute(n))throw new Error(`THREE.BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);let i=t.getAttribute(n),r=e.getAttribute(n);if(i.itemSize!==r.itemSize||i.normalized!==r.normalized)throw new Error("THREE.BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}validateInstanceId(t){let e=this._instanceInfo;if(t<0||t>=e.length||e[t].active===!1)throw new Error(`THREE.BatchedMesh: Invalid instanceId ${t}. Instance is either out of range or has been deleted.`)}validateGeometryId(t){let e=this._geometryInfo;if(t<0||t>=e.length||e[t].active===!1)throw new Error(`THREE.BatchedMesh: Invalid geometryId ${t}. Geometry is either out of range or has been deleted.`)}setCustomSort(t){return this.customSort=t,this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Je);let t=this.boundingBox,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;let r=e[n].geometryIndex;this.getMatrixAt(n,An),this.getBoundingBoxAt(r,ch).applyMatrix4(An),t.union(ch)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ye);let t=this.boundingSphere,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;let r=e[n].geometryIndex;this.getMatrixAt(n,An),this.getBoundingSphereAt(r,Ts).applyMatrix4(An),t.union(Ts)}}addInstance(t){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw new Error("THREE.BatchedMesh: Maximum item count reached.");let n={visible:!0,active:!0,geometryIndex:t},i=null;this._availableInstanceIds.length>0?(this._availableInstanceIds.sort($d),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n):(i=this._instanceInfo.length,this._instanceInfo.push(n));let r=this._matricesTexture;An.identity().toArray(r.image.data,i*16),r.needsUpdate=!0;let o=this._colorsTexture;return o&&(R_.toArray(o.image.data,i*4),o.needsUpdate=!0),this._visibilityChanged=!0,i}addGeometry(t,e=-1,n=-1){this._initializeGeometry(t),this._validateGeometry(t);let i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},r=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=e===-1?t.getAttribute("position").count:e;let o=t.getIndex();if(o!==null&&(i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?o.count:n),i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw new Error("THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.");let l;return this._availableGeometryIds.length>0?(this._availableGeometryIds.sort($d),l=this._availableGeometryIds.shift(),r[l]=i):(l=this._geometryCount,this._geometryCount++,r.push(i)),this.setGeometryAt(l,t),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,l}setGeometryAt(t,e){if(t>=this._geometryCount)throw new Error("THREE.BatchedMesh: Maximum geometry count reached.");this._validateGeometry(e);let n=this.geometry,i=n.getIndex()!==null,r=n.getIndex(),o=e.getIndex(),a=this._geometryInfo[t];if(i&&o.count>a.reservedIndexCount||e.attributes.position.count>a.reservedVertexCount)throw new Error("THREE.BatchedMesh: Reserved space not large enough for provided geometry.");let l=a.vertexStart,c=a.reservedVertexCount;a.vertexCount=e.getAttribute("position").count;for(let h in n.attributes){let d=e.getAttribute(h),u=n.getAttribute(h);D_(d,u,l);let f=d.itemSize;for(let p=d.count,x=c;p<x;p++){let g=l+p;for(let m=0;m<f;m++)u.setComponent(g,m,0)}u.needsUpdate=!0,u.addUpdateRange(l*f,c*f)}if(i){let h=a.indexStart,d=a.reservedIndexCount;a.indexCount=e.getIndex().count;for(let u=0;u<o.count;u++)r.setX(h+u,l+o.getX(u));for(let u=o.count,f=d;u<f;u++)r.setX(h+u,l);r.needsUpdate=!0,r.addUpdateRange(h,a.reservedIndexCount)}return a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,e.boundingBox!==null&&(a.boundingBox=e.boundingBox.clone()),a.boundingSphere=null,e.boundingSphere!==null&&(a.boundingSphere=e.boundingSphere.clone()),this._visibilityChanged=!0,t}deleteGeometry(t){let e=this._geometryInfo;if(t>=e.length||e[t].active===!1)return this;let n=this._instanceInfo;for(let i=0,r=n.length;i<r;i++)n[i].active&&n[i].geometryIndex===t&&this.deleteInstance(i);return e[t].active=!1,this._availableGeometryIds.push(t),this._visibilityChanged=!0,this}deleteInstance(t){return this.validateInstanceId(t),this._instanceInfo[t].active=!1,this._availableInstanceIds.push(t),this._visibilityChanged=!0,this}optimize(){let t=0,e=0,n=this._geometryInfo,i=n.map((o,a)=>a).sort((o,a)=>n[o].vertexStart-n[a].vertexStart),r=this.geometry;for(let o=0,a=n.length;o<a;o++){let l=i[o],c=n[l];if(c.active!==!1){if(r.index!==null){if(c.indexStart!==e){let{indexStart:h,vertexStart:d,reservedIndexCount:u}=c,f=r.index,p=f.array,x=t-d;for(let g=h;g<h+u;g++)p[g]=p[g]+x;f.array.copyWithin(e,h,h+u),f.addUpdateRange(e,u),f.needsUpdate=!0,c.indexStart=e}e+=c.reservedIndexCount}if(c.vertexStart!==t){let{vertexStart:h,reservedVertexCount:d}=c,u=r.attributes;for(let f in u){let p=u[f],{array:x,itemSize:g}=p;x.copyWithin(t*g,h*g,(h+d)*g),p.addUpdateRange(t*g,d*g),p.needsUpdate=!0}c.vertexStart=t}t+=c.reservedVertexCount,c.start=r.index?c.indexStart:c.vertexStart}}return this._nextIndexStart=e,this._nextVertexStart=t,this._visibilityChanged=!0,this}getBoundingBoxAt(t,e){if(t>=this._geometryCount)return null;let n=this.geometry,i=this._geometryInfo[t];if(i.boundingBox===null){let r=new Je,o=n.index,a=n.attributes.position;for(let l=i.start,c=i.start+i.count;l<c;l++){let h=l;o&&(h=o.getX(h)),r.expandByPoint(fa.fromBufferAttribute(a,h))}i.boundingBox=r}return e.copy(i.boundingBox),e}getBoundingSphereAt(t,e){if(t>=this._geometryCount)return null;let n=this.geometry,i=this._geometryInfo[t];if(i.boundingSphere===null){let r=new Ye;this.getBoundingBoxAt(t,ch),ch.getCenter(r.center);let o=n.index,a=n.attributes.position,l=0;for(let c=i.start,h=i.start+i.count;c<h;c++){let d=c;o&&(d=o.getX(d)),fa.fromBufferAttribute(a,d),l=Math.max(l,r.center.distanceToSquared(fa))}r.radius=Math.sqrt(l),i.boundingSphere=r}return e.copy(i.boundingSphere),e}setMatrixAt(t,e){this.validateInstanceId(t);let n=this._matricesTexture,i=this._matricesTexture.image.data;return e.toArray(i,t*16),n.needsUpdate=!0,this}getMatrixAt(t,e){return this.validateInstanceId(t),e.fromArray(this._matricesTexture.image.data,t*16)}setColorAt(t,e){return this.validateInstanceId(t),this._colorsTexture===null&&this._initColorsTexture(),e.toArray(this._colorsTexture.image.data,t*4),this._colorsTexture.needsUpdate=!0,this}getColorAt(t,e){return this.validateInstanceId(t),this._colorsTexture===null?e.isVector4?e.set(1,1,1,1):e.setRGB(1,1,1):e.fromArray(this._colorsTexture.image.data,t*4)}setVisibleAt(t,e){return this.validateInstanceId(t),this._instanceInfo[t].visible===e?this:(this._instanceInfo[t].visible=e,this._visibilityChanged=!0,this)}getVisibleAt(t){return this.validateInstanceId(t),this._instanceInfo[t].visible}setGeometryIdAt(t,e){return this.validateInstanceId(t),this.validateGeometryId(e),this._instanceInfo[t].geometryIndex=e,this._visibilityChanged=!0,this}getGeometryIdAt(t){return this.validateInstanceId(t),this._instanceInfo[t].geometryIndex}getGeometryRangeAt(t,e={}){this.validateGeometryId(t);let n=this._geometryInfo[t];return e.vertexStart=n.vertexStart,e.vertexCount=n.vertexCount,e.reservedVertexCount=n.reservedVertexCount,e.indexStart=n.indexStart,e.indexCount=n.indexCount,e.reservedIndexCount=n.reservedIndexCount,e.start=n.start,e.count=n.count,e}setInstanceCount(t){let e=this._availableInstanceIds,n=this._instanceInfo;for(e.sort($d);e[e.length-1]===n.length-1;)n.pop(),e.pop();if(t<n.length)throw new Error(`THREE.BatchedMesh: Instance ids outside the range ${t} are being used. Cannot shrink instance count.`);let i=new Int32Array(t),r=new Int32Array(t);As(this._multiDrawCounts,i),As(this._multiDrawStarts,r),this._multiDrawCounts=i,this._multiDrawStarts=r,this._maxInstanceCount=t;let o=this._indirectTexture,a=this._matricesTexture,l=this._colorsTexture;o.dispose(),this._initIndirectTexture(),As(o.image.data,this._indirectTexture.image.data),a.dispose(),this._initMatricesTexture(),As(a.image.data,this._matricesTexture.image.data),l&&(l.dispose(),this._initColorsTexture(),As(l.image.data,this._colorsTexture.image.data))}setGeometrySize(t,e){let n=[...this._geometryInfo].filter(a=>a.active);if(Math.max(...n.map(a=>a.vertexStart+a.reservedVertexCount))>t)throw new Error(`THREE.BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index&&Math.max(...n.map(l=>l.indexStart+l.reservedIndexCount))>e)throw new Error(`THREE.BatchedMesh: Geometry index values are being used outside the range ${e}. Cannot shrink further.`);let r=this.geometry;r.dispose(),this._maxVertexCount=t,this._maxIndexCount=e,this._geometryInitialized&&(this._geometryInitialized=!1,this.geometry=new se,this._initializeGeometry(r));let o=this.geometry;r.index&&As(r.index.array,o.index.array);for(let a in r.attributes)As(r.attributes[a].array,o.attributes[a].array)}raycast(t,e){let n=this._instanceInfo,i=this._geometryInfo,r=this.matrixWorld,o=this.geometry;fn.material=this.material,fn.geometry.index=o.index,fn.geometry.attributes=o.attributes,fn.geometry.boundingBox===null&&(fn.geometry.boundingBox=new Je),fn.geometry.boundingSphere===null&&(fn.geometry.boundingSphere=new Ye);for(let a=0,l=n.length;a<l;a++){if(!n[a].visible||!n[a].active)continue;let c=n[a].geometryIndex,h=i[c];fn.geometry.setDrawRange(h.start,h.count),this.getMatrixAt(a,fn.matrixWorld).premultiply(r),this.getBoundingBoxAt(c,fn.geometry.boundingBox),this.getBoundingSphereAt(c,fn.geometry.boundingSphere),fn.raycast(t,hh);for(let d=0,u=hh.length;d<u;d++){let f=hh[d];f.object=this,f.batchId=a,e.push(f)}hh.length=0}fn.material=null,fn.geometry.index=null,fn.geometry.attributes={},fn.geometry.setDrawRange(0,1/0)}copy(t){return super.copy(t),this.geometry=t.geometry.clone(),this.perObjectFrustumCulled=t.perObjectFrustumCulled,this.sortObjects=t.sortObjects,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this._geometryInfo=t._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox!==null?e.boundingBox.clone():null,boundingSphere:e.boundingSphere!==null?e.boundingSphere.clone():null})),this._instanceInfo=t._instanceInfo.map(e=>({...e})),this._availableInstanceIds=t._availableInstanceIds.slice(),this._availableGeometryIds=t._availableGeometryIds.slice(),this._nextIndexStart=t._nextIndexStart,this._nextVertexStart=t._nextVertexStart,this._geometryCount=t._geometryCount,this._maxInstanceCount=t._maxInstanceCount,this._maxVertexCount=t._maxVertexCount,this._maxIndexCount=t._maxIndexCount,this._geometryInitialized=t._geometryInitialized,this._multiDrawCounts=t._multiDrawCounts.slice(),this._multiDrawStarts=t._multiDrawStarts.slice(),this._multiDrawBytesPerElement=t._multiDrawBytesPerElement,this._indirectTexture=t._indirectTexture.clone(),this._indirectTexture.image.data=this._indirectTexture.image.data.slice(),this._matricesTexture=t._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null&&(this._colorsTexture=t._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice()),this}dispose(){super.dispose(),this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null&&(this._colorsTexture.dispose(),this._colorsTexture=null)}onBeforeRender(t,e,n,i,r){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;let o=i.getIndex(),a=o===null?1:o.array.BYTES_PER_ELEMENT,l=1;r.wireframe&&(l=2,a=i.attributes.position.count>65535?4:2);let c=this._instanceInfo,h=this._multiDrawStarts,d=this._multiDrawCounts,u=this._geometryInfo,f=this.perObjectFrustumCulled,p=this._indirectTexture,x=p.image.data,g=n.isArrayCamera?I_:P_;f&&(n.isArrayCamera?g.setFromArrayCamera(n):(An.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse).multiply(this.matrixWorld),g.setFromProjectionMatrix(An,n.coordinateSystem,n.reversedDepth)));let m=0;if(this.sortObjects){An.copy(this.matrixWorld).invert(),fa.setFromMatrixPosition(n.matrixWorld).applyMatrix4(An),Fm.set(0,0,-1).transformDirection(n.matrixWorld).transformDirection(An);for(let y=0,S=c.length;y<S;y++)if(c[y].visible&&c[y].active){let b=c[y].geometryIndex;this.getMatrixAt(y,An),this.getBoundingSphereAt(b,Ts).applyMatrix4(An);let R=!1;if(f&&(R=!g.intersectsSphere(Ts)),!R){let v=u[b],C=L_.subVectors(Ts.center,fa).dot(Fm);Zd.push(v.start,v.count,C,y)}}let M=Zd.list,w=this.customSort;w===null?M.sort(r.transparent?C_:E_):w.call(this,M,n);for(let y=0,S=M.length;y<S;y++){let b=M[y];h[m]=b.start*a*l,d[m]=b.count*l,x[m]=b.index,m++}Zd.reset()}else for(let M=0,w=c.length;M<w;M++)if(c[M].visible&&c[M].active){let y=c[M].geometryIndex,S=!1;if(f&&(this.getMatrixAt(M,An),this.getBoundingSphereAt(y,Ts).applyMatrix4(An),S=!g.intersectsSphere(Ts)),!S){let b=u[y];h[m]=b.start*a*l,d[m]=b.count*l,x[m]=M,m++}}p.needsUpdate=!0,this._multiDrawCount=m,this._multiDrawBytesPerElement=a,this._visibilityChanged=!1}onBeforeShadow(t,e,n,i,r,o){this.onBeforeRender(t,null,i,r,o)}},en=class extends $e{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new zt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},Vh=new U,Gh=new U,Om=new re,pa=new Ni,uh=new Ye,Jd=new U,Bm=new U,ii=class extends me{constructor(t=new se,e=new en){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let i=1,r=e.count;i<r;i++)Vh.fromBufferAttribute(e,i-1),Gh.fromBufferAttribute(e,i),n[i]=n[i-1],n[i]+=Vh.distanceTo(Gh);t.setAttribute("lineDistance",new Xt(n,1))}else Bt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,i=this.matrixWorld,r=t.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),uh.copy(n.boundingSphere),uh.applyMatrix4(i),uh.radius+=r,t.ray.intersectsSphere(uh)===!1)return;Om.copy(i).invert(),pa.copy(t.ray).applyMatrix4(Om);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let f=Math.max(0,o.start),p=Math.min(h.count,o.start+o.count);for(let x=f,g=p-1;x<g;x+=c){let m=h.getX(x),M=h.getX(x+1),w=dh(this,t,pa,l,m,M,x);w&&e.push(w)}if(this.isLineLoop){let x=h.getX(p-1),g=h.getX(f),m=dh(this,t,pa,l,x,g,p-1);m&&e.push(m)}}else{let f=Math.max(0,o.start),p=Math.min(u.count,o.start+o.count);for(let x=f,g=p-1;x<g;x+=c){let m=dh(this,t,pa,l,x,x+1,x);m&&e.push(m)}if(this.isLineLoop){let x=dh(this,t,pa,l,p-1,f,p-1);x&&e.push(x)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){let a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};zm=new U,km=new U,Un=class extends ii{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let i=0,r=e.count;i<r;i+=2)zm.fromBufferAttribute(e,i),km.fromBufferAttribute(e,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+zm.distanceTo(km);t.setAttribute("lineDistance",new Xt(n,1))}else Bt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}},ka=class extends ii{constructor(t,e){super(t,e),this.isLineLoop=!0,this.type="LineLoop"}},jr=class extends $e{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new zt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Vm=new re,hf=new Ni,fh=new Ye,ph=new U,Gs=class extends me{constructor(t=new se,e=new jr){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,i=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),fh.copy(n.boundingSphere),fh.applyMatrix4(i),fh.radius+=r,t.ray.intersectsSphere(fh)===!1)return;Vm.copy(i).invert(),hf.copy(t.ray).applyMatrix4(Vm);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,d=n.attributes.position;if(c!==null){let u=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let p=u,x=f;p<x;p++){let g=c.getX(p);ph.fromBufferAttribute(d,g),Gm(ph,g,l,i,t,e,this)}}else{let u=Math.max(0,o.start),f=Math.min(d.count,o.start+o.count);for(let p=u,x=f;p<x;p++)ph.fromBufferAttribute(d,p),Gm(ph,p,l,i,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){let a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};Va=class extends ke{constructor(t,e,n,i,r=Ce,o=Ce,a,l,c){super(t,e,n,i,r,o,a,l,c),this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;let h=this;function d(){h.needsUpdate=!0,h._requestVideoFrameCallbackId=t.requestVideoFrameCallback(d)}"requestVideoFrameCallback"in t&&(this._requestVideoFrameCallbackId=t.requestVideoFrameCallback(d))}clone(){return new this.constructor(this.image).copy(this)}update(){let t=this.image;"requestVideoFrameCallback"in t===!1&&t.readyState>=t.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}dispose(){this._requestVideoFrameCallbackId!==0&&(this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),this._requestVideoFrameCallbackId=0),super.dispose()}},Hh=class extends Va{constructor(t,e,n,i,r,o,a,l){super({},t,e,n,i,r,o,a,l),this.isVideoFrameTexture=!0}update(){}clone(){return new this.constructor().copy(this)}setFrame(t){this.image=t,this.needsUpdate=!0}},Wh=class extends ke{constructor(t,e){super({width:t,height:e}),this.isFramebufferTexture=!0,this.magFilter=ze,this.minFilter=ze,this.generateMipmaps=!1,this.needsUpdate=!0}},Hs=class extends ke{constructor(t,e,n,i,r,o,a,l,c,h,d,u){super(null,o,a,l,c,h,i,r,d,u),this.isCompressedTexture=!0,this.image={width:e,height:n},this.mipmaps=t,this.flipY=!1,this.generateMipmaps=!1}},Xh=class extends Hs{constructor(t,e,n,i,r,o){super(t,e,n,r,o),this.isCompressedArrayTexture=!0,this.image.depth=i,this.wrapR=Mn,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}},qh=class extends Hs{constructor(t,e,n){super(void 0,t[0].width,t[0].height,e,n,oi),this.isCompressedCubeTexture=!0,this.isCubeTexture=!0,this.image=t}},as=class extends ke{constructor(t=[],e=oi,n,i,r,o,a,l,c,h){super(t,e,n,i,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Ws=class extends ke{constructor(t,e,n,i,r,o,a,l,c){super(t,e,n,i,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},Yh=class extends ke{constructor(t,e,n,i,r,o,a,l,c){super(t,e,n,i,r,o,a,l,c),this.isHTMLTexture=!0,this.generateMipmaps=!1,this.needsUpdate=!0;let h=t?t.parentNode:null;h!==null&&"requestPaint"in h&&(h.onpaint=()=>{this.needsUpdate=!0},h.requestPaint())}dispose(){let t=this.image?this.image.parentNode:null;t!==null&&"onpaint"in t&&(t.onpaint=null),super.dispose()}},Fi=class extends ke{constructor(t,e,n=On,i,r,o,a=ze,l=ze,c,h=ni,d=1){if(h!==ni&&h!==Gi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:d};super(u,i,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Xn(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},Ga=class extends Fi{constructor(t,e=On,n=oi,i,r,o=ze,a=ze,l,c=ni){let h={width:t,height:t,depth:1},d=[h,h,h,h,h,h];super(t,t,e,n,i,r,o,a,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},to=class extends ke{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},pi=class s extends se{constructor(t=1,e=1,n=1,i=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:r,depthSegments:o};let a=this;i=Math.floor(i),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],d=[],u=0,f=0;p("z","y","x",-1,-1,n,e,t,o,r,0),p("z","y","x",1,-1,n,e,-t,o,r,1),p("x","z","y",1,1,t,n,e,i,o,2),p("x","z","y",1,-1,t,n,-e,i,o,3),p("x","y","z",1,-1,t,e,n,i,r,4),p("x","y","z",-1,-1,t,e,-n,i,r,5),this.setIndex(l),this.setAttribute("position",new Xt(c,3)),this.setAttribute("normal",new Xt(h,3)),this.setAttribute("uv",new Xt(d,2));function p(x,g,m,M,w,y,S,b,R,v,C){let I=y/R,z=S/v,N=y/2,O=S/2,G=b/2,Y=R+1,J=v+1,rt=0,K=0,Q=new U;for(let et=0;et<J;et++){let ot=et*z-O;for(let Lt=0;Lt<Y;Lt++){let It=Lt*I-N;Q[x]=It*M,Q[g]=ot*w,Q[m]=G,c.push(Q.x,Q.y,Q.z),Q[x]=0,Q[g]=0,Q[m]=b>0?1:-1,h.push(Q.x,Q.y,Q.z),d.push(Lt/R),d.push(1-et/v),rt+=1}}for(let et=0;et<v;et++)for(let ot=0;ot<R;ot++){let Lt=u+ot+Y*et,It=u+ot+Y*(et+1),Wt=u+(ot+1)+Y*(et+1),qt=u+(ot+1)+Y*et;l.push(Lt,It,qt),l.push(It,Wt,qt),K+=6}a.addGroup(f,K,C),f+=K,u+=rt}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},Ha=class s extends se{constructor(t=1,e=1,n=4,i=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:t,height:e,capSegments:n,radialSegments:i,heightSegments:r},e=Math.max(0,e),n=Math.max(1,Math.floor(n)),i=Math.max(3,Math.floor(i)),r=Math.max(1,Math.floor(r));let o=[],a=[],l=[],c=[],h=e/2,d=Math.PI/2*t,u=e,f=2*d+u,p=n*2+r,x=i+1,g=new U,m=new U;for(let M=0;M<=p;M++){let w=0,y=0,S=0,b=0;if(M<=n){let C=M/n,I=C*Math.PI/2;y=-h-t*Math.cos(I),S=t*Math.sin(I),b=-t*Math.cos(I),w=C*d}else if(M<=n+r){let C=(M-n)/r;y=-h+C*e,S=t,b=0,w=d+C*u}else{let C=(M-n-r)/n,I=C*Math.PI/2;y=h+t*Math.sin(I),S=t*Math.cos(I),b=t*Math.sin(I),w=d+u+C*d}let R=Math.max(0,Math.min(1,w/f)),v=0;M===0?v=.5/i:M===p&&(v=-.5/i);for(let C=0;C<=i;C++){let I=C/i,z=I*Math.PI*2,N=Math.sin(z),O=Math.cos(z);m.x=-S*O,m.y=y,m.z=S*N,a.push(m.x,m.y,m.z),g.set(-S*O,b,S*N),g.normalize(),l.push(g.x,g.y,g.z),c.push(I+v,R)}if(M>0){let C=(M-1)*x;for(let I=0;I<i;I++){let z=C+I,N=C+I+1,O=M*x+I,G=M*x+I+1;o.push(z,N,O),o.push(N,G,O)}}}this.setIndex(o),this.setAttribute("position",new Xt(a,3)),this.setAttribute("normal",new Xt(l,3)),this.setAttribute("uv",new Xt(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}},Wa=class s extends se{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);let r=[],o=[],a=[],l=[],c=new U,h=new Mt;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){let f=n+d/e*i;c.x=t*Math.cos(f),c.y=t*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[u]/t+1)/2,h.y=(o[u+1]/t+1)/2,l.push(h.x,h.y)}for(let d=1;d<=e;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new Xt(o,3)),this.setAttribute("normal",new Xt(a,3)),this.setAttribute("uv",new Xt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.segments,t.thetaStart,t.thetaLength)}},eo=class s extends se{constructor(t=1,e=1,n=1,i=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;i=Math.floor(i),r=Math.floor(r);let h=[],d=[],u=[],f=[],p=0,x=[],g=n/2,m=0;M(),o===!1&&(t>0&&w(!0),e>0&&w(!1)),this.setIndex(h),this.setAttribute("position",new Xt(d,3)),this.setAttribute("normal",new Xt(u,3)),this.setAttribute("uv",new Xt(f,2));function M(){let y=new U,S=new U,b=0,R=(e-t)/n;for(let v=0;v<=r;v++){let C=[],I=v/r,z=I*(e-t)+t;for(let N=0;N<=i;N++){let O=N/i,G=O*l+a,Y=Math.sin(G),J=Math.cos(G);S.x=z*Y,S.y=-I*n+g,S.z=z*J,d.push(S.x,S.y,S.z),y.set(Y,R,J).normalize(),u.push(y.x,y.y,y.z),f.push(O,1-I),C.push(p++)}x.push(C)}for(let v=0;v<i;v++)for(let C=0;C<r;C++){let I=x[C][v],z=x[C+1][v],N=x[C+1][v+1],O=x[C][v+1];(t>0||C!==0)&&(h.push(I,z,O),b+=3),(e>0||C!==r-1)&&(h.push(z,N,O),b+=3)}c.addGroup(m,b,0),m+=b}function w(y){let S=p,b=new Mt,R=new U,v=0,C=y===!0?t:e,I=y===!0?1:-1;for(let N=1;N<=i;N++)d.push(0,g*I,0),u.push(0,I,0),f.push(.5,.5),p++;let z=p;for(let N=0;N<=i;N++){let G=N/i*l+a,Y=Math.cos(G),J=Math.sin(G);R.x=C*J,R.y=g*I,R.z=C*Y,d.push(R.x,R.y,R.z),u.push(0,I,0),b.x=Y*.5+.5,b.y=J*.5*I+.5,f.push(b.x,b.y),p++}for(let N=0;N<i;N++){let O=S+N,G=z+N;y===!0?h.push(G,G+1,O):h.push(G+1,G,O),v+=3}c.addGroup(m,v,y===!0?1:2),m+=v}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},no=class s extends eo{constructor(t=1,e=1,n=32,i=1,r=!1,o=0,a=Math.PI*2){super(0,t,e,n,i,r,o,a),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(t){return new s(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Oi=class s extends se{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};let r=[],o=[];a(i),c(n),h(),this.setAttribute("position",new Xt(r,3)),this.setAttribute("normal",new Xt(r.slice(),3)),this.setAttribute("uv",new Xt(o,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(M){let w=new U,y=new U,S=new U;for(let b=0;b<e.length;b+=3)f(e[b+0],w),f(e[b+1],y),f(e[b+2],S),l(w,y,S,M)}function l(M,w,y,S){let b=S+1,R=[];for(let v=0;v<=b;v++){R[v]=[];let C=M.clone().lerp(y,v/b),I=w.clone().lerp(y,v/b),z=b-v;for(let N=0;N<=z;N++)N===0&&v===b?R[v][N]=C:R[v][N]=C.clone().lerp(I,N/z)}for(let v=0;v<b;v++)for(let C=0;C<2*(b-v)-1;C++){let I=Math.floor(C/2);C%2===0?(u(R[v][I+1]),u(R[v+1][I]),u(R[v][I])):(u(R[v][I+1]),u(R[v+1][I+1]),u(R[v+1][I]))}}function c(M){let w=new U;for(let y=0;y<r.length;y+=3)w.x=r[y+0],w.y=r[y+1],w.z=r[y+2],w.normalize().multiplyScalar(M),r[y+0]=w.x,r[y+1]=w.y,r[y+2]=w.z}function h(){let M=new U;for(let w=0;w<r.length;w+=3){M.x=r[w+0],M.y=r[w+1],M.z=r[w+2];let y=g(M)/2/Math.PI+.5,S=m(M)/Math.PI+.5;o.push(y,1-S)}p(),d()}function d(){for(let M=0;M<o.length;M+=6){let w=o[M+0],y=o[M+2],S=o[M+4],b=Math.max(w,y,S),R=Math.min(w,y,S);b>.9&&R<.1&&(w<.2&&(o[M+0]+=1),y<.2&&(o[M+2]+=1),S<.2&&(o[M+4]+=1))}}function u(M){r.push(M.x,M.y,M.z)}function f(M,w){let y=M*3;w.x=t[y+0],w.y=t[y+1],w.z=t[y+2]}function p(){let M=new U,w=new U,y=new U,S=new U,b=new Mt,R=new Mt,v=new Mt;for(let C=0,I=0;C<r.length;C+=9,I+=6){M.set(r[C+0],r[C+1],r[C+2]),w.set(r[C+3],r[C+4],r[C+5]),y.set(r[C+6],r[C+7],r[C+8]),b.set(o[I+0],o[I+1]),R.set(o[I+2],o[I+3]),v.set(o[I+4],o[I+5]),S.copy(M).add(w).add(y).divideScalar(3);let z=g(S);x(b,I+0,M,z),x(R,I+2,w,z),x(v,I+4,y,z)}}function x(M,w,y,S){S<0&&M.x===1&&(o[w]=M.x-1),y.x===0&&y.z===0&&(o[w]=S/2/Math.PI+.5)}function g(M){return Math.atan2(M.z,-M.x)}function m(M){return Math.atan2(-M.y,Math.sqrt(M.x*M.x+M.z*M.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.vertices,t.indices,t.radius,t.detail)}},Xa=class s extends Oi{constructor(t=1,e=0){let n=(1+Math.sqrt(5))/2,i=1/n,r=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-i,-n,0,-i,n,0,i,-n,0,i,n,-i,-n,0,-i,n,0,i,-n,0,i,n,0,-n,0,-i,n,0,-i,-n,0,i,n,0,i],o=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(r,o,t,e),this.type="DodecahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new s(t.radius,t.detail)}},mh=new U,gh=new U,Kd=new U,xh=new ti,qa=class extends se{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let i=Math.pow(10,4),r=Math.cos(Ds*e),o=t.getIndex(),a=t.getAttribute("position"),l=o?o.count:a.count,c=[0,0,0],h=["a","b","c"],d=new Array(3),u={},f=[];for(let p=0;p<l;p+=3){o?(c[0]=o.getX(p),c[1]=o.getX(p+1),c[2]=o.getX(p+2)):(c[0]=p,c[1]=p+1,c[2]=p+2);let{a:x,b:g,c:m}=xh;if(x.fromBufferAttribute(a,c[0]),g.fromBufferAttribute(a,c[1]),m.fromBufferAttribute(a,c[2]),xh.getNormal(Kd),d[0]=`${Math.round(x.x*i)},${Math.round(x.y*i)},${Math.round(x.z*i)}`,d[1]=`${Math.round(g.x*i)},${Math.round(g.y*i)},${Math.round(g.z*i)}`,d[2]=`${Math.round(m.x*i)},${Math.round(m.y*i)},${Math.round(m.z*i)}`,!(d[0]===d[1]||d[1]===d[2]||d[2]===d[0]))for(let M=0;M<3;M++){let w=(M+1)%3,y=d[M],S=d[w],b=xh[h[M]],R=xh[h[w]],v=`${y}_${S}`,C=`${S}_${y}`;C in u&&u[C]?(Kd.dot(u[C].normal)<=r&&(f.push(b.x,b.y,b.z),f.push(R.x,R.y,R.z)),u[C]=null):v in u||(u[v]={index0:c[M],index1:c[w],normal:Kd.clone()})}}for(let p in u)if(u[p]){let{index0:x,index1:g}=u[p];mh.fromBufferAttribute(a,x),gh.fromBufferAttribute(a,g),f.push(mh.x,mh.y,mh.z),f.push(gh.x,gh.y,gh.z)}this.setAttribute("position",new Xt(f,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}},Pn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Bt("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,i=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(i),e.push(r),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),i=0,r=n.length,o;e?o=e:o=t*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(i=Math.floor(a+(l-a)/2),c=n[i]-o,c<0)a=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===o)return i/(r-1);let h=n[i],u=n[i+1]-h,f=(o-h)/u;return(i+f)/(r-1)}getTangent(t,e){let i=t-1e-4,r=t+1e-4;i<0&&(i=0),r>1&&(r=1);let o=this.getPoint(i),a=this.getPoint(r),l=e||(o.isVector2?new Mt:new U);return l.copy(a).sub(o).normalize(),l}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new U,i=[],r=[],o=[],a=new U,l=new re;for(let f=0;f<=t;f++){let p=f/t;i[f]=this.getTangentAt(p,new U)}r[0]=new U,o[0]=new U;let c=Number.MAX_VALUE,h=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=c&&(c=h,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),u<=c&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),r[0].crossVectors(i[0],a),o[0].crossVectors(i[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(i[f-1],i[f]),a.length()>Number.EPSILON){a.normalize();let p=Math.acos(ie(i[f-1].dot(i[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(a,p))}o[f].crossVectors(i[f],r[f])}if(e===!0){let f=Math.acos(ie(r[0].dot(r[t]),-1,1));f/=t,i[0].dot(a.crossVectors(r[0],r[t]))>0&&(f=-f);for(let p=1;p<=t;p++)r[p].applyMatrix4(l.makeRotationAxis(i[p],f*p)),o[p].crossVectors(i[p],r[p])}return{tangents:i,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},Xs=class extends Pn{constructor(t=0,e=0,n=1,i=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new Mt){let n=e,i=Math.PI*2,r=this.aEndAngle-this.aStartAngle,o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=i;for(;r>i;)r-=i;r<Number.EPSILON&&(o?r=0:r=i),this.aClockwise===!0&&!o&&(r===i?r=-i:r=r-i);let a=this.aStartAngle+t*r,l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,f=c-this.aY;l=u*h-f*d+this.aX,c=u*d+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},Ya=class extends Xs{constructor(t,e,n,i,r,o){super(t,e,n,n,i,r,o),this.isArcCurve=!0,this.type="ArcCurve"}};Hm=new U,Wm=new U,Qd=new op,jd=new op,tf=new op,$a=class extends Pn{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new U){let n=e,i=this.points,r=i.length,o=(r-(this.closed?0:1))*t,a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=i[(a-1)%r]:(Wm.subVectors(i[0],i[1]).add(i[0]),c=Wm);let d=i[a%r],u=i[(a+1)%r];if(this.closed||a+2<r?h=i[(a+2)%r]:(Hm.subVectors(i[r-1],i[r-2]).add(i[r-1]),h=Hm),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,p=Math.pow(c.distanceToSquared(d),f),x=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);x<1e-4&&(x=1),p<1e-4&&(p=x),g<1e-4&&(g=x),Qd.initNonuniformCatmullRom(c.x,d.x,u.x,h.x,p,x,g),jd.initNonuniformCatmullRom(c.y,d.y,u.y,h.y,p,x,g),tf.initNonuniformCatmullRom(c.z,d.z,u.z,h.z,p,x,g)}else this.curveType==="catmullrom"&&(Qd.initCatmullRom(c.x,d.x,u.x,h.x,this.tension),jd.initCatmullRom(c.y,d.y,u.y,h.y,this.tension),tf.initCatmullRom(c.z,d.z,u.z,h.z,this.tension));return n.set(Qd.calc(l),jd.calc(l),tf.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(new U().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};io=class extends Pn{constructor(t=new Mt,e=new Mt,n=new Mt,i=new Mt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new Mt){let n=e,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ma(t,i.x,r.x,o.x,a.x),Ma(t,i.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Za=class extends Pn{constructor(t=new U,e=new U,n=new U,i=new U){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new U){let n=e,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ma(t,i.x,r.x,o.x,a.x),Ma(t,i.y,r.y,o.y,a.y),Ma(t,i.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},so=class extends Pn{constructor(t=new Mt,e=new Mt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Mt){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Mt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Ja=class extends Pn{constructor(t=new U,e=new U){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new U){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new U){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},ro=class extends Pn{constructor(t=new Mt,e=new Mt,n=new Mt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new Mt){let n=e,i=this.v0,r=this.v1,o=this.v2;return n.set(ya(t,i.x,r.x,o.x),ya(t,i.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},oo=class extends Pn{constructor(t=new U,e=new U,n=new U){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new U){let n=e,i=this.v0,r=this.v1,o=this.v2;return n.set(ya(t,i.x,r.x,o.x),ya(t,i.y,r.y,o.y),ya(t,i.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},ao=class extends Pn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Mt){let n=e,i=this.points,r=(i.length-1)*t,o=Math.floor(r),a=r-o,l=i[o===0?o:o-1],c=i[o],h=i[o>i.length-2?i.length-1:o+1],d=i[o>i.length-3?i.length-1:o+2];return n.set(Xm(a,l.x,c.x,h.x,d.x),Xm(a,l.y,c.y,h.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(i.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(new Mt().fromArray(i))}return this}},$h=Object.freeze({__proto__:null,ArcCurve:Ya,CatmullRomCurve3:$a,CubicBezierCurve:io,CubicBezierCurve3:Za,EllipseCurve:Xs,LineCurve:so,LineCurve3:Ja,QuadraticBezierCurve:ro,QuadraticBezierCurve3:oo,SplineCurve:ao}),Ka=class extends Pn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new $h[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),i=this.getCurveLengths(),r=0;for(;r<i.length;){if(i[r]>=n){let o=i[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let i=0,r=this.curves;i<r.length;i++){let o=r[i],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(a);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let i=t.curves[e];this.curves.push(new $h[i.type]().fromJSON(i))}return this}},ls=class extends Ka{constructor(t){super(),this.type="Path",this.currentPoint=new Mt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new so(this.currentPoint.clone(),new Mt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){let r=new ro(this.currentPoint.clone(),new Mt(t,e),new Mt(n,i));return this.curves.push(r),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,r,o){let a=new io(this.currentPoint.clone(),new Mt(t,e),new Mt(n,i),new Mt(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new ao(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,r,o){let a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,i,r,o),this}absarc(t,e,n,i,r,o){return this.absellipse(t,e,n,n,i,r,o),this}ellipse(t,e,n,i,r,o,a,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,i,r,o,a,l),this}absellipse(t,e,n,i,r,o,a,l){let c=new Xs(t,e,n,i,r,o,a,l);if(this.curves.length>0){let d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},cs=class extends ls{constructor(t){super(t),this.uuid=Dn(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,i=this.holes.length;n<i;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let i=t.holes[e];this.holes.push(i.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let i=this.holes[e];t.holes.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let i=t.holes[e];this.holes.push(new ls().fromJSON(i))}return this}};ff=class{static triangulate(t,e,n=2){return V_(t,e,n)}},qn=class s{static area(t){let e=t.length,n=0;for(let i=e-1,r=0;r<e;i=r++)n+=t[i].x*t[r].y-t[r].x*t[i].y;return n*.5}static isClockWise(t){return s.area(t)<0}static triangulateShape(t,e){let n=[],i=[],r=[];Ym(t),$m(n,t);let o=t.length;e.forEach(Ym);for(let l=0;l<e.length;l++)i.push(o),o+=e[l].length,$m(n,e[l]);let a=ff.triangulate(n,i);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}};el=class s extends se{constructor(t=new cs([new Mt(.5,.5),new Mt(-.5,.5),new Mt(-.5,-.5),new Mt(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,i=[],r=[];for(let a=0,l=t.length;a<l;a++){let c=t[a];o(c)}this.setAttribute("position",new Xt(i,3)),this.setAttribute("uv",new Xt(r,2)),this.computeVertexNormals();function o(a){let l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,d=e.depth!==void 0?e.depth:1,u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,f=e.bevelThickness!==void 0?e.bevelThickness:.2,p=e.bevelSize!==void 0?e.bevelSize:f-.1,x=e.bevelOffset!==void 0?e.bevelOffset:0,g=e.bevelSegments!==void 0?e.bevelSegments:3,m=e.extrudePath,M=e.UVGenerator!==void 0?e.UVGenerator:sv,w,y=!1,S,b,R,v;if(m){w=m.getSpacedPoints(h),y=!0,u=!1;let xt=m.isCatmullRomCurve3?m.closed:!1;S=m.computeFrenetFrames(h,xt),b=new U,R=new U,v=new U}u||(g=0,f=0,p=0,x=0);let C=a.extractPoints(c),I=C.shape,z=C.holes;if(!qn.isClockWise(I)){I=I.reverse();for(let xt=0,wt=z.length;xt<wt;xt++){let Ct=z[xt];qn.isClockWise(Ct)&&(z[xt]=Ct.reverse())}}function O(xt){let Ct=10000000000000001e-36,Pt=xt[0];for(let at=1;at<=xt.length;at++){let Ut=at%xt.length,pt=xt[Ut],Et=pt.x-Pt.x,Ot=pt.y-Pt.y,k=Et*Et+Ot*Ot,jt=Math.max(Math.abs(pt.x),Math.abs(pt.y),Math.abs(Pt.x),Math.abs(Pt.y)),$=Ct*jt*jt;if(k<=$){xt.splice(Ut,1),at--;continue}Pt=pt}}O(I),z.forEach(O);let G=z.length,Y=I;for(let xt=0;xt<G;xt++){let wt=z[xt];I=I.concat(wt)}function J(xt,wt,Ct){return wt||Qt("ExtrudeGeometry: vec does not exist"),xt.clone().addScaledVector(wt,Ct)}let rt=I.length;function K(xt,wt,Ct){let Pt,at,Ut,pt=xt.x-wt.x,Et=xt.y-wt.y,Ot=Ct.x-xt.x,k=Ct.y-xt.y,jt=pt*pt+Et*Et,$=pt*k-Et*Ot;if(Math.abs($)>Number.EPSILON){let T=Math.sqrt(jt),_=Math.sqrt(Ot*Ot+k*k),A=wt.x-Et/T,L=wt.y+pt/T,D=Ct.x-k/_,F=Ct.y+Ot/_,V=((D-A)*k-(F-L)*Ot)/(pt*k-Et*Ot);Pt=A+pt*V-xt.x,at=L+Et*V-xt.y;let B=Pt*Pt+at*at;if(B<=2)return new Mt(Pt,at);Ut=Math.sqrt(B/2)}else{let T=!1;pt>Number.EPSILON?Ot>Number.EPSILON&&(T=!0):pt<-Number.EPSILON?Ot<-Number.EPSILON&&(T=!0):Math.sign(Et)===Math.sign(k)&&(T=!0),T?(Pt=-Et,at=pt,Ut=Math.sqrt(jt)):(Pt=pt,at=Et,Ut=Math.sqrt(jt/2))}return new Mt(Pt/Ut,at/Ut)}let Q=[];for(let xt=0,wt=Y.length,Ct=wt-1,Pt=xt+1;xt<wt;xt++,Ct++,Pt++)Ct===wt&&(Ct=0),Pt===wt&&(Pt=0),Q[xt]=K(Y[xt],Y[Ct],Y[Pt]);let et=[],ot,Lt=Q.concat();for(let xt=0,wt=G;xt<wt;xt++){let Ct=z[xt];ot=[];for(let Pt=0,at=Ct.length,Ut=at-1,pt=Pt+1;Pt<at;Pt++,Ut++,pt++)Ut===at&&(Ut=0),pt===at&&(pt=0),ot[Pt]=K(Ct[Pt],Ct[Ut],Ct[pt]);et.push(ot),Lt=Lt.concat(ot)}let It;if(g===0)It=qn.triangulateShape(Y,z);else{let xt=[],wt=[];for(let Ct=0;Ct<g;Ct++){let Pt=Ct/g,at=f*Math.cos(Pt*Math.PI/2),Ut=p*Math.sin(Pt*Math.PI/2)+x;for(let pt=0,Et=Y.length;pt<Et;pt++){let Ot=J(Y[pt],Q[pt],Ut);dt(Ot.x,Ot.y,-at),Pt===0&&xt.push(Ot)}for(let pt=0,Et=G;pt<Et;pt++){let Ot=z[pt];ot=et[pt];let k=[];for(let jt=0,$=Ot.length;jt<$;jt++){let T=J(Ot[jt],ot[jt],Ut);dt(T.x,T.y,-at),Pt===0&&k.push(T)}Pt===0&&wt.push(k)}}It=qn.triangulateShape(xt,wt)}let Wt=It.length,qt=p+x;for(let xt=0;xt<rt;xt++){let wt=u?J(I[xt],Lt[xt],qt):I[xt];y?(R.copy(S.normals[0]).multiplyScalar(wt.x),b.copy(S.binormals[0]).multiplyScalar(wt.y),v.copy(w[0]).add(R).add(b),dt(v.x,v.y,v.z)):dt(wt.x,wt.y,0)}for(let xt=1;xt<=h;xt++)for(let wt=0;wt<rt;wt++){let Ct=u?J(I[wt],Lt[wt],qt):I[wt];y?(R.copy(S.normals[xt]).multiplyScalar(Ct.x),b.copy(S.binormals[xt]).multiplyScalar(Ct.y),v.copy(w[xt]).add(R).add(b),dt(v.x,v.y,v.z)):dt(Ct.x,Ct.y,d/h*xt)}for(let xt=g-1;xt>=0;xt--){let wt=xt/g,Ct=f*Math.cos(wt*Math.PI/2),Pt=p*Math.sin(wt*Math.PI/2)+x;for(let at=0,Ut=Y.length;at<Ut;at++){let pt=J(Y[at],Q[at],Pt);dt(pt.x,pt.y,d+Ct)}for(let at=0,Ut=z.length;at<Ut;at++){let pt=z[at];ot=et[at];for(let Et=0,Ot=pt.length;Et<Ot;Et++){let k=J(pt[Et],ot[Et],Pt);y?dt(k.x,k.y+w[h-1].y,w[h-1].x+Ct):dt(k.x,k.y,d+Ct)}}}Zt(),st();function Zt(){let xt=i.length/3;if(u){let wt=0,Ct=rt*wt;for(let Pt=0;Pt<Wt;Pt++){let at=It[Pt];Tt(at[2]+Ct,at[1]+Ct,at[0]+Ct)}wt=h+g*2,Ct=rt*wt;for(let Pt=0;Pt<Wt;Pt++){let at=It[Pt];Tt(at[0]+Ct,at[1]+Ct,at[2]+Ct)}}else{for(let wt=0;wt<Wt;wt++){let Ct=It[wt];Tt(Ct[2],Ct[1],Ct[0])}for(let wt=0;wt<Wt;wt++){let Ct=It[wt];Tt(Ct[0]+rt*h,Ct[1]+rt*h,Ct[2]+rt*h)}}n.addGroup(xt,i.length/3-xt,0)}function st(){let xt=i.length/3,wt=0;ht(Y,wt),wt+=Y.length;for(let Ct=0,Pt=z.length;Ct<Pt;Ct++){let at=z[Ct];ht(at,wt),wt+=at.length}n.addGroup(xt,i.length/3-xt,1)}function ht(xt,wt){let Ct=xt.length;for(;--Ct>=0;){let Pt=Ct,at=Ct-1;at<0&&(at=xt.length-1);for(let Ut=0,pt=h+g*2;Ut<pt;Ut++){let Et=rt*Ut,Ot=rt*(Ut+1),k=wt+Pt+Et,jt=wt+at+Et,$=wt+at+Ot,T=wt+Pt+Ot;At(k,jt,$,T)}}}function dt(xt,wt,Ct){l.push(xt),l.push(wt),l.push(Ct)}function Tt(xt,wt,Ct){Dt(xt),Dt(wt),Dt(Ct);let Pt=i.length/3,at=M.generateTopUV(n,i,Pt-3,Pt-2,Pt-1);ne(at[0]),ne(at[1]),ne(at[2])}function At(xt,wt,Ct,Pt){Dt(xt),Dt(wt),Dt(Pt),Dt(wt),Dt(Ct),Dt(Pt);let at=i.length/3,Ut=M.generateSideWallUV(n,i,at-6,at-3,at-2,at-1);ne(Ut[0]),ne(Ut[1]),ne(Ut[3]),ne(Ut[1]),ne(Ut[2]),ne(Ut[3])}function Dt(xt){i.push(l[xt*3+0]),i.push(l[xt*3+1]),i.push(l[xt*3+2])}function ne(xt){r.push(xt.x),r.push(xt.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return rv(e,n,t)}static fromJSON(t,e){let n=[];for(let r=0,o=t.shapes.length;r<o;r++){let a=e[t.shapes[r]];n.push(a)}let i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new $h[i.type]().fromJSON(i)),new s(n,t.options)}},sv={generateTopUV:function(s,t,e,n,i){let r=t[e*3],o=t[e*3+1],a=t[n*3],l=t[n*3+1],c=t[i*3],h=t[i*3+1];return[new Mt(r,o),new Mt(a,l),new Mt(c,h)]},generateSideWallUV:function(s,t,e,n,i,r){let o=t[e*3],a=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],d=t[n*3+2],u=t[i*3],f=t[i*3+1],p=t[i*3+2],x=t[r*3],g=t[r*3+1],m=t[r*3+2];return Math.abs(a-h)<Math.abs(o-c)?[new Mt(o,1-l),new Mt(c,1-d),new Mt(u,1-p),new Mt(x,1-m)]:[new Mt(a,1-l),new Mt(h,1-d),new Mt(f,1-p),new Mt(g,1-m)]}};nl=class s extends Oi{constructor(t=1,e=0){let n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,r,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new s(t.radius,t.detail)}},il=class s extends se{constructor(t=[new Mt(0,-.5),new Mt(.5,0),new Mt(0,.5)],e=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:i},e=Math.floor(e),i=ie(i,0,Math.PI*2);let r=[],o=[],a=[],l=[],c=[],h=1/e,d=new U,u=new Mt,f=new U,p=new U,x=new U,g=0,m=0;for(let M=0;M<=t.length-1;M++)switch(M){case 0:g=t[M+1].x-t[M].x,m=t[M+1].y-t[M].y,f.x=m*1,f.y=-g,f.z=m*0,x.copy(f),f.normalize(),l.push(f.x,f.y,f.z);break;case t.length-1:l.push(x.x,x.y,x.z);break;default:g=t[M+1].x-t[M].x,m=t[M+1].y-t[M].y,f.x=m*1,f.y=-g,f.z=m*0,p.copy(f),f.x+=x.x,f.y+=x.y,f.z+=x.z,f.normalize(),l.push(f.x,f.y,f.z),x.copy(p)}for(let M=0;M<=e;M++){let w=n+M*h*i,y=Math.sin(w),S=Math.cos(w);for(let b=0;b<=t.length-1;b++){d.x=t[b].x*y,d.y=t[b].y,d.z=t[b].x*S,o.push(d.x,d.y,d.z),u.x=M/e,u.y=b/(t.length-1),a.push(u.x,u.y);let R=l[3*b+0]*y,v=l[3*b+1],C=l[3*b+0]*S;c.push(R,v,C)}}for(let M=0;M<e;M++)for(let w=0;w<t.length-1;w++){let y=w+M*t.length,S=y,b=y+t.length,R=y+t.length+1,v=y+1;r.push(S,b,v),r.push(R,v,b)}this.setIndex(r),this.setAttribute("position",new Xt(o,3)),this.setAttribute("uv",new Xt(a,2)),this.setAttribute("normal",new Xt(c,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.points,t.segments,t.phiStart,t.phiLength)}},co=class s extends Oi{constructor(t=1,e=0){let n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],i=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,i,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new s(t.radius,t.detail)}},Ys=class s extends se{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};let r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,d=t/a,u=e/l,f=[],p=[],x=[],g=[];for(let m=0;m<h;m++){let M=m*u-o;for(let w=0;w<c;w++){let y=w*d-r;p.push(y,-M,0),x.push(0,0,1),g.push(w/a),g.push(1-m/l)}}for(let m=0;m<l;m++)for(let M=0;M<a;M++){let w=M+c*m,y=M+c*(m+1),S=M+1+c*(m+1),b=M+1+c*m;f.push(w,y,b),f.push(y,S,b)}this.setIndex(f),this.setAttribute("position",new Xt(p,3)),this.setAttribute("normal",new Xt(x,3)),this.setAttribute("uv",new Xt(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.width,t.height,t.widthSegments,t.heightSegments)}},sl=class s extends se{constructor(t=.5,e=1,n=32,i=1,r=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:n,phiSegments:i,thetaStart:r,thetaLength:o},n=Math.max(3,n),i=Math.max(1,i);let a=[],l=[],c=[],h=[],d=t,u=(e-t)/i,f=new U,p=new Mt;for(let x=0;x<=i;x++){for(let g=0;g<=n;g++){let m=r+g/n*o;f.x=d*Math.cos(m),f.y=d*Math.sin(m),l.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/e+1)/2,p.y=(f.y/e+1)/2,h.push(p.x,p.y)}d+=u}for(let x=0;x<i;x++){let g=x*(n+1);for(let m=0;m<n;m++){let M=m+g,w=M,y=M+n+1,S=M+n+2,b=M+1;a.push(w,y,b),a.push(y,S,b)}}this.setIndex(a),this.setAttribute("position",new Xt(l,3)),this.setAttribute("normal",new Xt(c,3)),this.setAttribute("uv",new Xt(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},rl=class s extends se{constructor(t=new cs([new Mt(0,.5),new Mt(-.5,-.5),new Mt(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let n=[],i=[],r=[],o=[],a=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(a,l,h),a+=l,l=0;this.setIndex(n),this.setAttribute("position",new Xt(i,3)),this.setAttribute("normal",new Xt(r,3)),this.setAttribute("uv",new Xt(o,2));function c(h){let d=i.length/3,u=h.extractPoints(e),f=u.shape,p=u.holes;qn.isClockWise(f)===!1&&(f=f.reverse());for(let g=0,m=p.length;g<m;g++){let M=p[g];qn.isClockWise(M)===!0&&(p[g]=M.reverse())}let x=qn.triangulateShape(f,p);for(let g=0,m=p.length;g<m;g++){let M=p[g];f=f.concat(M)}for(let g=0,m=f.length;g<m;g++){let M=f[g];i.push(M.x,M.y,0),r.push(0,0,1),o.push(M.x,M.y)}for(let g=0,m=x.length;g<m;g++){let M=x[g],w=M[0]+d,y=M[1]+d,S=M[2]+d;n.push(w,y,S),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return ov(e,t)}static fromJSON(t,e){let n=[];for(let i=0,r=t.shapes.length;i<r;i++){let o=e[t.shapes[i]];n.push(o)}return new s(n,t.curveSegments)}};ho=class s extends se{constructor(t=1,e=32,n=16,i=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],d=new U,u=new U,f=[],p=[],x=[],g=[];for(let m=0;m<=n;m++){let M=[],w=m/n,y=o+w*a,S=t*Math.cos(y),b=Math.sqrt(t*t-S*S),R=0;m===0&&o===0?R=.5/e:m===n&&l===Math.PI&&(R=-.5/e);for(let v=0;v<=e;v++){let C=v/e,I=i+C*r;d.x=-b*Math.cos(I),d.y=S,d.z=b*Math.sin(I),p.push(d.x,d.y,d.z),u.copy(d).normalize(),x.push(u.x,u.y,u.z),g.push(C+R,1-w),M.push(c++)}h.push(M)}for(let m=0;m<n;m++)for(let M=0;M<e;M++){let w=h[m][M+1],y=h[m][M],S=h[m+1][M],b=h[m+1][M+1];(m!==0||o>0)&&f.push(w,y,b),(m!==n-1||l<Math.PI)&&f.push(y,S,b)}this.setIndex(f),this.setAttribute("position",new Xt(p,3)),this.setAttribute("normal",new Xt(x,3)),this.setAttribute("uv",new Xt(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},ol=class s extends Oi{constructor(t=1,e=0){let n=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],i=[2,1,0,0,3,2,1,3,0,2,3,1];super(n,i,t,e),this.type="TetrahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new s(t.radius,t.detail)}},al=class s extends se{constructor(t=1,e=.4,n=12,i=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),i=Math.floor(i);let l=[],c=[],h=[],d=[],u=new U,f=new U,p=new U;for(let x=0;x<=n;x++){let g=o+x/n*a;for(let m=0;m<=i;m++){let M=m/i*r;f.x=(t+e*Math.cos(g))*Math.cos(M),f.y=(t+e*Math.cos(g))*Math.sin(M),f.z=e*Math.sin(g),c.push(f.x,f.y,f.z),u.x=t*Math.cos(M),u.y=t*Math.sin(M),p.subVectors(f,u).normalize(),h.push(p.x,p.y,p.z),d.push(m/i),d.push(x/n)}}for(let x=1;x<=n;x++)for(let g=1;g<=i;g++){let m=(i+1)*x+g-1,M=(i+1)*(x-1)+g-1,w=(i+1)*(x-1)+g,y=(i+1)*x+g;l.push(m,M,y),l.push(M,w,y)}this.setIndex(l),this.setAttribute("position",new Xt(c,3)),this.setAttribute("normal",new Xt(h,3)),this.setAttribute("uv",new Xt(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}},ll=class s extends se{constructor(t=1,e=.4,n=64,i=8,r=2,o=3){super(),this.type="TorusKnotGeometry",this.parameters={radius:t,tube:e,tubularSegments:n,radialSegments:i,p:r,q:o},n=Math.floor(n),i=Math.floor(i);let a=[],l=[],c=[],h=[],d=new U,u=new U,f=new U,p=new U,x=new U,g=new U,m=new U;for(let w=0;w<=n;++w){let y=w/n*r*Math.PI*2;M(y,r,o,t,f),M(y+.01,r,o,t,p),g.subVectors(p,f),m.addVectors(p,f),x.crossVectors(g,m),m.crossVectors(x,g),x.normalize(),m.normalize();for(let S=0;S<=i;++S){let b=S/i*Math.PI*2,R=-e*Math.cos(b),v=e*Math.sin(b);d.x=f.x+(R*m.x+v*x.x),d.y=f.y+(R*m.y+v*x.y),d.z=f.z+(R*m.z+v*x.z),l.push(d.x,d.y,d.z),u.subVectors(d,f).normalize(),c.push(u.x,u.y,u.z),h.push(w/n),h.push(S/i)}}for(let w=1;w<=n;w++)for(let y=1;y<=i;y++){let S=(i+1)*(w-1)+(y-1),b=(i+1)*w+(y-1),R=(i+1)*w+y,v=(i+1)*(w-1)+y;a.push(S,b,v),a.push(b,R,v)}this.setIndex(a),this.setAttribute("position",new Xt(l,3)),this.setAttribute("normal",new Xt(c,3)),this.setAttribute("uv",new Xt(h,2));function M(w,y,S,b,R){let v=Math.cos(w),C=Math.sin(w),I=S/y*w,z=Math.cos(I);R.x=b*(2+z)*.5*v,R.y=b*(2+z)*C*.5,R.z=b*Math.sin(I)*.5}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.tube,t.tubularSegments,t.radialSegments,t.p,t.q)}},cl=class s extends se{constructor(t=new oo(new U(-1,-1,0),new U(-1,1,0),new U(1,1,0)),e=64,n=1,i=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:i,closed:r};let o=t.computeFrenetFrames(e,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let a=new U,l=new U,c=new Mt,h=new U,d=[],u=[],f=[],p=[];x(),this.setIndex(p),this.setAttribute("position",new Xt(d,3)),this.setAttribute("normal",new Xt(u,3)),this.setAttribute("uv",new Xt(f,2));function x(){for(let w=0;w<e;w++)g(w);g(r===!1?e:0),M(),m()}function g(w){h=t.getPointAt(w/e,h);let y=o.normals[w],S=o.binormals[w];for(let b=0;b<=i;b++){let R=b/i*Math.PI*2,v=Math.sin(R),C=-Math.cos(R);l.x=C*y.x+v*S.x,l.y=C*y.y+v*S.y,l.z=C*y.z+v*S.z,l.normalize(),u.push(l.x,l.y,l.z),a.x=h.x+n*l.x,a.y=h.y+n*l.y,a.z=h.z+n*l.z,d.push(a.x,a.y,a.z)}}function m(){for(let w=1;w<=e;w++)for(let y=1;y<=i;y++){let S=(i+1)*(w-1)+(y-1),b=(i+1)*w+(y-1),R=(i+1)*w+y,v=(i+1)*(w-1)+y;p.push(S,b,v),p.push(b,R,v)}}function M(){for(let w=0;w<=e;w++)for(let y=0;y<=i;y++)c.x=w/e,c.y=y/i,f.push(c.x,c.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new s(new $h[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}},hl=class extends se{constructor(t=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:t},t!==null){let e=[],n=new Set,i=new U,r=new U;if(t.index!==null){let o=t.attributes.position,a=t.index,l=t.groups;l.length===0&&(l=[{start:0,count:a.count,materialIndex:0}]);for(let c=0,h=l.length;c<h;++c){let d=l[c],u=d.start,f=d.count;for(let p=u,x=u+f;p<x;p+=3)for(let g=0;g<3;g++){let m=a.getX(p+g),M=a.getX(p+(g+1)%3);i.fromBufferAttribute(o,m),r.fromBufferAttribute(o,M),Zm(i,r,n)===!0&&(e.push(i.x,i.y,i.z),e.push(r.x,r.y,r.z))}}}else{let o=t.attributes.position;for(let a=0,l=o.count/3;a<l;a++)for(let c=0;c<3;c++){let h=3*a+c,d=3*a+(c+1)%3;i.fromBufferAttribute(o,h),r.fromBufferAttribute(o,d),Zm(i,r,n)===!0&&(e.push(i.x,i.y,i.z),e.push(r.x,r.y,r.z))}}this.setAttribute("position",new Xt(e,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}};Jm=Object.freeze({__proto__:null,BoxGeometry:pi,CapsuleGeometry:Ha,CircleGeometry:Wa,ConeGeometry:no,CylinderGeometry:eo,DodecahedronGeometry:Xa,EdgesGeometry:qa,ExtrudeGeometry:el,IcosahedronGeometry:nl,LatheGeometry:il,OctahedronGeometry:co,PlaneGeometry:Ys,PolyhedronGeometry:Oi,RingGeometry:sl,ShapeGeometry:rl,SphereGeometry:ho,TetrahedronGeometry:ol,TorusGeometry:al,TorusKnotGeometry:ll,TubeGeometry:cl,WireframeGeometry:hl}),ul=class extends $e{constructor(t){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new zt(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}};yi={clone:ar,merge:gn},lv=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,cv=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Pe=class extends $e{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=lv,this.fragmentShader=cv,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ar(t.uniforms),this.uniformsGroups=av(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let i in this.uniforms){let o=this.uniforms[i].value;o&&o.isTexture?e.uniforms[i]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[i]={type:"m4",value:o.toArray()}:e.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let i=t.uniforms[n];switch(this.uniforms[n]={},i.type){case"t":this.uniforms[n].value=e[i.value]||null;break;case"c":this.uniforms[n].value=new zt().setHex(i.value);break;case"v2":this.uniforms[n].value=new Mt().fromArray(i.value);break;case"v3":this.uniforms[n].value=new U().fromArray(i.value);break;case"v4":this.uniforms[n].value=new be().fromArray(i.value);break;case"m3":this.uniforms[n].value=new oe().fromArray(i.value);break;case"m4":this.uniforms[n].value=new re().fromArray(i.value);break;default:this.uniforms[n].value=i.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},hs=class extends Pe{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Bi=class extends $e{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new zt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new zt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=_i,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},dl=class extends Bi{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Mt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return ie(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new zt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new zt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new zt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}},fl=class extends $e{constructor(t){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new zt(16777215),this.specular=new zt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new zt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=_i,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yn,this.combine=So,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},pl=class extends $e{constructor(t){super(),this.isMeshToonMaterial=!0,this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new zt(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new zt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=_i,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.gradientMap=t.gradientMap,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.alphaMap=t.alphaMap,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},ml=class extends $e{constructor(t){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=_i,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.flatShading=t.flatShading,this}},$s=class extends $e{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new zt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new zt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=_i,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yn,this.combine=So,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},uo=class extends $e{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Zf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},fo=class extends $e{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}},gl=class extends $e{constructor(t){super(),this.isMeshMatcapMaterial=!0,this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new zt(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=_i,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={MATCAP:""},this.color.copy(t.color),this.matcap=t.matcap,this.map=t.map,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.alphaMap=t.alphaMap,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.flatShading=t.flatShading,this.fog=t.fog,this}},xl=class extends en{constructor(t){super(),this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(t)}copy(t){return super.copy(t),this.scale=t.scale,this.dashSize=t.dashSize,this.gapSize=t.gapSize,this}};Zh=class{static convertArray(t,e){return jn(t,e)}static isTypedArray(t){return fg(t)}static hasTangents(t){return Sa(t)}static getKeyframeOrder(t){return Ag(t)}static sortedArray(t,e,n){return pf(t,e,n)}static flattenJSON(t,e,n,i){Eg(t,e,n,i)}static subclip(t,e,n,i,r=30){return hv(t,e,n,i,r)}static makeClipAdditive(t,e=0,n=t,i=30){return uv(t,e,n,i)}},zi=class{constructor(t,e,n,i){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,i=e[n],r=e[n-1];t:{e:{let o;n:{i:if(!(t<i)){for(let a=n+2;;){if(i===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=i,i=e[++n],t<i)break e}o=e.length;break n}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(i=r,r=e[--n-1],t>=r)break e}o=n,n=0;break n}break t}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(i=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,i)}return this.interpolate_(n,r,t,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=t*i;for(let o=0;o!==i;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},_l=class extends zi{constructor(t,e,n,i){super(t,e,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ns,endingEnd:ns}}intervalChanged_(t,e,n){let i=this.parameterPositions,r=t-2,o=t+1,a=i[r],l=i[o];if(a===void 0)switch(this.getSettings_().endingStart){case is:r=t,a=2*e-n;break;case Hr:r=i.length-2,a=e+i[r]-i[r+1];break;default:r=t,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case is:o=t,l=2*n-e;break;case Hr:o=1,l=n+i[1]-i[0];break;default:o=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,p=(n-e)/(i-e),x=p*p,g=x*p,m=-u*g+2*u*x-u*p,M=(1+u)*g+(-1.5-2*u)*x+(-.5+u)*p+1,w=(-1-f)*g+(1.5+f)*x+.5*p,y=f*g-f*x;for(let S=0;S!==a;++S)r[S]=m*o[h+S]+M*o[c+S]+w*o[l+S]+y*o[d+S];return r}},po=class extends zi{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(n-e)/(i-e),d=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*d+o[l+u]*h;return r}},vl=class extends zi{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t){return this.copySampleValue_(t-1)}},yl=class extends zi{interpolate_(t,e,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,d=this.outTangents;if(!h||!d){let p=(n-e)/(i-e),x=1-p;for(let g=0;g!==a;++g)r[g]=o[c+g]*x+o[l+g]*p;return r}let u=a*2,f=t-1;for(let p=0;p!==a;++p){let x=o[c+p],g=o[l+p],m=f*u+p*2,M=d[m],w=d[m+1],y=t*u+p*2,S=h[y],b=h[y+1],R=fv(n,e,M,S,i);r[p]=Cg(R,x,w,b,g)}return r}};bn=class{constructor(t,e,n,i){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=jn(e,this.TimeBufferType),this.values=jn(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:jn(t.times,Array),values:jn(t.values,Array)};let i=t.getInterpolation();i!==t.DefaultInterpolation&&(n.interpolation=i),Sa(t.settings)&&(n.settings={inTangents:jn(t.settings.inTangents,Array),outTangents:jn(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new vl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new po(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new _l(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new yl(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Gr:e=this.InterpolantFactoryMethodDiscrete;break;case Pa:e=this.InterpolantFactoryMethodLinear;break;case xa:e=this.InterpolantFactoryMethodSmooth;break;case Ph:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Bt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Gr;case this.InterpolantFactoryMethodLinear:return Pa;case this.InterpolantFactoryMethodSmooth:return xa;case this.InterpolantFactoryMethodBezier:return Ph}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]*=t;Sa(this.settings)&&(Qm(this.settings.inTangents,t),Qm(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,i=n.length,r=0,o=i-1;for(;r!==i&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==i){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Qt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,i=this.values,r=n.length;r===0&&(Qt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Qt("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){Qt("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(i!==void 0&&fg(i))for(let a=0,l=i.length;a!==l;++a){let c=i[a];if(isNaN(c)){Qt("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===xa,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(i)l=!0;else{let d=a*n,u=d-n,f=d+n;for(let p=0;p!==n;++p){let x=e[d+p];if(x!==e[u+p]||x!==e[f+p]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let d=a*n,u=o*n;for(let f=0;f!==n;++f)e[u+f]=e[d+f]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,i=new n(this.name,t,e);return i.createInterpolant=this.createInterpolant,Sa(this.settings)&&(i.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),i}};bn.prototype.ValueTypeName="";bn.prototype.TimeBufferType=Float32Array;bn.prototype.ValueBufferType=Float32Array;bn.prototype.DefaultInterpolation=Pa;mi=class extends bn{constructor(t,e,n){super(t,e,n)}};mi.prototype.ValueTypeName="bool";mi.prototype.ValueBufferType=Array;mi.prototype.DefaultInterpolation=Gr;mi.prototype.InterpolantFactoryMethodLinear=void 0;mi.prototype.InterpolantFactoryMethodSmooth=void 0;mo=class extends bn{constructor(t,e,n,i){super(t,e,n,i)}};mo.prototype.ValueTypeName="color";Zs=class extends bn{constructor(t,e,n,i){super(t,e,n,i)}};Zs.prototype.ValueTypeName="number";Ml=class extends zi{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-e)/(i-e),c=t*a;for(let h=c+a;c!==h;c+=4)tn.slerpFlat(r,0,o,c-a,o,c,l);return r}},Js=class extends bn{constructor(t,e,n,i){super(t,e,n,i)}InterpolantFactoryMethodLinear(t){return new Ml(this.times,this.values,this.getValueSize(),t)}};Js.prototype.ValueTypeName="quaternion";Js.prototype.InterpolantFactoryMethodSmooth=void 0;gi=class extends bn{constructor(t,e,n){super(t,e,n)}};gi.prototype.ValueTypeName="string";gi.prototype.ValueBufferType=Array;gi.prototype.DefaultInterpolation=Gr;gi.prototype.InterpolantFactoryMethodLinear=void 0;gi.prototype.InterpolantFactoryMethodSmooth=void 0;go=class extends bn{constructor(t,e,n,i){super(t,e,n,i)}};go.prototype.ValueTypeName="vector";us=class{constructor(t="",e=-1,n=[],i=yc){this.name=t,this.tracks=n,this.duration=e,this.blendMode=i,this.uuid=Dn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(t){let e=[],n=t.tracks,i=1/(t.fps||1);for(let o=0,a=n.length;o!==a;++o)e.push(mv(n[o]).scale(i));let r=new this(t.name,t.duration,e,t.blendMode);return r.uuid=t.uuid,r.userData=JSON.parse(t.userData||"{}"),r}static toJSON(t){let e=[],n=t.tracks,i={name:t.name,duration:t.duration,tracks:e,uuid:t.uuid,blendMode:t.blendMode,userData:JSON.stringify(t.userData)};for(let r=0,o=n.length;r!==o;++r)e.push(bn.toJSON(n[r]));return i}static CreateFromMorphTargetSequence(t,e,n,i){let r=e.length,o=[];for(let a=0;a<r;a++){let l=[],c=[];l.push((a+r-1)%r,a,(a+1)%r),c.push(0,1,0);let h=Ag(l);l=pf(l,1,h),c=pf(c,1,h),!i&&l[0]===0&&(l.push(r),c.push(c[0])),o.push(new Zs(".morphTargetInfluences["+e[a].name+"]",l,c).scale(1/n))}return new this(t,-1,o)}static findByName(t,e){let n=t;if(!Array.isArray(t)){let i=t;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===e)return n[i];return null}static CreateClipsFromMorphTargetSequences(t,e,n){let i={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,l=t.length;a<l;a++){let c=t[a],h=c.name.match(r);if(h&&h.length>1){let d=h[1],u=i[d];u||(i[d]=u=[]),u.push(c)}}let o=[];for(let a in i)o.push(this.CreateFromMorphTargetSequence(a,i[a],e,n));return o}resetDuration(){let t=this.tracks,e=0;for(let n=0,i=t.length;n!==i;++n){let r=this.tracks[n];e=Math.max(e,r.times[r.times.length-1])}return this.duration=e,this}trim(){for(let t=0;t<this.tracks.length;t++)this.tracks[t].trim(0,this.duration);return this}validate(){let t=!0;for(let e=0;e<this.tracks.length;e++)t=t&&this.tracks[e].validate();return t}optimize(){for(let t=0;t<this.tracks.length;t++)this.tracks[t].optimize();return this}clone(){let t=[];for(let n=0;n<this.tracks.length;n++)t.push(this.tracks[n].clone());let e=new this.constructor(this.name,this.duration,t,this.blendMode);return e.userData=JSON.parse(JSON.stringify(this.userData)),e}toJSON(){return this.constructor.toJSON(this)}};ei={enabled:!1,files:{},add:function(s,t){this.enabled!==!1&&(jm(s)||(this.files[s]=t))},get:function(s){if(this.enabled!==!1&&!jm(s))return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};xo=class{constructor(t,e,n){let i=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&i.onStart!==void 0&&i.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){let f=c[d],p=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return p}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},lp=new xo,ln=class{constructor(t){this.manager=t!==void 0?t:lp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(i,r){n.load(t,i,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};ln.DEFAULT_MATERIAL_NAME="__DEFAULT";Ri={},mf=class extends Error{constructor(t,e){super(t),this.response=e}},$n=class extends ln{constructor(t){super(t),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(t,e,n,i){t===void 0&&(t=""),this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);let r=ei.get(`file:${t}`);if(r!==void 0){this.manager.itemStart(t),setTimeout(()=>{e&&e(r),this.manager.itemEnd(t)},0);return}if(Ri[t]!==void 0){Ri[t].push({onLoad:e,onProgress:n,onError:i});return}Ri[t]=[],Ri[t].push({onLoad:e,onProgress:n,onError:i});let o=new Request(t,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Bt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;let h=Ri[t],d=c.body.getReader(),u=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),f=u?parseInt(u):0,p=f!==0,x=0,g=new ReadableStream({start(m){M();function M(){d.read().then(({done:w,value:y})=>{if(w)m.close();else{x+=y.byteLength;let S=new ProgressEvent("progress",{lengthComputable:p,loaded:x,total:f});for(let b=0,R=h.length;b<R;b++){let v=h[b];v.onProgress&&v.onProgress(S)}m.enqueue(y),M()}},w=>{m.error(w)})}}});return new Response(g)}else throw new mf(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return c.json();default:if(a==="")return c.text();{let d=/charset="?([^;"\s]*)"?/i.exec(a),u=d&&d[1]?d[1].toLowerCase():void 0,f=new TextDecoder(u);return c.arrayBuffer().then(p=>f.decode(p))}}}).then(c=>{ei.add(`file:${t}`,c);let h=Ri[t];delete Ri[t];for(let d=0,u=h.length;d<u;d++){let f=h[d];f.onLoad&&f.onLoad(c)}}).catch(c=>{let h=Ri[t];if(h===void 0)throw this.manager.itemError(t),c;delete Ri[t];for(let d=0,u=h.length;d<u;d++){let f=h[d];f.onError&&f.onError(c)}this.manager.itemError(t)}).finally(()=>{this.manager.itemEnd(t)}),this.manager.itemStart(t)}setResponseType(t){return this.responseType=t,this}setMimeType(t){return this.mimeType=t,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},Jh=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=this,o=new $n(this.manager);o.setPath(this.path),o.setRequestHeader(this.requestHeader),o.setWithCredentials(this.withCredentials),o.load(t,function(a){try{e(r.parse(JSON.parse(a)))}catch(l){i?i(l):Qt(l),r.manager.itemError(t)}},n,i)}parse(t){let e=[];for(let n=0;n<t.length;n++){let i=us.parse(t[n]);e.push(i)}return e}},Kh=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=this,o=[],a=new Hs,l=new $n(this.manager);l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(r.withCredentials);let c=0;function h(d){l.load(t[d],function(u){let f=r.parse(u,!0);o[d]={width:f.width,height:f.height,format:f.format,mipmaps:f.mipmaps},c+=1,c===6&&(f.mipmapCount===1&&(a.minFilter=Ce),a.image=o,a.format=f.format,a.needsUpdate=!0,e&&e(a))},n,i)}if(Array.isArray(t))for(let d=0,u=t.length;d<u;++d)h(d);else l.load(t,function(d){let u=r.parse(d,!0);if(u.isCubemap){let f=u.mipmaps.length/u.mipmapCount;for(let p=0;p<f;p++){o[p]={mipmaps:[]};for(let x=0;x<u.mipmapCount;x++)o[p].mipmaps.push(u.mipmaps[p*u.mipmapCount+x]),o[p].format=u.format,o[p].width=u.width,o[p].height=u.height}a.image=o}else a.image.width=u.width,a.image.height=u.height,a.mipmaps=u.mipmaps;u.mipmapCount===1&&(a.minFilter=Ce),a.format=u.format,a.needsUpdate=!0,e&&e(a)},n,i);return a}},Dr=new WeakMap,ds=class extends ln{constructor(t){super(t)}load(t,e,n,i){this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);let r=this,o=ei.get(`image:${t}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(t),setTimeout(function(){e&&e(o),r.manager.itemEnd(t)},0);else{let d=Dr.get(o);d===void 0&&(d=[],Dr.set(o,d)),d.push({onLoad:e,onError:i})}return o}let a=qr("img");function l(){h(),e&&e(this);let d=Dr.get(this)||[];for(let u=0;u<d.length;u++){let f=d[u];f.onLoad&&f.onLoad(this)}Dr.delete(this),r.manager.itemEnd(t)}function c(d){h(),i&&i(d),ei.remove(`image:${t}`);let u=Dr.get(this)||[];for(let f=0;f<u.length;f++){let p=u[f];p.onError&&p.onError(d)}Dr.delete(this),r.manager.itemError(t),r.manager.itemEnd(t)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),t.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),ei.add(`image:${t}`,a),r.manager.itemStart(t),a.src=t,a}},Qh=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=new as;r.colorSpace=Ze;let o=new ds(this.manager);o.setCrossOrigin(this.crossOrigin),o.setPath(this.path);let a=0;function l(c){o.load(t[c],function(h){r.images[c]=h,a++,a===6&&(r.needsUpdate=!0,e&&e(r))},void 0,i)}for(let c=0;c<t.length;++c)l(c);return r}},jh=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=this,o=new Sn,a=new $n(this.manager);return a.setResponseType("arraybuffer"),a.setRequestHeader(this.requestHeader),a.setPath(this.path),a.setWithCredentials(r.withCredentials),a.load(t,function(l){let c;try{c=r.parse(l)}catch(h){i!==void 0?i(h):Qt(h);return}r._applyTexData(o,c),e&&e(o,c)},n,i),o}createDataTexture(t){let e=new Sn;return this._applyTexData(e,this.parse(t)),e}_applyTexData(t,e){e.image!==void 0?t.image=e.image:e.data!==void 0&&(t.image.width=e.width,t.image.height=e.height,t.image.data=e.data),t.wrapS=e.wrapS!==void 0?e.wrapS:Mn,t.wrapT=e.wrapT!==void 0?e.wrapT:Mn,t.magFilter=e.magFilter!==void 0?e.magFilter:Ce,t.minFilter=e.minFilter!==void 0?e.minFilter:Ce,t.anisotropy=e.anisotropy!==void 0?e.anisotropy:1,e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.mipmaps!==void 0&&(t.mipmaps=e.mipmaps,t.minFilter=ai),e.mipmapCount===1&&(t.minFilter=Ce),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),t.needsUpdate=!0}},tu=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=new ke,o=new ds(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(t,function(a){r.image=a,r.needsUpdate=!0,e!==void 0&&e(r)},n,i),r}},si=class extends me{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new zt(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},Sl=class extends si{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(me.DEFAULT_UP),this.updateMatrix(),this.groundColor=new zt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},ef=new re,t0=new U,e0=new U,Ks=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Mt(512,512),this.mapType=wn,this.map=null,this.mapPass=null,this.matrix=new re,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new fi,this._frameExtents=new Mt(1,1),this._viewportCount=1,this._viewports=[new be(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;t0.setFromMatrixPosition(t.matrixWorld),e.position.copy(t0),e0.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(e0),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,i){ef.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(ef,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,o=i?i.z/r.x:1,a=i?i.w/r.y:1,l=i?i.x/r.x:0,c=i?i.y/r.y:0;t.coordinateSystem===ss||t.reversedDepth?e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),e.multiply(ef)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},yh=new U,Mh=new tn,ui=new U,Qs=class extends me{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new re,this.projectionMatrix=new re,this.projectionMatrixInverse=new re,this.coordinateSystem=Cn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(yh,Mh,ui),ui.x===1&&ui.y===1&&ui.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yh,Mh,ui.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(yh,Mh,ui),ui.x===1&&ui.y===1&&ui.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yh,Mh,ui.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},ts=new U,n0=new Mt,i0=new Mt,Be=class extends Qs{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Us*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Ds*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Us*2*Math.atan(Math.tan(Ds*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){ts.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(ts.x,ts.y).multiplyScalar(-t/ts.z),ts.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ts.x,ts.y).multiplyScalar(-t/ts.z)}getViewSize(t,e){return this.getViewBounds(t,n0,i0),e.subVectors(i0,n0)}setViewOffset(t,e,n,i,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Ds*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,r=-.5*i,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*i/l,e-=o.offsetY*n/c,i*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},gf=class extends Ks{constructor(){super(new Be(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(t){let e=this.camera,n=Us*2*t.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,r=t.distance||e.far;(n!==e.fov||i!==e.aspect||r!==e.far)&&(e.fov=n,e.aspect=i,e.far=r,e.updateProjectionMatrix()),super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this.aspect=t.aspect,this}toJSON(){let t=super.toJSON();return t.focus=this.focus,t.aspect=this.aspect,t}},bl=class extends si{constructor(t,e,n=0,i=Math.PI/3,r=0,o=2){super(t,e),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(me.DEFAULT_UP),this.updateMatrix(),this.target=new me,this.distance=n,this.angle=i,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new gf}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.map=t.map,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.angle=this.angle,e.object.decay=this.decay,e.object.penumbra=this.penumbra,e.object.target=this.target.uuid,this.map&&this.map.isTexture&&(e.object.map=this.map.toJSON(t).uuid),e.object.shadow=this.shadow.toJSON(),e}},xf=class extends Ks{constructor(){super(new Be(90,1,.5,500)),this.isPointLightShadow=!0}},js=class extends si{constructor(t,e,n=0,i=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new xf}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},xi=class extends Qs{constructor(t=-1,e=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2,r=n-t,o=n+t,a=i+e,l=i-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},_f=class extends Ks{constructor(){super(new xi(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},wl=class extends si{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(me.DEFAULT_UP),this.updateMatrix(),this.target=new me,this.shadow=new _f}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},Tl=class extends si{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}},Al=class extends si{constructor(t,e,n=10,i=10){super(t,e),this.isRectAreaLight=!0,this.type="RectAreaLight",this.width=n,this.height=i}get power(){return this.intensity*this.width*this.height*Math.PI}set power(t){this.intensity=t/(this.width*this.height*Math.PI)}copy(t){return super.copy(t),this.width=t.width,this.height=t.height,this}toJSON(t){let e=super.toJSON(t);return e.object.width=this.width,e.object.height=this.height,e}},_o=class{constructor(){this.isSphericalHarmonics3=!0,this.coefficients=[];for(let t=0;t<9;t++)this.coefficients.push(new U)}set(t){for(let e=0;e<9;e++)this.coefficients[e].copy(t[e]);return this}zero(){for(let t=0;t<9;t++)this.coefficients[t].set(0,0,0);return this}getAt(t,e){let n=t.x,i=t.y,r=t.z,o=this.coefficients;return e.copy(o[0]).multiplyScalar(.282095),e.addScaledVector(o[1],.488603*i),e.addScaledVector(o[2],.488603*r),e.addScaledVector(o[3],.488603*n),e.addScaledVector(o[4],1.092548*(n*i)),e.addScaledVector(o[5],1.092548*(i*r)),e.addScaledVector(o[6],.315392*(3*r*r-1)),e.addScaledVector(o[7],1.092548*(n*r)),e.addScaledVector(o[8],.546274*(n*n-i*i)),e}getIrradianceAt(t,e){let n=t.x,i=t.y,r=t.z,o=this.coefficients;return e.copy(o[0]).multiplyScalar(.886227),e.addScaledVector(o[1],2*.511664*i),e.addScaledVector(o[2],2*.511664*r),e.addScaledVector(o[3],2*.511664*n),e.addScaledVector(o[4],2*.429043*n*i),e.addScaledVector(o[5],2*.429043*i*r),e.addScaledVector(o[6],.743125*r*r-.247708),e.addScaledVector(o[7],2*.429043*n*r),e.addScaledVector(o[8],.429043*(n*n-i*i)),e}add(t){for(let e=0;e<9;e++)this.coefficients[e].add(t.coefficients[e]);return this}addScaledSH(t,e){for(let n=0;n<9;n++)this.coefficients[n].addScaledVector(t.coefficients[n],e);return this}scale(t){for(let e=0;e<9;e++)this.coefficients[e].multiplyScalar(t);return this}lerp(t,e){for(let n=0;n<9;n++)this.coefficients[n].lerp(t.coefficients[n],e);return this}equals(t){for(let e=0;e<9;e++)if(!this.coefficients[e].equals(t.coefficients[e]))return!1;return!0}copy(t){return this.set(t.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(t,e=0){let n=this.coefficients;for(let i=0;i<9;i++)n[i].fromArray(t,e+i*3);return this}toArray(t=[],e=0){let n=this.coefficients;for(let i=0;i<9;i++)n[i].toArray(t,e+i*3);return t}static getBasisAt(t,e){let n=t.x,i=t.y,r=t.z;e[0]=.282095,e[1]=.488603*i,e[2]=.488603*r,e[3]=.488603*n,e[4]=1.092548*n*i,e[5]=1.092548*i*r,e[6]=.315392*(3*r*r-1),e[7]=1.092548*n*r,e[8]=.546274*(n*n-i*i)}},El=class extends si{constructor(t=new _o,e=1){super(void 0,e),this.isLightProbe=!0,this.sh=t}copy(t){return super.copy(t),this.sh.copy(t.sh),this}toJSON(t){let e=super.toJSON(t);return e.object.sh=this.sh.toArray(),e}},s0={},Cl=class s extends ln{constructor(t){super(t),this.textures={}}load(t,e,n,i){let r=this,o=new $n(r.manager);o.setPath(r.path),o.setRequestHeader(r.requestHeader),o.setWithCredentials(r.withCredentials),o.load(t,function(a){try{e(r.parse(JSON.parse(a)))}catch(l){i?i(l):Qt(l),r.manager.itemError(t)}},n,i)}parse(t){let e=this.createMaterialFromType(t.type);return e.fromJSON(t,this.textures),e}setTextures(t){return this.textures=t,this}createMaterialFromType(t){return s.createMaterialFromType(t)}static createMaterialFromType(t){let n={ShadowMaterial:ul,SpriteMaterial:Kr,RawShaderMaterial:hs,ShaderMaterial:Pe,PointsMaterial:jr,MeshPhysicalMaterial:dl,MeshStandardMaterial:Bi,MeshPhongMaterial:fl,MeshToonMaterial:pl,MeshNormalMaterial:ml,MeshLambertMaterial:$s,MeshDepthMaterial:uo,MeshDistanceMaterial:fo,MeshBasicMaterial:Nn,MeshMatcapMaterial:gl,LineDashedMaterial:xl,LineBasicMaterial:en,Material:$e,...s0}[t],i;return n===void 0?(di(`MaterialLoader: Unknown material type "${t}". Use .registerMaterial() before starting the deserialization process.`),i=new $e):i=new n,i}static registerMaterial(t,e){s0[t]=e}},vo=class{static extractUrlBase(t){let e=t.lastIndexOf("/");return e===-1?"./":t.slice(0,e+1)}static resolveURL(t,e){return typeof t!="string"||t===""?"":(/^https?:\/\//i.test(e)&&/^\//.test(t)&&(e=e.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(t)||/^data:.*,.*$/i.test(t)||/^blob:.*$/i.test(t)?t:e+t)}},Rl=class extends se{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(t){return super.copy(t),this.instanceCount=t.instanceCount,this}toJSON(){let t=super.toJSON();return t.instanceCount=this.instanceCount,t.isInstancedBufferGeometry=!0,t}},Pl=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=this,o=new $n(r.manager);o.setPath(r.path),o.setRequestHeader(r.requestHeader),o.setWithCredentials(r.withCredentials),o.load(t,function(a){try{e(r.parse(JSON.parse(a)))}catch(l){i?i(l):Qt(l),r.manager.itemError(t)}},n,i)}parse(t){let e={},n={};function i(f,p){if(e[p]!==void 0)return e[p];let g=f.interleavedBuffers[p],m=r(f,g.buffer),M=Br(g.type,m),w=new ks(M,g.stride);return w.uuid=g.uuid,g.usage!==void 0&&w.setUsage(g.usage),e[p]=w,w}function r(f,p){if(n[p]!==void 0)return n[p];let g=f.arrayBuffers[p],m=new Uint32Array(g).buffer;return n[p]=m,m}let o=t.isInstancedBufferGeometry?new Rl:new se,a=t.data.index;if(a!==void 0){let f=Br(a.type,a.array);o.setIndex(new pe(f,1))}let l=t.data.attributes;for(let f in l){let p=l[f],x;if(p.isInterleavedBufferAttribute){let g=i(t.data,p.data);x=new os(g,p.itemSize,p.offset,p.normalized)}else{let g=Br(p.type,p.array),m=p.isInstancedBufferAttribute?Ui:pe;x=new m(g,p.itemSize,p.normalized)}p.name!==void 0&&(x.name=p.name),p.usage!==void 0&&x.setUsage(p.usage),p.gpuType!==void 0&&(x.gpuType=p.gpuType),o.setAttribute(f,x)}let c=t.data.morphAttributes;if(c)for(let f in c){let p=c[f],x=[];for(let g=0,m=p.length;g<m;g++){let M=p[g],w;if(M.isInterleavedBufferAttribute){let y=i(t.data,M.data);w=new os(y,M.itemSize,M.offset,M.normalized)}else{let y=Br(M.type,M.array);w=new pe(y,M.itemSize,M.normalized)}M.name!==void 0&&(w.name=M.name),M.usage!==void 0&&w.setUsage(M.usage),M.gpuType!==void 0&&(w.gpuType=M.gpuType),x.push(w)}o.morphAttributes[f]=x}t.data.morphTargetsRelative&&(o.morphTargetsRelative=!0);let d=t.data.groups||t.data.drawcalls||t.data.offsets;if(d!==void 0)for(let f=0,p=d.length;f!==p;++f){let x=d[f];o.addGroup(x.start,x.count,x.materialIndex)}let u=t.data.boundingSphere;return u!==void 0&&(o.boundingSphere=new Ye().fromJSON(u)),t.name&&(o.name=t.name),t.userData&&(o.userData=t.userData),o}},nf={},eu=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=this,o=this.path===""?vo.extractUrlBase(t):this.path;this.resourcePath=this.resourcePath||o;let a=new $n(this.manager);a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(t,function(l){let c=null;try{c=JSON.parse(l)}catch(d){i!==void 0&&i(d),Qt("ObjectLoader: Can't parse "+t+".",d.message);return}let h=c.metadata;if(h===void 0||h.type===void 0||h.type.toLowerCase()==="geometry"){i!==void 0&&i(new Error("THREE.ObjectLoader: Can't load "+t)),Qt("ObjectLoader: Can't load "+t);return}r.parse(c,e)},n,i)}async loadAsync(t,e){let n=this,i=this.path===""?vo.extractUrlBase(t):this.path;this.resourcePath=this.resourcePath||i;let r=new $n(this.manager);r.setPath(this.path),r.setRequestHeader(this.requestHeader),r.setWithCredentials(this.withCredentials);let o=await r.loadAsync(t,e),a;try{a=JSON.parse(o)}catch(c){throw new Error("THREE.ObjectLoader: Can't parse "+t+". "+c.message)}let l=a.metadata;if(l===void 0||l.type===void 0||l.type.toLowerCase()==="geometry")throw new Error("THREE.ObjectLoader: Can't load "+t);return await n.parseAsync(a)}parse(t,e){let n=this.parseAnimations(t.animations),i=this.parseShapes(t.shapes),r=this.parseGeometries(t.geometries,i),o=this.parseImages(t.images,function(){e!==void 0&&e(c)}),a=this.parseTextures(t.textures,o),l=this.parseMaterials(t.materials,a),c=this.parseObject(t.object,r,l,a,n),h=this.parseSkeletons(t.skeletons,c);if(this.bindSkeletons(c,h),this.bindLightTargets(c),e!==void 0){let d=!1;for(let u in o)if(o[u].data instanceof HTMLImageElement){d=!0;break}d===!1&&e(c)}return c}async parseAsync(t){let e=this.parseAnimations(t.animations),n=this.parseShapes(t.shapes),i=this.parseGeometries(t.geometries,n),r=await this.parseImagesAsync(t.images),o=this.parseTextures(t.textures,r),a=this.parseMaterials(t.materials,o),l=this.parseObject(t.object,i,a,o,e),c=this.parseSkeletons(t.skeletons,l);return this.bindSkeletons(l,c),this.bindLightTargets(l),l}static registerGeometry(t,e){nf[t]=e}parseShapes(t){let e={};if(t!==void 0)for(let n=0,i=t.length;n<i;n++){let r=new cs().fromJSON(t[n]);e[r.uuid]=r}return e}parseSkeletons(t,e){let n={},i={};if(e.traverse(function(r){r.isBone&&(i[r.uuid]=r)}),t!==void 0)for(let r=0,o=t.length;r<o;r++){let a=new Oa().fromJSON(t[r],i);n[a.uuid]=a}return n}parseGeometries(t,e){let n={};if(t!==void 0){let i=new Pl;for(let r=0,o=t.length;r<o;r++){let a,l=t[r];switch(l.type){case"BufferGeometry":case"InstancedBufferGeometry":a=i.parse(l);break;default:l.type in Jm?a=Jm[l.type].fromJSON(l,e):l.type in nf?a=nf[l.type].fromJSON(l,e):Bt(`ObjectLoader: Unknown geometry type "${l.type}". Use .registerGeometry() before starting the deserialization process.`)}a.uuid=l.uuid,l.name!==void 0&&(a.name=l.name),l.userData!==void 0&&(a.userData=l.userData),n[l.uuid]=a}}return n}parseMaterials(t,e){let n={},i={};if(t!==void 0){let r=new Cl;r.setTextures(e);for(let o=0,a=t.length;o<a;o++){let l=t[o];n[l.uuid]===void 0&&(n[l.uuid]=r.parse(l)),i[l.uuid]=n[l.uuid]}}return i}parseAnimations(t){let e={};if(t!==void 0)for(let n=0;n<t.length;n++){let i=t[n],r=us.parse(i);e[r.uuid]=r}return e}parseImages(t,e){let n=this,i={},r;function o(l){return l=n.manager.resolveURL(l),n.manager.itemStart(l),r.load(l,function(){n.manager.itemEnd(l)},void 0,function(){n.manager.itemError(l),n.manager.itemEnd(l)})}function a(l){if(typeof l=="string"){let c=l,h=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(c)?c:n.resourcePath+c;return o(h)}else return l.data?{data:Br(l.type,l.data),width:l.width,height:l.height}:null}if(t!==void 0&&t.length>0){let l=new xo(e);r=new ds(l),r.setCrossOrigin(this.crossOrigin);for(let c=0,h=t.length;c<h;c++){let d=t[c],u=d.url;if(Array.isArray(u)){let f=[];for(let p=0,x=u.length;p<x;p++){let g=u[p],m=a(g);m!==null&&(m instanceof HTMLImageElement?f.push(m):f.push(new Sn(m.data,m.width,m.height)))}i[d.uuid]=new Xn(f)}else{let f=a(d.url);i[d.uuid]=new Xn(f)}}}return i}async parseImagesAsync(t){let e=this,n={},i;async function r(o){if(typeof o=="string"){let a=o,l=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(a)?a:e.resourcePath+a;return await i.loadAsync(l)}else return o.data?{data:Br(o.type,o.data),width:o.width,height:o.height}:null}if(t!==void 0&&t.length>0){i=new ds(this.manager),i.setCrossOrigin(this.crossOrigin);for(let o=0,a=t.length;o<a;o++){let l=t[o],c=l.url;if(Array.isArray(c)){let h=[];for(let d=0,u=c.length;d<u;d++){let f=c[d],p=await r(f);p!==null&&(p instanceof HTMLImageElement?h.push(p):h.push(new Sn(p.data,p.width,p.height)))}n[l.uuid]=new Xn(h)}else{let h=await r(l.url);n[l.uuid]=new Xn(h)}}}return n}parseTextures(t,e){function n(r,o){return typeof r=="number"?r:(Bt("ObjectLoader.parseTexture: Constant should be in numeric form.",r),o[r])}let i={};if(t!==void 0)for(let r=0,o=t.length;r<o;r++){let a=t[r];a.image===void 0&&Bt('ObjectLoader: No "image" specified for',a.uuid),e[a.image]===void 0&&Bt("ObjectLoader: Undefined image",a.image);let l=e[a.image],c=l.data,h;Array.isArray(c)?(h=new as,c.length===6&&(h.needsUpdate=!0)):(c&&c.data?h=new Sn:h=new ke,c&&(h.needsUpdate=!0)),h.source=l,h.uuid=a.uuid,a.name!==void 0&&(h.name=a.name),a.mapping!==void 0&&(h.mapping=n(a.mapping,gv)),a.channel!==void 0&&(h.channel=a.channel),a.offset!==void 0&&h.offset.fromArray(a.offset),a.repeat!==void 0&&h.repeat.fromArray(a.repeat),a.center!==void 0&&h.center.fromArray(a.center),a.rotation!==void 0&&(h.rotation=a.rotation),a.wrap!==void 0&&(h.wrapS=n(a.wrap[0],r0),h.wrapT=n(a.wrap[1],r0)),a.format!==void 0&&(h.format=a.format),a.internalFormat!==void 0&&(h.internalFormat=a.internalFormat),a.type!==void 0&&(h.type=a.type),a.colorSpace!==void 0&&(h.colorSpace=a.colorSpace),a.minFilter!==void 0&&(h.minFilter=n(a.minFilter,o0)),a.magFilter!==void 0&&(h.magFilter=n(a.magFilter,o0)),a.anisotropy!==void 0&&(h.anisotropy=a.anisotropy),a.flipY!==void 0&&(h.flipY=a.flipY),a.generateMipmaps!==void 0&&(h.generateMipmaps=a.generateMipmaps),a.premultiplyAlpha!==void 0&&(h.premultiplyAlpha=a.premultiplyAlpha),a.unpackAlignment!==void 0&&(h.unpackAlignment=a.unpackAlignment),a.compareFunction!==void 0&&(h.compareFunction=a.compareFunction),a.normalized!==void 0&&(h.normalized=a.normalized),a.userData!==void 0&&(h.userData=a.userData),i[a.uuid]=h}return i}parseObject(t,e,n,i,r){let o;function a(u){return e[u]===void 0&&Bt("ObjectLoader: Undefined geometry",u),e[u]}function l(u){if(u!==void 0){if(Array.isArray(u)){let f=[];for(let p=0,x=u.length;p<x;p++){let g=u[p];n[g]===void 0&&Bt("ObjectLoader: Undefined material",g),f.push(n[g])}return f}return n[u]===void 0&&Bt("ObjectLoader: Undefined material",u),n[u]}}function c(u){return i[u]===void 0&&Bt("ObjectLoader: Undefined texture",u),i[u]}let h,d;switch(t.type){case"Scene":o=new Di,t.background!==void 0&&(Number.isInteger(t.background)?o.background=new zt(t.background):o.background=c(t.background)),t.environment!==void 0&&(o.environment=c(t.environment)),t.fog!==void 0&&(t.fog.type==="Fog"?o.fog=new Da(t.fog.color,t.fog.near,t.fog.far):t.fog.type==="FogExp2"&&(o.fog=new La(t.fog.color,t.fog.density)),t.fog.name!==""&&(o.fog.name=t.fog.name)),t.backgroundBlurriness!==void 0&&(o.backgroundBlurriness=t.backgroundBlurriness),t.backgroundIntensity!==void 0&&(o.backgroundIntensity=t.backgroundIntensity),t.backgroundRotation!==void 0&&o.backgroundRotation.fromArray(t.backgroundRotation),t.environmentIntensity!==void 0&&(o.environmentIntensity=t.environmentIntensity),t.environmentRotation!==void 0&&o.environmentRotation.fromArray(t.environmentRotation);break;case"PerspectiveCamera":o=new Be(t.fov,t.aspect,t.near,t.far),t.focus!==void 0&&(o.focus=t.focus),t.zoom!==void 0&&(o.zoom=t.zoom),t.filmGauge!==void 0&&(o.filmGauge=t.filmGauge),t.filmOffset!==void 0&&(o.filmOffset=t.filmOffset),t.view!==void 0&&(o.view=Object.assign({},t.view));break;case"OrthographicCamera":o=new xi(t.left,t.right,t.top,t.bottom,t.near,t.far),t.zoom!==void 0&&(o.zoom=t.zoom),t.view!==void 0&&(o.view=Object.assign({},t.view));break;case"AmbientLight":o=new Tl(t.color,t.intensity);break;case"DirectionalLight":o=new wl(t.color,t.intensity),o.target=t.target||"";break;case"PointLight":o=new js(t.color,t.intensity,t.distance,t.decay);break;case"RectAreaLight":o=new Al(t.color,t.intensity,t.width,t.height);break;case"SpotLight":o=new bl(t.color,t.intensity,t.distance,t.angle,t.penumbra,t.decay),o.target=t.target||"";break;case"HemisphereLight":o=new Sl(t.color,t.groundColor,t.intensity);break;case"LightProbe":let u=new _o().fromArray(t.sh);o=new El(u,t.intensity);break;case"SkinnedMesh":h=a(t.geometry),d=l(t.material),o=new Fa(h,d),t.bindMode!==void 0&&(o.bindMode=t.bindMode),t.bindMatrix!==void 0&&o.bindMatrix.fromArray(t.bindMatrix),t.skeleton!==void 0&&(o.skeleton=t.skeleton);break;case"Mesh":h=a(t.geometry),d=l(t.material),o=new ve(h,d);break;case"InstancedMesh":h=a(t.geometry),d=l(t.material);let f=t.count,p=t.instanceMatrix,x=t.instanceColor;o=new Vs(h,d,f),o.instanceMatrix=new Ui(new Float32Array(p.array),16),x!==void 0&&(o.instanceColor=new Ui(new Float32Array(x.array),x.itemSize));break;case"BatchedMesh":h=a(t.geometry),d=l(t.material),o=new za(t.maxInstanceCount,t.maxVertexCount,t.maxIndexCount,d),o.geometry=h,o.perObjectFrustumCulled=t.perObjectFrustumCulled,o.sortObjects=t.sortObjects,o._drawRanges=t.drawRanges,o._reservedRanges=t.reservedRanges,o._geometryInfo=t.geometryInfo.map(g=>{let m=null,M=null;return g.boundingBox!==void 0&&(m=new Je().fromJSON(g.boundingBox)),g.boundingSphere!==void 0&&(M=new Ye().fromJSON(g.boundingSphere)),{...g,boundingBox:m,boundingSphere:M}}),o._instanceInfo=t.instanceInfo,o._availableInstanceIds=t._availableInstanceIds,o._availableGeometryIds=t._availableGeometryIds,o._nextIndexStart=t.nextIndexStart,o._nextVertexStart=t.nextVertexStart,o._geometryCount=t.geometryCount,o._maxInstanceCount=t.maxInstanceCount,o._maxVertexCount=t.maxVertexCount,o._maxIndexCount=t.maxIndexCount,o._geometryInitialized=t.geometryInitialized,o._matricesTexture=c(t.matricesTexture.uuid),o._indirectTexture=c(t.indirectTexture.uuid),t.colorsTexture!==void 0&&(o._colorsTexture=c(t.colorsTexture.uuid)),t.boundingSphere!==void 0&&(o.boundingSphere=new Ye().fromJSON(t.boundingSphere)),t.boundingBox!==void 0&&(o.boundingBox=new Je().fromJSON(t.boundingBox));break;case"LOD":o=new Ua;break;case"Line":o=new ii(a(t.geometry),l(t.material));break;case"LineLoop":o=new ka(a(t.geometry),l(t.material));break;case"LineSegments":o=new Un(a(t.geometry),l(t.material));break;case"PointCloud":case"Points":o=new Gs(a(t.geometry),l(t.material));break;case"Sprite":o=new Na(l(t.material));break;case"Group":o=new Ii;break;case"Bone":o=new Qr;break;default:o=new me}if(o.uuid=t.uuid,t.name!==void 0&&(o.name=t.name),t.matrix!==void 0?(o.matrix.fromArray(t.matrix),t.matrixAutoUpdate!==void 0&&(o.matrixAutoUpdate=t.matrixAutoUpdate),o.matrixAutoUpdate&&o.matrix.decompose(o.position,o.quaternion,o.scale)):(t.position!==void 0&&o.position.fromArray(t.position),t.rotation!==void 0&&o.rotation.fromArray(t.rotation),t.quaternion!==void 0&&o.quaternion.fromArray(t.quaternion),t.scale!==void 0&&o.scale.fromArray(t.scale)),t.up!==void 0&&o.up.fromArray(t.up),t.pivot!==void 0&&(o.pivot=new U().fromArray(t.pivot)),t.morphTargetDictionary!==void 0&&(o.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),t.morphTargetInfluences!==void 0&&(o.morphTargetInfluences=t.morphTargetInfluences.slice()),t.castShadow!==void 0&&(o.castShadow=t.castShadow),t.receiveShadow!==void 0&&(o.receiveShadow=t.receiveShadow),t.shadow&&(t.shadow.intensity!==void 0&&(o.shadow.intensity=t.shadow.intensity),t.shadow.bias!==void 0&&(o.shadow.bias=t.shadow.bias),t.shadow.normalBias!==void 0&&(o.shadow.normalBias=t.shadow.normalBias),t.shadow.radius!==void 0&&(o.shadow.radius=t.shadow.radius),t.shadow.blurSamples!==void 0&&(o.shadow.blurSamples=t.shadow.blurSamples),t.shadow.focus!==void 0&&(o.shadow.focus=t.shadow.focus),t.shadow.aspect!==void 0&&(o.shadow.aspect=t.shadow.aspect),t.shadow.mapSize!==void 0&&o.shadow.mapSize.fromArray(t.shadow.mapSize),t.shadow.camera!==void 0&&(o.shadow.camera=this.parseObject(t.shadow.camera))),t.visible!==void 0&&(o.visible=t.visible),t.frustumCulled!==void 0&&(o.frustumCulled=t.frustumCulled),t.renderOrder!==void 0&&(o.renderOrder=t.renderOrder),t.static!==void 0&&(o.static=t.static),t.userData!==void 0&&(o.userData=t.userData),t.layers!==void 0&&(o.layers.mask=t.layers),t.children!==void 0){let u=t.children;for(let f=0;f<u.length;f++)o.add(this.parseObject(u[f],e,n,i,r))}if(t.animations!==void 0){let u=t.animations;for(let f=0;f<u.length;f++){let p=u[f];o.animations.push(r[p])}}if(t.type==="LOD"){t.autoUpdate!==void 0&&(o.autoUpdate=t.autoUpdate);let u=t.levels;for(let f=0;f<u.length;f++){let p=u[f],x=o.getObjectByProperty("uuid",p.object);x!==void 0&&o.addLevel(x,p.distance,p.hysteresis)}}return o}bindSkeletons(t,e){Object.keys(e).length!==0&&t.traverse(function(n){if(n.isSkinnedMesh===!0&&n.skeleton!==void 0){let i=e[n.skeleton];i===void 0?Bt("ObjectLoader: No skeleton found with UUID:",n.skeleton):n.bind(i,n.bindMatrix)}})}bindLightTargets(t){t.traverse(function(e){if(e.isDirectionalLight||e.isSpotLight){let n=e.target,i=t.getObjectByProperty("uuid",n);i!==void 0?e.target=i:e.target=new me}})}},gv={UVMapping:Ol,CubeReflectionMapping:oi,CubeRefractionMapping:Vi,EquirectangularReflectionMapping:Ro,EquirectangularRefractionMapping:Po,CubeUVReflectionMapping:ir},r0={RepeatWrapping:kr,ClampToEdgeWrapping:Mn,MirroredRepeatWrapping:Vr},o0={NearestFilter:ze,NearestMipmapNearestFilter:Hu,NearestMipmapLinearFilter:sr,LinearFilter:Ce,LinearMipmapNearestFilter:Io,LinearMipmapLinearFilter:ai},sf=new WeakMap,nu=class extends ln{constructor(t){super(t),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Bt("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Bt("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(t){return this.options=t,this}load(t,e,n,i){t===void 0&&(t=""),this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);let r=this,o=ei.get(`image-bitmap:${t}`);if(o!==void 0){if(r.manager.itemStart(t),o.then){o.then(c=>{sf.has(o)===!0?(i&&i(sf.get(o)),r.manager.itemError(t),r.manager.itemEnd(t)):(e&&e(c),r.manager.itemEnd(t))});return}setTimeout(function(){e&&e(o),r.manager.itemEnd(t)},0);return}let a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let l=fetch(t,a).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign({},r.options,{colorSpaceConversion:"none"}))}).then(function(c){return ei.add(`image-bitmap:${t}`,c),e&&e(c),r.manager.itemEnd(t),c}).catch(function(c){i&&i(c),sf.set(l,c),ei.remove(`image-bitmap:${t}`),r.manager.itemError(t),r.manager.itemEnd(t)});ei.add(`image-bitmap:${t}`,l),r.manager.itemStart(t)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}},yo=class{static getContext(){return Sh===void 0&&(Sh=new(window.AudioContext||window.webkitAudioContext)),Sh}static setContext(t){Sh=t}},iu=class extends ln{constructor(t){super(t)}load(t,e,n,i){let r=this,o=new $n(this.manager);o.setResponseType("arraybuffer"),o.setPath(this.path),o.setRequestHeader(this.requestHeader),o.setWithCredentials(this.withCredentials),o.load(t,function(l){try{let c=l.slice(0),h=yo.getContext(),d=t+"#decode";r.manager.itemStart(d),h.decodeAudioData(c,function(u){e(u),r.manager.itemEnd(d)}).catch(function(u){a(u),r.manager.itemEnd(d)})}catch(c){a(c)}},n,i);function a(l){i?i(l):Qt(l),r.manager.itemError(t)}}},a0=new re,l0=new re,Es=new re,su=class{constructor(){this.type="StereoCamera",this.aspect=1,this.eyeSep=.064,this.cameraL=new Be,this.cameraL.layers.enable(1),this.cameraL.matrixAutoUpdate=!1,this.cameraR=new Be,this.cameraR.layers.enable(2),this.cameraR.matrixAutoUpdate=!1,this._cache={focus:null,fov:null,aspect:null,near:null,far:null,zoom:null,eyeSep:null}}update(t){let e=this._cache;if(e.focus!==t.focus||e.fov!==t.fov||e.aspect!==t.aspect*this.aspect||e.near!==t.near||e.far!==t.far||e.zoom!==t.zoom||e.eyeSep!==this.eyeSep){e.focus=t.focus,e.fov=t.fov,e.aspect=t.aspect*this.aspect,e.near=t.near,e.far=t.far,e.zoom=t.zoom,e.eyeSep=this.eyeSep,Es.copy(t.projectionMatrix);let i=e.eyeSep/2,r=i*e.near/e.focus,o=e.near*Math.tan(Ds*e.fov*.5)/e.zoom,a,l;l0.elements[12]=-i,a0.elements[12]=i,a=-o*e.aspect+r,l=o*e.aspect+r,Es.elements[0]=2*e.near/(l-a),Es.elements[8]=(l+a)/(l-a),this.cameraL.projectionMatrix.copy(Es),a=-o*e.aspect-r,l=o*e.aspect-r,Es.elements[0]=2*e.near/(l-a),Es.elements[8]=(l+a)/(l-a),this.cameraR.projectionMatrix.copy(Es)}this.cameraL.matrix.copy(t.matrixWorld).multiply(l0),this.cameraL.matrixWorldNeedsUpdate=!0,this.cameraR.matrix.copy(t.matrixWorld).multiply(a0),this.cameraR.matrixWorldNeedsUpdate=!0}},Nr=-90,Ur=1,Il=class extends me{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let i=new Be(Nr,Ur,t,e);i.layers=this.layers,this.add(i);let r=new Be(Nr,Ur,t,e);r.layers=this.layers,this.add(r);let o=new Be(Nr,Ur,t,e);o.layers=this.layers,this.add(o);let a=new Be(Nr,Ur,t,e);a.layers=this.layers,this.add(a);let l=new Be(Nr,Ur,t,e);l.layers=this.layers,this.add(l);let c=new Be(Nr,Ur,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,i,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Cn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===ss)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),p=t.xr.enabled;t.xr.enabled=!1;let x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;t.isWebGLRenderer===!0?g=t.state.buffers.depth.getReversed():g=t.reversedDepthBuffer,t.setRenderTarget(n,0,i),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,i),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,i),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,i),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,i),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=x,t.setRenderTarget(n,5,i),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Ll=class extends Be{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},tr=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=xv.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};Cs=new U,rf=new tn,_v=new U,Rs=new U,Ps=new U,ru=class extends me{constructor(){super(),this.type="AudioListener",this.context=yo.getContext(),this.gain=this.context.createGain(),this.gain.connect(this.context.destination),this.filter=null,this.timeDelta=0,this._timer=new tr}getInput(){return this.gain}removeFilter(){return this.filter!==null&&(this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination),this.gain.connect(this.context.destination),this.filter=null),this}getFilter(){return this.filter}setFilter(t){return this.filter!==null?(this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination)):this.gain.disconnect(this.context.destination),this.filter=t,this.gain.connect(this.filter),this.filter.connect(this.context.destination),this}getMasterVolume(){return this.gain.gain.value}setMasterVolume(t){return this.gain.gain.setTargetAtTime(t,this.context.currentTime,.01),this}updateMatrixWorld(t){super.updateMatrixWorld(t),this._timer.update();let e=this.context.listener;if(this.timeDelta=this._timer.getDelta(),this.matrixWorld.decompose(Cs,rf,_v),Rs.set(0,0,-1).applyQuaternion(rf),Ps.set(0,1,0).applyQuaternion(rf),e.positionX){let n=this.context.currentTime+this.timeDelta;e.positionX.linearRampToValueAtTime(Cs.x,n),e.positionY.linearRampToValueAtTime(Cs.y,n),e.positionZ.linearRampToValueAtTime(Cs.z,n),e.forwardX.linearRampToValueAtTime(Rs.x,n),e.forwardY.linearRampToValueAtTime(Rs.y,n),e.forwardZ.linearRampToValueAtTime(Rs.z,n),e.upX.linearRampToValueAtTime(Ps.x,n),e.upY.linearRampToValueAtTime(Ps.y,n),e.upZ.linearRampToValueAtTime(Ps.z,n)}else e.setPosition(Cs.x,Cs.y,Cs.z),e.setOrientation(Rs.x,Rs.y,Rs.z,Ps.x,Ps.y,Ps.z)}},Dl=class extends me{constructor(t){super(),this.type="Audio",this.listener=t,this.context=t.context,this.gain=this.context.createGain(),this.gain.connect(t.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(t){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=t,this.connect(),this}setMediaElementSource(t){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(t),this.connect(),this}setMediaStreamSource(t){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(t),this.connect(),this}setBuffer(t){return this.buffer=t,this.sourceType="buffer",this.autoplay&&this.play(),this}play(t=0){if(this.isPlaying===!0){Bt("Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){Bt("Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+t;let e=this.context.createBufferSource();return e.buffer=this.buffer,e.loop=this.loop,e.loopStart=this.loopStart,e.loopEnd=this.loopEnd,e.onended=this.onEnded.bind(this),e.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=e,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){Bt("Audio: this Audio has no playback control.");return}return this.isPlaying===!0&&(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0&&(this._progress=this._progress%(this.duration||this.buffer.duration)),this.source.stop(),this.source.onended=null,this.isPlaying=!1),this}stop(t=0){if(this.hasPlaybackControl===!1){Bt("Audio: this Audio has no playback control.");return}return this._progress=0,this.source!==null&&(this.source.stop(this.context.currentTime+t),this.source.onended=null),this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let t=1,e=this.filters.length;t<e;t++)this.filters[t-1].connect(this.filters[t]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this._connected!==!1){if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let t=1,e=this.filters.length;t<e;t++)this.filters[t-1].disconnect(this.filters[t]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}}getFilters(){return this.filters}setFilters(t){return t||(t=[]),this._connected===!0?(this.disconnect(),this.filters=t.slice(),this.connect()):this.filters=t.slice(),this}setDetune(t){return this.detune=t,this.isPlaying===!0&&this.source.detune!==void 0&&this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,.01),this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(t){return this.setFilters(t?[t]:[])}setPlaybackRate(t){if(this.hasPlaybackControl===!1){Bt("Audio: this Audio has no playback control.");return}return this.playbackRate=t,this.isPlaying===!0&&this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,.01),this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1,this._progress=0}getLoop(){return this.hasPlaybackControl===!1?(Bt("Audio: this Audio has no playback control."),!1):this.loop}setLoop(t){if(this.hasPlaybackControl===!1){Bt("Audio: this Audio has no playback control.");return}return this.loop=t,this.isPlaying===!0&&(this.source.loop=this.loop),this}setLoopStart(t){return this.loopStart=t,this}setLoopEnd(t){return this.loopEnd=t,this}getVolume(){return this.gain.gain.value}setVolume(t){return this.gain.gain.setTargetAtTime(t,this.context.currentTime,.01),this}copy(t,e){return super.copy(t,e),t.sourceType!=="buffer"?(Bt("Audio: Audio source type cannot be copied."),this):(this.autoplay=t.autoplay,this.buffer=t.buffer,this.detune=t.detune,this.loop=t.loop,this.loopStart=t.loopStart,this.loopEnd=t.loopEnd,this.offset=t.offset,this.duration=t.duration,this.playbackRate=t.playbackRate,this.hasPlaybackControl=t.hasPlaybackControl,this.sourceType=t.sourceType,this.filters=t.filters.slice(),this)}clone(t){return new this.constructor(this.listener).copy(this,t)}},Is=new U,c0=new tn,vv=new U,Ls=new U,ou=class extends Dl{constructor(t){super(t),this.panner=this.context.createPanner(),this.panner.panningModel="HRTF",this.panner.connect(this.gain)}connect(){return super.connect(),this.panner.connect(this.gain),this}disconnect(){return super.disconnect(),this.panner.disconnect(this.gain),this}getOutput(){return this.panner}getRefDistance(){return this.panner.refDistance}setRefDistance(t){return this.panner.refDistance=t,this}getRolloffFactor(){return this.panner.rolloffFactor}setRolloffFactor(t){return this.panner.rolloffFactor=t,this}getDistanceModel(){return this.panner.distanceModel}setDistanceModel(t){return this.panner.distanceModel=t,this}getMaxDistance(){return this.panner.maxDistance}setMaxDistance(t){return this.panner.maxDistance=t,this}setDirectionalCone(t,e,n){return this.panner.coneInnerAngle=t,this.panner.coneOuterAngle=e,this.panner.coneOuterGain=n,this}updateMatrixWorld(t){if(super.updateMatrixWorld(t),this.hasPlaybackControl===!0&&this.isPlaying===!1)return;this.matrixWorld.decompose(Is,c0,vv),Ls.set(0,0,1).applyQuaternion(c0);let e=this.panner;if(e.positionX){let n=this.context.currentTime+this.listener.timeDelta;e.positionX.linearRampToValueAtTime(Is.x,n),e.positionY.linearRampToValueAtTime(Is.y,n),e.positionZ.linearRampToValueAtTime(Is.z,n),e.orientationX.linearRampToValueAtTime(Ls.x,n),e.orientationY.linearRampToValueAtTime(Ls.y,n),e.orientationZ.linearRampToValueAtTime(Ls.z,n)}else e.setPosition(Is.x,Is.y,Is.z),e.setOrientation(Ls.x,Ls.y,Ls.z)}},au=class{constructor(t,e=2048){this.analyser=t.context.createAnalyser(),this.analyser.fftSize=e,this.data=new Uint8Array(this.analyser.frequencyBinCount),t.getOutput().connect(this.analyser)}getFrequencyData(){return this.analyser.getByteFrequencyData(this.data),this.data}getAverageFrequency(){let t=0,e=this.getFrequencyData();for(let n=0;n<e.length;n++)t+=e[n];return t/e.length}},Nl=class{constructor(t,e,n){this.binding=t,this.valueSize=n;let i,r,o;switch(e){case"quaternion":i=this._slerp,r=this._slerpAdditive,o=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":i=this._select,r=this._select,o=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:i=this._lerp,r=this._lerpAdditive,o=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=i,this._mixBufferRegionAdditive=r,this._setIdentity=o,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(t,e){let n=this.buffer,i=this.valueSize,r=t*i+i,o=this.cumulativeWeight;if(o===0){for(let a=0;a!==i;++a)n[r+a]=n[a];o=e}else{o+=e;let a=e/o;this._mixBufferRegion(n,r,0,a,i)}this.cumulativeWeight=o}accumulateAdditive(t){let e=this.buffer,n=this.valueSize,i=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(e,i,0,t,n),this.cumulativeWeightAdditive+=t}apply(t){let e=this.valueSize,n=this.buffer,i=t*e+e,r=this.cumulativeWeight,o=this.cumulativeWeightAdditive,a=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,r<1){let l=e*this._origIndex;this._mixBufferRegion(n,i,l,1-r,e)}o>0&&this._mixBufferRegionAdditive(n,i,this._addIndex*e,1,e);for(let l=e,c=e+e;l!==c;++l)if(n[l]!==n[l+e]){a.setValue(n,i);break}}saveOriginalState(){let t=this.binding,e=this.buffer,n=this.valueSize,i=n*this._origIndex;t.getValue(e,i);for(let r=n,o=i;r!==o;++r)e[r]=e[i+r%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let t=this.valueSize*3;this.binding.setValue(this.buffer,t)}_setAdditiveIdentityNumeric(){let t=this._addIndex*this.valueSize,e=t+this.valueSize;for(let n=t;n<e;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let t=this._origIndex*this.valueSize,e=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[e+n]=this.buffer[t+n]}_select(t,e,n,i,r){if(i>=.5)for(let o=0;o!==r;++o)t[e+o]=t[n+o]}_slerp(t,e,n,i){tn.slerpFlat(t,e,t,e,t,n,i)}_slerpAdditive(t,e,n,i,r){let o=this._workIndex*r;tn.multiplyQuaternionsFlat(t,o,t,e,t,n),tn.slerpFlat(t,e,t,e,t,o,i)}_lerp(t,e,n,i,r){let o=1-i;for(let a=0;a!==r;++a){let l=e+a;t[l]=t[l]*o+t[n+a]*i}}_lerpAdditive(t,e,n,i,r){for(let o=0;o!==r;++o){let a=e+o;t[a]=t[a]+t[n+o]*i}}},cp="\\[\\]\\.:\\/",yv=new RegExp("["+cp+"]","g"),hp="[^"+cp+"]",Mv="[^"+cp.replace("\\.","")+"]",Sv=/((?:WC+[\/:])*)/.source.replace("WC",hp),bv=/(WCOD+)?/.source.replace("WCOD",Mv),wv=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",hp),Tv=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",hp),Av=new RegExp("^"+Sv+bv+wv+Tv+"$"),Ev=["material","materials","bones","map"],vf=class{constructor(t,e,n){let i=n||Se.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,i)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,r=n.length;i!==r;++i)n[i].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},Se=class s{constructor(t,e,n){this.path=e,this.parsedPath=n||s.parseTrackName(e),this.node=s.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new s.Composite(t,e,n):new s(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(yv,"")}static parseTrackName(t){let e=Av.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let r=n.nodeName.substring(i+1);Ev.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=n(a.children);if(l)return l}return null},i=n(t.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)t[e++]=n[i]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,i=e.propertyName,r=e.propertyIndex;if(t||(t=s.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Bt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){Qt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Qt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Qt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Qt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Qt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Qt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){Qt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[i];if(o===void 0){let c=e.nodeName;Qt("PropertyBinding: Trying to update property for track: "+c+"."+i+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(i==="morphTargetInfluences"){if(!t.geometry){Qt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Qt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Se.Composite=vf;Se.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Se.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Se.prototype.GetterByBindingType=[Se.prototype._getValue_direct,Se.prototype._getValue_array,Se.prototype._getValue_arrayElement,Se.prototype._getValue_toArray];Se.prototype.SetterByBindingTypeAndVersioning=[[Se.prototype._setValue_direct,Se.prototype._setValue_direct_setNeedsUpdate,Se.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_array,Se.prototype._setValue_array_setNeedsUpdate,Se.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_arrayElement,Se.prototype._setValue_arrayElement_setNeedsUpdate,Se.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Se.prototype._setValue_fromArray,Se.prototype._setValue_fromArray_setNeedsUpdate,Se.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];lu=class{constructor(){this.isAnimationObjectGroup=!0,this.uuid=Dn(),this._objects=Array.prototype.slice.call(arguments),this.nCachedObjects_=0;let t={};this._indicesByUUID=t;for(let n=0,i=arguments.length;n!==i;++n)t[arguments[n].uuid]=n;this._paths=[],this._parsedPaths=[],this._bindings=[],this._bindingsIndicesByPath={};let e=this;this.stats={objects:{get total(){return e._objects.length},get inUse(){return this.total-e.nCachedObjects_}},get bindingsPerObject(){return e._bindings.length}}}add(){let t=this._objects,e=this._indicesByUUID,n=this._paths,i=this._parsedPaths,r=this._bindings,o=r.length,a,l=t.length,c=this.nCachedObjects_;for(let h=0,d=arguments.length;h!==d;++h){let u=arguments[h],f=u.uuid,p=e[f];if(p===void 0){p=l++,e[f]=p,t.push(u);for(let x=0,g=o;x!==g;++x)r[x].push(new Se(u,n[x],i[x]))}else if(p<c){a=t[p];let x=--c,g=t[x];e[g.uuid]=p,t[p]=g,e[f]=x,t[x]=u;for(let m=0,M=o;m!==M;++m){let w=r[m],y=w[x],S=w[p];w[p]=y,S===void 0&&(S=new Se(u,n[m],i[m])),w[x]=S}}else t[p]!==a&&Qt("AnimationObjectGroup: Different objects with the same UUID detected. Clean the caches or recreate your infrastructure when reloading scenes.")}this.nCachedObjects_=c}remove(){let t=this._objects,e=this._indicesByUUID,n=this._bindings,i=n.length,r=this.nCachedObjects_;for(let o=0,a=arguments.length;o!==a;++o){let l=arguments[o],c=l.uuid,h=e[c];if(h!==void 0&&h>=r){let d=r++,u=t[d];e[u.uuid]=h,t[h]=u,e[c]=d,t[d]=l;for(let f=0,p=i;f!==p;++f){let x=n[f],g=x[d],m=x[h];x[h]=g,x[d]=m}}}this.nCachedObjects_=r}uncache(){let t=this._objects,e=this._indicesByUUID,n=this._bindings,i=n.length,r=this.nCachedObjects_,o=t.length;for(let a=0,l=arguments.length;a!==l;++a){let c=arguments[a],h=c.uuid,d=e[h];if(d!==void 0)if(delete e[h],d<r){let u=--r,f=t[u],p=--o,x=t[p];d!==u&&(e[f.uuid]=d),t[d]=f,u!==p&&(e[x.uuid]=u),t[u]=x,t.pop();for(let g=0,m=i;g!==m;++g){let M=n[g],w=M[u],y=M[p];M[d]=w,M[u]=y,M.pop()}}else{let u=--o,f=t[u];d!==u&&(e[f.uuid]=d),t[d]=f,t.pop();for(let p=0,x=i;p!==x;++p){let g=n[p];g[d]=g[u],g.pop()}}}this.nCachedObjects_=r}subscribe_(t,e){let n=this._bindingsIndicesByPath,i=n[t],r=this._bindings;if(i!==void 0)return r[i];let o=this._paths,a=this._parsedPaths,l=this._objects,c=l.length,h=this.nCachedObjects_,d=new Array(c);i=r.length,n[t]=i,o.push(t),a.push(e),r.push(d);for(let u=h,f=l.length;u!==f;++u){let p=l[u];d[u]=new Se(p,t,e)}return d}unsubscribe_(t){let e=this._bindingsIndicesByPath,n=e[t];if(n!==void 0){let i=this._paths,r=this._parsedPaths,o=this._bindings,a=o.length-1,l=o[a],c=i[a];e[c]=n,o[n]=l,o.pop(),r[n]=r[a],r.pop(),i[n]=i[a],i.pop()}}},Ul=class{constructor(t,e,n=null,i=e.blendMode){this._mixer=t,this._clip=e,this._localRoot=n,this.blendMode=i;let r=e.tracks,o=r.length,a=new Array(o),l={endingStart:ns,endingEnd:ns};for(let c=0;c!==o;++c){let h=r[c].createInterpolant(null);a[c]=h,h.settings=l}this._interpolantSettings=l,this._interpolants=a,this._propertyBindings=new Array(o),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._restoreTimeScale=null,this._weightInterpolant=null,this.loop=Yf,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(t){return this._startTime=t,this}setLoop(t,e){return this.loop=t,this.repetitions=e,this}setEffectiveWeight(t){return this.weight=t,this._effectiveWeight=this.enabled?t:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(t){return this._scheduleFading(t,0,1)}fadeOut(t){return this._scheduleFading(t,1,0)}crossFadeFrom(t,e,n=!1){if(t.fadeOut(e),this.fadeIn(e),n===!0){let i=this._clip.duration,r=t._clip.duration,o=r/i,a=i/r;t._restoreTimeScale=t.timeScale,this._restoreTimeScale=this.timeScale,t.warp(1,o,e),this.warp(a,1,e)}return this}crossFadeTo(t,e,n=!1){return t.crossFadeFrom(this,e,n)}stopFading(){let t=this._weightInterpolant;return t!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(t)),this}setEffectiveTimeScale(t){return this.timeScale=t,this._effectiveTimeScale=this.paused?0:t,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(t){return this.timeScale=this._clip.duration/t,this.stopWarping()}syncWith(t){return this.time=t.time,this.timeScale=t.timeScale,this.stopWarping()}halt(t){return this.warp(this._effectiveTimeScale,0,t)}warp(t,e,n){let i=this._mixer,r=i.time,o=this.timeScale,a=this._timeScaleInterpolant;a===null&&(a=i._lendControlInterpolant(),this._timeScaleInterpolant=a);let l=a.parameterPositions,c=a.sampleValues;return l[0]=r,l[1]=r+n,c[0]=t/o,c[1]=e/o,this}stopWarping(){let t=this._timeScaleInterpolant;return t!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(t)),this._restoreTimeScale=null,this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(t,e,n,i){if(!this.enabled){this._updateWeight(t);return}let r=this._startTime;if(r!==null){let l=(t-r)*n;l<0||n===0?e=0:(this._startTime=null,e=n*l)}e*=this._updateTimeScale(t);let o=this._updateTime(e),a=this._updateWeight(t);if(a>0){let l=this._interpolants,c=this._propertyBindings;switch(this.blendMode){case Ju:for(let h=0,d=l.length;h!==d;++h)l[h].evaluate(o),c[h].accumulateAdditive(a);break;case yc:default:for(let h=0,d=l.length;h!==d;++h)l[h].evaluate(o),c[h].accumulate(i,a)}}}_updateWeight(t){let e=0;if(this.enabled){e=this.weight;let n=this._weightInterpolant;if(n!==null){let i=n.evaluate(t)[0];e*=i,t>n.parameterPositions[1]&&(this.stopFading(),i===0&&(this.enabled=!1))}}return this._effectiveWeight=e,e}_updateTimeScale(t){let e=0;if(!this.paused){e=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let i=n.evaluate(t)[0];e*=i,t>n.parameterPositions[1]&&(e===0?this.paused=!0:(this._restoreTimeScale!==null&&(e=this._restoreTimeScale),this.timeScale=e),this.stopWarping())}}return this._effectiveTimeScale=e,e}_updateTime(t){let e=this._clip.duration,n=this.loop,i=this.time+t,r=this._loopCount,o=n===$f;if(t===0)return r===-1?i:o&&(r&1)===1?e-i:i;if(n===qf){r===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));t:{if(i>=e)i=e;else if(i<0)i=0;else{this.time=i;break t}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:t<0?-1:1})}}else{if(r===-1&&(t>=0?(r=0,this._setEndings(!0,this.repetitions===0,o)):this._setEndings(this.repetitions===0,!0,o)),i>=e||i<0){let a=Math.floor(i/e);i-=e*a,r+=Math.abs(a);let l=this.repetitions-r;if(l<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,i=t>0?e:0,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:t>0?1:-1});else{if(l===1){let c=t<0;this._setEndings(c,!c,o)}else this._setEndings(!1,!1,o);this._loopCount=r,this.time=i,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:a})}}else this._loopCount=r,this.time=i;if(o&&(r&1)===1)return e-i}return i}_setEndings(t,e,n){let i=this._interpolantSettings;n?(i.endingStart=is,i.endingEnd=is):(t?i.endingStart=this.zeroSlopeAtStart?is:ns:i.endingStart=Hr,e?i.endingEnd=this.zeroSlopeAtEnd?is:ns:i.endingEnd=Hr)}_scheduleFading(t,e,n){let i=this._mixer,r=i.time,o=this._weightInterpolant;o===null&&(o=i._lendControlInterpolant(),this._weightInterpolant=o);let a=o.parameterPositions,l=o.sampleValues;return a[0]=r,l[0]=e,a[1]=r+t,l[1]=n,this}},Cv=new Float32Array(1),cu=class extends Rn{constructor(t){super(),this._root=t,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}_bindAction(t,e){let n=t._localRoot||this._root,i=t._clip.tracks,r=i.length,o=t._propertyBindings,a=t._interpolants,l=n.uuid,c=this._bindingsByRootAndName,h=c[l];h===void 0&&(h={},c[l]=h);for(let d=0;d!==r;++d){let u=i[d],f=u.name,p=h[f];if(p!==void 0)++p.referenceCount,o[d]=p;else{if(p=o[d],p!==void 0){p._cacheIndex===null&&(++p.referenceCount,this._addInactiveBinding(p,l,f));continue}let x=e&&e._propertyBindings[d].binding.parsedPath;p=new Nl(Se.create(n,f,x),u.ValueTypeName,u.getValueSize()),++p.referenceCount,this._addInactiveBinding(p,l,f),o[d]=p}a[d].resultBuffer=p.buffer}}_activateAction(t){if(!this._isActiveAction(t)){if(t._cacheIndex===null){let n=(t._localRoot||this._root).uuid,i=t._clip.uuid,r=this._actionsByClip[i];this._bindAction(t,r&&r.knownActions[0]),this._addInactiveAction(t,i,n)}let e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){let r=e[n];r.useCount++===0&&(this._lendBinding(r),r.saveOriginalState())}this._lendAction(t)}}_deactivateAction(t){if(this._isActiveAction(t)){let e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){let r=e[n];--r.useCount===0&&(r.restoreOriginalState(),this._takeBackBinding(r))}this._takeBackAction(t)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let t=this;this.stats={actions:{get total(){return t._actions.length},get inUse(){return t._nActiveActions}},bindings:{get total(){return t._bindings.length},get inUse(){return t._nActiveBindings}},controlInterpolants:{get total(){return t._controlInterpolants.length},get inUse(){return t._nActiveControlInterpolants}}}}_isActiveAction(t){let e=t._cacheIndex;return e!==null&&e<this._nActiveActions}_addInactiveAction(t,e,n){let i=this._actions,r=this._actionsByClip,o=r[e];if(o===void 0)o={knownActions:[t],actionByRoot:{}},t._byClipCacheIndex=0,r[e]=o;else{let a=o.knownActions;t._byClipCacheIndex=a.length,a.push(t)}t._cacheIndex=i.length,i.push(t),o.actionByRoot[n]=t}_removeInactiveAction(t){let e=this._actions,n=e[e.length-1],i=t._cacheIndex;n._cacheIndex=i,e[i]=n,e.pop(),t._cacheIndex=null;let r=t._clip.uuid,o=this._actionsByClip,a=o[r],l=a.knownActions,c=l[l.length-1],h=t._byClipCacheIndex;c._byClipCacheIndex=h,l[h]=c,l.pop(),t._byClipCacheIndex=null;let d=a.actionByRoot,u=(t._localRoot||this._root).uuid;delete d[u],l.length===0&&delete o[r],this._removeInactiveBindingsForAction(t)}_removeInactiveBindingsForAction(t){let e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){let r=e[n];--r.referenceCount===0&&this._removeInactiveBinding(r)}}_lendAction(t){let e=this._actions,n=t._cacheIndex,i=this._nActiveActions++,r=e[i];t._cacheIndex=i,e[i]=t,r._cacheIndex=n,e[n]=r}_takeBackAction(t){let e=this._actions,n=t._cacheIndex,i=--this._nActiveActions,r=e[i];t._cacheIndex=i,e[i]=t,r._cacheIndex=n,e[n]=r}_addInactiveBinding(t,e,n){let i=this._bindingsByRootAndName,r=this._bindings,o=i[e];o===void 0&&(o={},i[e]=o),o[n]=t,t._cacheIndex=r.length,r.push(t)}_removeInactiveBinding(t){let e=this._bindings,n=t.binding,i=n.rootNode.uuid,r=n.path,o=this._bindingsByRootAndName,a=o[i],l=e[e.length-1],c=t._cacheIndex;l._cacheIndex=c,e[c]=l,e.pop(),delete a[r],Object.keys(a).length===0&&delete o[i]}_lendBinding(t){let e=this._bindings,n=t._cacheIndex,i=this._nActiveBindings++,r=e[i];t._cacheIndex=i,e[i]=t,r._cacheIndex=n,e[n]=r}_takeBackBinding(t){let e=this._bindings,n=t._cacheIndex,i=--this._nActiveBindings,r=e[i];t._cacheIndex=i,e[i]=t,r._cacheIndex=n,e[n]=r}_lendControlInterpolant(){let t=this._controlInterpolants,e=this._nActiveControlInterpolants++,n=t[e];return n===void 0&&(n=new po(new Float32Array(2),new Float32Array(2),1,Cv),n.__cacheIndex=e,t[e]=n),n}_takeBackControlInterpolant(t){let e=this._controlInterpolants,n=t.__cacheIndex,i=--this._nActiveControlInterpolants,r=e[i];t.__cacheIndex=i,e[i]=t,r.__cacheIndex=n,e[n]=r}clipAction(t,e,n){let i=e||this._root,r=i.uuid,o=typeof t=="string"?us.findByName(i,t):t,a=o!==null?o.uuid:t,l=this._actionsByClip[a],c=null;if(n===void 0&&(o!==null?n=o.blendMode:n=yc),l!==void 0){let d=l.actionByRoot[r];if(d!==void 0&&d.blendMode===n)return d;c=l.knownActions[0],o===null&&(o=c._clip)}if(o===null)return null;let h=new Ul(this,o,e,n);return this._bindAction(h,c),this._addInactiveAction(h,a,r),h}existingAction(t,e){let n=e||this._root,i=n.uuid,r=typeof t=="string"?us.findByName(n,t):t,o=r?r.uuid:t,a=this._actionsByClip[o];return a!==void 0&&a.actionByRoot[i]||null}stopAllAction(){let t=this._actions,e=this._nActiveActions;for(let n=e-1;n>=0;--n)t[n].stop();return this}update(t){t*=this.timeScale;let e=this._actions,n=this._nActiveActions,i=this.time+=t,r=Math.sign(t),o=this._accuIndex^=1;for(let c=0;c!==n;++c)e[c]._update(i,t,r,o);let a=this._bindings,l=this._nActiveBindings;for(let c=0;c!==l;++c)a[c].apply(o);return this}setTime(t){this.time=0;for(let e=0;e<this._actions.length;e++)this._actions[e].time=0;return this.update(t)}getRoot(){return this._root}uncacheClip(t){let e=this._actions,n=t.uuid,i=this._actionsByClip,r=i[n];if(r!==void 0){let o=r.knownActions;for(let a=0,l=o.length;a!==l;++a){let c=o[a];this._deactivateAction(c);let h=c._cacheIndex,d=e[e.length-1];c._cacheIndex=null,c._byClipCacheIndex=null,d._cacheIndex=h,e[h]=d,e.pop(),this._removeInactiveBindingsForAction(c)}delete i[n]}}uncacheRoot(t){let e=t.uuid,n=this._actionsByClip;for(let o in n){let a=n[o].actionByRoot,l=a[e];l!==void 0&&(this._deactivateAction(l),this._removeInactiveAction(l))}let i=this._bindingsByRootAndName,r=i[e];if(r!==void 0)for(let o in r){let a=r[o];a.restoreOriginalState(),this._removeInactiveBinding(a)}}uncacheAction(t,e){let n=this.existingAction(t,e);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}},hu=class extends $r{constructor(t=1,e=1,n=1,i={}){super(t,e,i),this.isRenderTarget3D=!0,this.depth=n;for(let r=0;r<this.textures.length;r++){let o=new Os(null,t,e,n);o.isRenderTargetTexture=!0,o.renderTarget=this,this.textures[r]=o}this._setTextureOptions(i)}},uu=class s{constructor(t){this.value=t}clone(){return new s(this.value.clone===void 0?this.value:this.value.clone())}},Rv=0,du=class extends Rn{constructor(){super(),this.isUniformsGroup=!0,Object.defineProperty(this,"id",{value:Rv++}),this.name="",this.usage=bc,this.uniforms=[]}add(t){return this.uniforms.push(t),this}remove(t){let e=this.uniforms.indexOf(t);return e!==-1&&this.uniforms.splice(e,1),this}setName(t){return this.name=t,this}setUsage(t){return this.usage=t,this}dispose(){this.dispatchEvent({type:"dispose"})}copy(t){this.name=t.name,this.usage=t.usage;let e=t.uniforms;this.uniforms.length=0;for(let n=0,i=e.length;n<i;n++){let r=Array.isArray(e[n])?e[n]:[e[n]];for(let o=0;o<r.length;o++)this.uniforms.push(r[o].clone())}return this}clone(){return new this.constructor().copy(this)}},fu=class extends ks{constructor(t,e,n=1){super(t,e),this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=n}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}clone(t){let e=super.clone(t);return e.meshPerAttribute=this.meshPerAttribute,e}toJSON(t){let e=super.toJSON(t);return e.isInstancedInterleavedBuffer=!0,e.meshPerAttribute=this.meshPerAttribute,e}},pu=class{constructor(t,e,n,i,r,o=!1){this.isGLBufferAttribute=!0,this.name="",this.buffer=t,this.type=e,this.itemSize=n,this.elementSize=i,this.count=r,this.normalized=o,this.version=0}set needsUpdate(t){t===!0&&this.version++}setBuffer(t){return this.buffer=t,this}setType(t,e){return this.type=t,this.elementSize=e,this}setItemSize(t){return this.itemSize=t,this}setCount(t){return this.count=t,this}},h0=new re,mu=class{constructor(t,e,n=0,i=1/0){this.ray=new Ni(t,e),this.near=n,this.far=i,this.camera=null,this.layers=new Bs,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Qt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return h0.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(h0),this}intersectObject(t,e=!0,n=[]){return yf(t,this,n,e),n.sort(u0),n}intersectObjects(t,e=!0,n=[]){for(let i=0,r=t.length;i<r;i++)yf(t[i],this,n,e);return n.sort(u0),n}};gu=class{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Bt("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let e=performance.now();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}},xu=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=ie(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(ie(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}},_u=class{constructor(t=1,e=0,n=0){this.radius=t,this.theta=e,this.y=n}set(t,e,n){return this.radius=t,this.theta=e,this.y=n,this}copy(t){return this.radius=t.radius,this.theta=t.theta,this.y=t.y,this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+n*n),this.theta=Math.atan2(t,n),this.y=e,this}clone(){return new this.constructor().copy(this)}},mp=class mp{constructor(t,e,n,i){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,i){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=i,this}};mp.prototype.isMatrix2=!0;vu=mp,d0=new Mt,Fl=class{constructor(t=new Mt(1/0,1/0),e=new Mt(-1/0,-1/0)){this.isBox2=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=d0.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(t){return this.isEmpty()?t.set(0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,d0).distanceTo(t)}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}},f0=new U,bh=new U,Fr=new U,Or=new U,of=new U,Pv=new U,Iv=new U,yu=class{constructor(t=new U,e=new U){this.start=t,this.end=e}set(t,e){return this.start.copy(t),this.end.copy(e),this}copy(t){return this.start.copy(t.start),this.end.copy(t.end),this}getCenter(t){return t.addVectors(this.start,this.end).multiplyScalar(.5)}delta(t){return t.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(t,e){return this.delta(e).multiplyScalar(t).add(this.start)}closestPointToPointParameter(t,e){f0.subVectors(t,this.start),bh.subVectors(this.end,this.start);let n=bh.dot(bh);if(n===0)return 0;let r=bh.dot(f0)/n;return e&&(r=ie(r,0,1)),r}closestPointToPoint(t,e,n){let i=this.closestPointToPointParameter(t,e);return this.delta(n).multiplyScalar(i).add(this.start)}distanceSqToLine3(t,e=Pv,n=Iv){let i=10000000000000001e-32,r,o,a=this.start,l=t.start,c=this.end,h=t.end;Fr.subVectors(c,a),Or.subVectors(h,l),of.subVectors(a,l);let d=Fr.dot(Fr),u=Or.dot(Or),f=Or.dot(of);if(d<=i&&u<=i)return e.copy(a),n.copy(l),e.sub(n),e.dot(e);if(d<=i)r=0,o=f/u,o=ie(o,0,1);else{let p=Fr.dot(of);if(u<=i)o=0,r=ie(-p/d,0,1);else{let x=Fr.dot(Or),g=d*u-x*x;g!==0?r=ie((x*f-p*u)/g,0,1):r=0,o=(x*r+f)/u,o<0?(o=0,r=ie(-p/d,0,1)):o>1&&(o=1,r=ie((x-p)/d,0,1))}}return e.copy(a).addScaledVector(Fr,r),n.copy(l).addScaledVector(Or,o),e.distanceToSquared(n)}applyMatrix4(t){return this.start.applyMatrix4(t),this.end.applyMatrix4(t),this}equals(t){return t.start.equals(this.start)&&t.end.equals(this.end)}clone(){return new this.constructor().copy(this)}},p0=new U,Mu=class extends me{constructor(t,e){super(),this.light=t,this.matrixAutoUpdate=!1,this.color=e,this.type="SpotLightHelper";let n=new se,i=[0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,-1,0,1,0,0,0,0,1,1,0,0,0,0,-1,1];for(let o=0,a=1,l=32;o<l;o++,a++){let c=o/l*Math.PI*2,h=a/l*Math.PI*2;i.push(Math.cos(c),Math.sin(c),1,Math.cos(h),Math.sin(h),1)}n.setAttribute("position",new Xt(i,3));let r=new en({fog:!1,toneMapped:!1});this.cone=new Un(n,r),this.add(this.cone),this.update()}dispose(){super.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}update(){this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),this.parent?(this.parent.updateWorldMatrix(!0),this.matrix.copy(this.parent.matrixWorld).invert().multiply(this.light.matrixWorld)):this.matrix.copy(this.light.matrixWorld),this.matrixWorldNeedsUpdate=!0;let t=this.light.distance?this.light.distance:1e3,e=t*Math.tan(this.light.angle);this.cone.scale.set(e,e,t),p0.setFromMatrixPosition(this.light.target.matrixWorld),this.cone.lookAt(p0),this.color!==void 0?this.cone.material.color.set(this.color):this.cone.material.color.copy(this.light.color)}},es=new U,wh=new re,af=new re,Su=class extends Un{constructor(t){let e=Rg(t),n=new se,i=[],r=[];for(let c=0;c<e.length;c++){let h=e[c];h.parent&&h.parent.isBone&&(i.push(0,0,0),i.push(0,0,0),r.push(0,0,0),r.push(0,0,0))}n.setAttribute("position",new Xt(i,3)),n.setAttribute("color",new Xt(r,3));let o=new en({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(n,o),this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=t,this.bones=e,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1;let a=new zt(255),l=new zt(65280);this.setColors(a,l)}updateMatrixWorld(t){let e=this.bones,n=this.geometry,i=n.getAttribute("position");af.copy(this.root.matrixWorld).invert();for(let r=0,o=0;r<e.length;r++){let a=e[r];a.parent&&a.parent.isBone&&(wh.multiplyMatrices(af,a.matrixWorld),es.setFromMatrixPosition(wh),i.setXYZ(o,es.x,es.y,es.z),wh.multiplyMatrices(af,a.parent.matrixWorld),es.setFromMatrixPosition(wh),i.setXYZ(o+1,es.x,es.y,es.z),o+=2)}n.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(t)}setColors(t,e){let i=this.geometry.getAttribute("color");for(let r=0;r<i.count;r+=2)i.setXYZ(r,t.r,t.g,t.b),i.setXYZ(r+1,e.r,e.g,e.b);return i.needsUpdate=!0,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}};bu=class extends ve{constructor(t,e,n){let i=new ho(e,4,2),r=new Nn({wireframe:!0,fog:!1,toneMapped:!1});super(i,r),this.light=t,this.color=n,this.type="PointLightHelper",this.matrix=this.light.matrixWorld,this.matrixAutoUpdate=!1,this.update()}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}update(){this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),this.color!==void 0?this.material.color.set(this.color):this.material.color.copy(this.light.color)}},Lv=new U,m0=new zt,g0=new zt,wu=class extends me{constructor(t,e,n){super(),this.light=t,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1,this.color=n,this.type="HemisphereLightHelper";let i=new co(e);i.rotateY(Math.PI*.5),this.material=new Nn({wireframe:!0,fog:!1,toneMapped:!1}),this.color===void 0&&(this.material.vertexColors=!0);let r=i.getAttribute("position"),o=new Float32Array(r.count*3);i.setAttribute("color",new pe(o,3)),this.add(new ve(i,this.material)),this.update()}dispose(){super.dispose(),this.children[0].geometry.dispose(),this.children[0].material.dispose()}update(){let t=this.children[0];if(this.color!==void 0)this.material.color.set(this.color);else{let e=t.geometry.getAttribute("color");m0.copy(this.light.color),g0.copy(this.light.groundColor);for(let n=0,i=e.count;n<i;n++){let r=n<i/2?m0:g0;e.setXYZ(n,r.r,r.g,r.b)}e.needsUpdate=!0}this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),t.lookAt(Lv.setFromMatrixPosition(this.light.matrixWorld).negate())}},Tu=class extends Un{constructor(t=10,e=10,n=4473924,i=8947848){n=new zt(n),i=new zt(i);let r=e/2,o=t/e,a=t/2,l=[],c=[];for(let u=0,f=0,p=-a;u<=e;u++,p+=o){l.push(-a,0,p,a,0,p),l.push(p,0,-a,p,0,a);let x=u===r?n:i;x.toArray(c,f),f+=3,x.toArray(c,f),f+=3,x.toArray(c,f),f+=3,x.toArray(c,f),f+=3}let h=new se;h.setAttribute("position",new Xt(l,3)),h.setAttribute("color",new Xt(c,3));let d=new en({vertexColors:!0,toneMapped:!1});super(h,d),this.type="GridHelper"}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}},Au=class extends Un{constructor(t=10,e=16,n=8,i=64,r=4473924,o=8947848){r=new zt(r),o=new zt(o);let a=[],l=[];if(e>1)for(let d=0;d<e;d++){let u=d/e*(Math.PI*2),f=Math.sin(u)*t,p=Math.cos(u)*t;a.push(0,0,0),a.push(f,0,p);let x=d&1?r:o;l.push(x.r,x.g,x.b),l.push(x.r,x.g,x.b)}for(let d=0;d<n;d++){let u=d&1?r:o,f=t-t/n*d;for(let p=0;p<i;p++){let x=p/i*(Math.PI*2),g=Math.sin(x)*f,m=Math.cos(x)*f;a.push(g,0,m),l.push(u.r,u.g,u.b),x=(p+1)/i*(Math.PI*2),g=Math.sin(x)*f,m=Math.cos(x)*f,a.push(g,0,m),l.push(u.r,u.g,u.b)}}let c=new se;c.setAttribute("position",new Xt(a,3)),c.setAttribute("color",new Xt(l,3));let h=new en({vertexColors:!0,toneMapped:!1});super(c,h),this.type="PolarGridHelper"}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}},x0=new U,Th=new U,_0=new U,Eu=class extends me{constructor(t,e,n){super(),this.light=t,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1,this.color=n,this.type="DirectionalLightHelper",e===void 0&&(e=1);let i=new se;i.setAttribute("position",new Xt([-e,e,0,e,e,0,e,-e,0,-e,-e,0,-e,e,0],3));let r=new en({fog:!1,toneMapped:!1});this.lightPlane=new ii(i,r),this.add(this.lightPlane),i=new se,i.setAttribute("position",new Xt([0,0,0,0,0,1],3)),this.targetLine=new ii(i,r),this.add(this.targetLine),this.update()}dispose(){super.dispose(),this.lightPlane.geometry.dispose(),this.lightPlane.material.dispose(),this.targetLine.geometry.dispose(),this.targetLine.material.dispose()}update(){this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),x0.setFromMatrixPosition(this.light.matrixWorld),Th.setFromMatrixPosition(this.light.target.matrixWorld),_0.subVectors(Th,x0),this.lightPlane.lookAt(Th),this.color!==void 0?(this.lightPlane.material.color.set(this.color),this.targetLine.material.color.set(this.color)):(this.lightPlane.material.color.copy(this.light.color),this.targetLine.material.color.copy(this.light.color)),this.targetLine.lookAt(Th),this.targetLine.scale.z=_0.length()}},Ah=new U,Oe=new Qs,Cu=class extends Un{constructor(t){let e=new se,n=new en({color:16777215,vertexColors:!0,toneMapped:!1}),i=[],r=[],o={};a("n1","n2"),a("n2","n4"),a("n4","n3"),a("n3","n1"),a("f1","f2"),a("f2","f4"),a("f4","f3"),a("f3","f1"),a("n1","f1"),a("n2","f2"),a("n3","f3"),a("n4","f4"),a("p","n1"),a("p","n2"),a("p","n3"),a("p","n4"),a("u1","u2"),a("u2","u3"),a("u3","u1"),a("c","t"),a("p","c"),a("cn1","cn2"),a("cn3","cn4"),a("cf1","cf2"),a("cf3","cf4");function a(p,x){l(p),l(x)}function l(p){i.push(0,0,0),r.push(0,0,0),o[p]===void 0&&(o[p]=[]),o[p].push(i.length/3-1)}e.setAttribute("position",new Xt(i,3)),e.setAttribute("color",new Xt(r,3)),super(e,n),this.type="CameraHelper",this.camera=t,this.camera.updateProjectionMatrix&&this.camera.updateProjectionMatrix(),this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1,this.pointMap=o,this.update();let c=new zt(16755200),h=new zt(16711680),d=new zt(43775),u=new zt(16777215),f=new zt(3355443);this.setColors(c,h,d,u,f)}setColors(t,e,n,i,r){let a=this.geometry.getAttribute("color");return a.setXYZ(0,t.r,t.g,t.b),a.setXYZ(1,t.r,t.g,t.b),a.setXYZ(2,t.r,t.g,t.b),a.setXYZ(3,t.r,t.g,t.b),a.setXYZ(4,t.r,t.g,t.b),a.setXYZ(5,t.r,t.g,t.b),a.setXYZ(6,t.r,t.g,t.b),a.setXYZ(7,t.r,t.g,t.b),a.setXYZ(8,t.r,t.g,t.b),a.setXYZ(9,t.r,t.g,t.b),a.setXYZ(10,t.r,t.g,t.b),a.setXYZ(11,t.r,t.g,t.b),a.setXYZ(12,t.r,t.g,t.b),a.setXYZ(13,t.r,t.g,t.b),a.setXYZ(14,t.r,t.g,t.b),a.setXYZ(15,t.r,t.g,t.b),a.setXYZ(16,t.r,t.g,t.b),a.setXYZ(17,t.r,t.g,t.b),a.setXYZ(18,t.r,t.g,t.b),a.setXYZ(19,t.r,t.g,t.b),a.setXYZ(20,t.r,t.g,t.b),a.setXYZ(21,t.r,t.g,t.b),a.setXYZ(22,t.r,t.g,t.b),a.setXYZ(23,t.r,t.g,t.b),a.setXYZ(24,e.r,e.g,e.b),a.setXYZ(25,e.r,e.g,e.b),a.setXYZ(26,e.r,e.g,e.b),a.setXYZ(27,e.r,e.g,e.b),a.setXYZ(28,e.r,e.g,e.b),a.setXYZ(29,e.r,e.g,e.b),a.setXYZ(30,e.r,e.g,e.b),a.setXYZ(31,e.r,e.g,e.b),a.setXYZ(32,n.r,n.g,n.b),a.setXYZ(33,n.r,n.g,n.b),a.setXYZ(34,n.r,n.g,n.b),a.setXYZ(35,n.r,n.g,n.b),a.setXYZ(36,n.r,n.g,n.b),a.setXYZ(37,n.r,n.g,n.b),a.setXYZ(38,i.r,i.g,i.b),a.setXYZ(39,i.r,i.g,i.b),a.setXYZ(40,r.r,r.g,r.b),a.setXYZ(41,r.r,r.g,r.b),a.setXYZ(42,r.r,r.g,r.b),a.setXYZ(43,r.r,r.g,r.b),a.setXYZ(44,r.r,r.g,r.b),a.setXYZ(45,r.r,r.g,r.b),a.setXYZ(46,r.r,r.g,r.b),a.setXYZ(47,r.r,r.g,r.b),a.setXYZ(48,r.r,r.g,r.b),a.setXYZ(49,r.r,r.g,r.b),a.needsUpdate=!0,this}update(){let t=this.geometry,e=this.pointMap,n=1,i=1,r,o;if(Oe.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse),this.camera.reversedDepth===!0)r=1,o=0;else if(this.camera.coordinateSystem===Cn)r=-1,o=1;else if(this.camera.coordinateSystem===ss)r=0,o=1;else throw new Error("THREE.CameraHelper.update(): Invalid coordinate system: "+this.camera.coordinateSystem);We("c",e,t,Oe,0,0,r),We("t",e,t,Oe,0,0,o),We("n1",e,t,Oe,-n,-i,r),We("n2",e,t,Oe,n,-i,r),We("n3",e,t,Oe,-n,i,r),We("n4",e,t,Oe,n,i,r),We("f1",e,t,Oe,-n,-i,o),We("f2",e,t,Oe,n,-i,o),We("f3",e,t,Oe,-n,i,o),We("f4",e,t,Oe,n,i,o),We("u1",e,t,Oe,n*.7,i*1.1,r),We("u2",e,t,Oe,-n*.7,i*1.1,r),We("u3",e,t,Oe,0,i*2,r),We("cf1",e,t,Oe,-n,0,o),We("cf2",e,t,Oe,n,0,o),We("cf3",e,t,Oe,0,-i,o),We("cf4",e,t,Oe,0,i,o),We("cn1",e,t,Oe,-n,0,r),We("cn2",e,t,Oe,n,0,r),We("cn3",e,t,Oe,0,-i,r),We("cn4",e,t,Oe,0,i,r),t.getAttribute("position").needsUpdate=!0}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}};Eh=new Je,Ru=class extends Un{constructor(t,e=16776960){let n=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),i=new Float32Array(24),r=new se;r.setIndex(new pe(n,1)),r.setAttribute("position",new pe(i,3)),super(r,new en({color:e,toneMapped:!1})),this.object=t,this.type="BoxHelper",this.matrixAutoUpdate=!1,this.update()}update(){if(this.object!==void 0&&Eh.setFromObject(this.object),Eh.isEmpty())return;let t=Eh.min,e=Eh.max,n=this.geometry.attributes.position,i=n.array;i[0]=e.x,i[1]=e.y,i[2]=e.z,i[3]=t.x,i[4]=e.y,i[5]=e.z,i[6]=t.x,i[7]=t.y,i[8]=e.z,i[9]=e.x,i[10]=t.y,i[11]=e.z,i[12]=e.x,i[13]=e.y,i[14]=t.z,i[15]=t.x,i[16]=e.y,i[17]=t.z,i[18]=t.x,i[19]=t.y,i[20]=t.z,i[21]=e.x,i[22]=t.y,i[23]=t.z,n.needsUpdate=!0,this.geometry.computeBoundingSphere()}setFromObject(t){return this.object=t,this.update(),this}copy(t,e){return super.copy(t,e),this.object=t.object,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}},Pu=class extends Un{constructor(t,e=16776960){let n=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),i=[1,1,1,-1,1,1,-1,-1,1,1,-1,1,1,1,-1,-1,1,-1,-1,-1,-1,1,-1,-1],r=new se;r.setIndex(new pe(n,1)),r.setAttribute("position",new Xt(i,3)),super(r,new en({color:e,toneMapped:!1})),this.box=t,this.type="Box3Helper",this.geometry.computeBoundingSphere()}updateMatrixWorld(t){let e=this.box;e.isEmpty()||(e.getCenter(this.position),e.getSize(this.scale),this.scale.multiplyScalar(.5),super.updateMatrixWorld(t))}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}},Iu=class extends ii{constructor(t,e=1,n=16776960){let i=n,r=[1,-1,0,-1,1,0,-1,-1,0,1,1,0,-1,1,0,-1,-1,0,1,-1,0,1,1,0],o=new se;o.setAttribute("position",new Xt(r,3)),o.computeBoundingSphere(),super(o,new en({color:i,toneMapped:!1})),this.type="PlaneHelper",this.plane=t,this.size=e;let a=[1,1,0,-1,1,0,-1,-1,0,1,1,0,-1,-1,0,1,-1,0],l=new se;l.setAttribute("position",new Xt(a,3)),l.computeBoundingSphere(),this.add(new ve(l,new Nn({color:i,opacity:.2,transparent:!0,depthWrite:!1,toneMapped:!1})))}updateMatrixWorld(t){this.position.set(0,0,0),this.scale.set(.5*this.size,.5*this.size,1),this.lookAt(this.plane.normal),this.translateZ(-this.plane.constant),super.updateMatrixWorld(t)}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose(),this.children[0].geometry.dispose(),this.children[0].material.dispose()}},v0=new U,Lu=class extends me{constructor(t=new U(0,0,1),e=new U(0,0,0),n=1,i=16776960,r=n*.2,o=r*.2){super(),this.type="ArrowHelper",Ch===void 0&&(Ch=new se,Ch.setAttribute("position",new Xt([0,0,0,0,1,0],3)),lf=new no(.5,1,5,1),lf.translate(0,-.5,0)),this.position.copy(e),this.line=new ii(Ch,new en({color:i,toneMapped:!1})),this.line.matrixAutoUpdate=!1,this.add(this.line),this.cone=new ve(lf,new Nn({color:i,toneMapped:!1})),this.cone.matrixAutoUpdate=!1,this.add(this.cone),this.setDirection(t),this.setLength(n,r,o)}setDirection(t){if(t.y>.99999)this.quaternion.set(0,0,0,1);else if(t.y<-.99999)this.quaternion.set(1,0,0,0);else{v0.set(t.z,0,-t.x).normalize();let e=Math.acos(t.y);this.quaternion.setFromAxisAngle(v0,e)}}setLength(t,e=t*.2,n=e*.2){this.line.scale.set(1,Math.max(1e-4,t-e),1),this.line.updateMatrix(),this.cone.scale.set(n,e,n),this.cone.position.y=t,this.cone.updateMatrix()}setColor(t){this.line.material.color.set(t),this.cone.material.color.set(t)}copy(t){return super.copy(t,!1),this.line.copy(t.line),this.cone.copy(t.cone),this}dispose(){super.dispose(),this.line.geometry.dispose(),this.line.material.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}},Du=class extends Un{constructor(t=1){let e=[0,0,0,t,0,0,0,0,0,0,t,0,0,0,0,0,0,t],n=[1,0,0,1,.6,0,0,1,0,.6,1,0,0,0,1,0,.6,1],i=new se;i.setAttribute("position",new Xt(e,3)),i.setAttribute("color",new Xt(n,3));let r=new en({vertexColors:!0,toneMapped:!1});super(i,r),this.type="AxesHelper"}setColors(t,e,n){let i=new zt,r=this.geometry.attributes.color.array;return i.set(t),i.toArray(r,0),i.toArray(r,3),i.set(e),i.toArray(r,6),i.toArray(r,9),i.set(n),i.toArray(r,12),i.toArray(r,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}},Nu=class{constructor(){this.type="ShapePath",this.color=new zt,this.subPaths=[],this.currentPath=null,this.userData={}}moveTo(t,e){return this.currentPath=new ls,this.subPaths.push(this.currentPath),this.currentPath.moveTo(t,e),this}lineTo(t,e){return this.currentPath.lineTo(t,e),this}quadraticCurveTo(t,e,n,i){return this.currentPath.quadraticCurveTo(t,e,n,i),this}bezierCurveTo(t,e,n,i,r,o){return this.currentPath.bezierCurveTo(t,e,n,i,r,o),this}splineThru(t){return this.currentPath.splineThru(t),this}toShapes(){function t(l,c){let h=!1,d=c.length;for(let u=0,f=d-1;u<d;f=u++){let p=c[u],x=c[f];p.y>l.y!=x.y>l.y&&l.x<(x.x-p.x)*(l.y-p.y)/(x.y-p.y)+p.x&&(h=!h)}return h}function e(l,c){let h=c.getCenter(new Mt);if(t(h,l))return h;let d=h.y,u=[],f=l.length;for(let p=0;p<f;p++){let x=l[p],g=l[(p+1)%f];if(x.y>d!=g.y>d){let m=x.x+(d-x.y)*(g.x-x.x)/(g.y-x.y);u.push(m)}}return u.length>1&&(u.sort((p,x)=>p-x),h.x=(u[0]+u[1])/2),h}let n=this.userData.style&&this.userData.style.fillRule||"nonzero";n!=="nonzero"&&n!=="evenodd"&&(Bt('Fill-rule "'+n+'" is not supported, falling back to "nonzero".'),n="nonzero");let i=n==="nonzero"?(l=>l!==0):(l=>(l&1)!==0),r=[];for(let l of this.subPaths){let c=l.getPoints();if(c.length<3)continue;let h=qn.area(c);if(h===0)continue;let d=new Fl;for(let u=0;u<c.length;u++)d.expandByPoint(c[u]);r.push({subPath:l,points:c,boundingBox:d,interiorPoint:e(c,d),absArea:Math.abs(h),winding:h<0?-1:1,container:null,exclude:!1,role:null})}r.sort((l,c)=>c.absArea-l.absArea);for(let l=0;l<r.length;l++){let c=r[l],h=0;for(let d=l-1;d>=0;d--){let u=r[d];if(u.boundingBox.containsBox(c.boundingBox)&&t(c.interiorPoint,u.points)){c.container=u.exclude?u.container:u,h=u.winding,c.winding+=h;break}}i(c.winding)===i(h)&&(c.exclude=!0)}for(let l of r)l.exclude||(l.role=l.container===null||l.container.role==="hole"?"outer":"hole");let o=[],a=new Map;for(let l of r){if(l.exclude||l.role!=="outer")continue;let c=new cs;c.curves=l.subPath.curves,o.push(c),a.set(l,c)}for(let l of r){if(l.exclude||l.role!=="hole")continue;let c=a.get(l.container);if(!c)continue;let h=new ls;h.curves=l.subPath.curves,c.holes.push(h)}return o}},Uu=class extends Rn{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};Fu=class{static contain(t,e){return Dv(t,e)}static cover(t,e){return Nv(t,e)}static fill(t){return Uv(t)}static getByteLength(t,e,n,i){return Qu(t,e,n,i)}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Bt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186")});var ft={};vs(ft,{ACESFilmicToneMapping:()=>ms,AddEquation:()=>ps,AddOperation:()=>Wf,AdditiveAnimationBlendMode:()=>Ju,AdditiveBlending:()=>fs,AgXToneMapping:()=>Eo,AlphaFormat:()=>$u,AlwaysCompare:()=>ip,AlwaysDepth:()=>wa,AlwaysStencilFunc:()=>Kf,AmbientLight:()=>Tl,AnimationAction:()=>Ul,AnimationClip:()=>us,AnimationLoader:()=>Jh,AnimationMixer:()=>cu,AnimationObjectGroup:()=>lu,AnimationUtils:()=>Zh,ArcCurve:()=>Ya,ArrayCamera:()=>Ll,ArrowHelper:()=>Lu,AttachedBindMode:()=>Rh,Audio:()=>Dl,AudioAnalyser:()=>au,AudioContext:()=>yo,AudioListener:()=>ru,AudioLoader:()=>iu,AxesHelper:()=>Du,BackSide:()=>nn,BasicDepthPacking:()=>Zf,BasicShadowMap:()=>b0,BatchedMesh:()=>za,BezierInterpolant:()=>yl,Bone:()=>Qr,BooleanKeyframeTrack:()=>mi,Box2:()=>Fl,Box3:()=>Je,Box3Helper:()=>Pu,BoxGeometry:()=>pi,BoxHelper:()=>Ru,BufferAttribute:()=>pe,BufferGeometry:()=>se,BufferGeometryLoader:()=>Pl,ByteType:()=>Wu,Cache:()=>ei,Camera:()=>Qs,CameraHelper:()=>Cu,CanvasTexture:()=>Ws,CapsuleGeometry:()=>Ha,CatmullRomCurve3:()=>$a,CineonToneMapping:()=>To,CircleGeometry:()=>Wa,ClampToEdgeWrapping:()=>Mn,Clock:()=>gu,Color:()=>zt,ColorKeyframeTrack:()=>mo,ColorManagement:()=>he,Compatibility:()=>ug,CompressedArrayTexture:()=>Xh,CompressedCubeTexture:()=>qh,CompressedTexture:()=>Hs,CompressedTextureLoader:()=>Kh,ConeGeometry:()=>no,ConstantAlphaFactor:()=>Vf,ConstantColorFactor:()=>zf,Controls:()=>Uu,CubeCamera:()=>Il,CubeDepthTexture:()=>Ga,CubeReflectionMapping:()=>oi,CubeRefractionMapping:()=>Vi,CubeTexture:()=>as,CubeTextureLoader:()=>Qh,CubeUVReflectionMapping:()=>ir,CubicBezierCurve:()=>io,CubicBezierCurve3:()=>Za,CubicInterpolant:()=>_l,CullFaceBack:()=>Bu,CullFaceFront:()=>bf,CullFaceFrontBack:()=>S0,CullFaceNone:()=>Sf,Curve:()=>Pn,CurvePath:()=>Ka,CustomBlending:()=>Tf,CustomToneMapping:()=>Ao,CylinderGeometry:()=>eo,Cylindrical:()=>_u,Data3DTexture:()=>Os,DataArrayTexture:()=>Fs,DataTexture:()=>Sn,DataTextureLoader:()=>jh,DataUtils:()=>Nh,DecrementStencilOp:()=>G0,DecrementWrapStencilOp:()=>W0,DefaultLoadingManager:()=>lp,DepthFormat:()=>ni,DepthStencilFormat:()=>Gi,DepthTexture:()=>Fi,DetachedBindMode:()=>Xf,DirectionalLight:()=>wl,DirectionalLightHelper:()=>Eu,DiscreteInterpolant:()=>vl,DodecahedronGeometry:()=>Xa,DoubleSide:()=>ri,DstAlphaFactor:()=>Nf,DstColorFactor:()=>Ff,DynamicCopyUsage:()=>rg,DynamicDrawUsage:()=>j0,DynamicReadUsage:()=>ng,EdgesGeometry:()=>qa,EllipseCurve:()=>Xs,EqualCompare:()=>tp,EqualDepth:()=>Aa,EqualStencilFunc:()=>$0,EquirectangularReflectionMapping:()=>Ro,EquirectangularRefractionMapping:()=>Po,Euler:()=>Yn,EventDispatcher:()=>Rn,ExternalTexture:()=>to,ExtrudeGeometry:()=>el,FileLoader:()=>$n,Float16BufferAttribute:()=>kh,Float32BufferAttribute:()=>Xt,FloatType:()=>pn,Fog:()=>Da,FogExp2:()=>La,FramebufferTexture:()=>Wh,FrontSide:()=>ki,Frustum:()=>fi,FrustumArray:()=>Ba,GLBufferAttribute:()=>pu,GLSL1:()=>ag,GLSL3:()=>Ku,GreaterCompare:()=>ep,GreaterDepth:()=>Ca,GreaterEqualCompare:()=>Sc,GreaterEqualDepth:()=>Ea,GreaterEqualStencilFunc:()=>Q0,GreaterStencilFunc:()=>J0,GridHelper:()=>Tu,Group:()=>Ii,HTMLTexture:()=>Yh,HalfFloatType:()=>sn,HemisphereLight:()=>Sl,HemisphereLightHelper:()=>wu,IcosahedronGeometry:()=>nl,ImageBitmapLoader:()=>nu,ImageLoader:()=>ds,ImageUtils:()=>Ia,IncrementStencilOp:()=>V0,IncrementWrapStencilOp:()=>H0,InstancedBufferAttribute:()=>Ui,InstancedBufferGeometry:()=>Rl,InstancedInterleavedBuffer:()=>fu,InstancedMesh:()=>Vs,Int16BufferAttribute:()=>Bh,Int32BufferAttribute:()=>zh,Int8BufferAttribute:()=>Uh,IntType:()=>Bl,InterleavedBuffer:()=>ks,InterleavedBufferAttribute:()=>os,Interpolant:()=>zi,InterpolateBezier:()=>Ph,InterpolateDiscrete:()=>Gr,InterpolateLinear:()=>Pa,InterpolateSmooth:()=>xa,InterpolationSamplingMode:()=>hg,InterpolationSamplingType:()=>cg,InvertStencilOp:()=>X0,KeepStencilOp:()=>_a,KeyframeTrack:()=>bn,LOD:()=>Ua,LatheGeometry:()=>il,Layers:()=>Bs,LessCompare:()=>jf,LessDepth:()=>Ta,LessEqualCompare:()=>Mc,LessEqualDepth:()=>Ns,LessEqualStencilFunc:()=>Z0,LessStencilFunc:()=>Y0,Light:()=>si,LightProbe:()=>El,LightShadow:()=>Ks,Line:()=>ii,Line3:()=>yu,LineBasicMaterial:()=>en,LineCurve:()=>so,LineCurve3:()=>Ja,LineDashedMaterial:()=>xl,LineLoop:()=>ka,LineSegments:()=>Un,LinearFilter:()=>Ce,LinearInterpolant:()=>po,LinearMipMapLinearFilter:()=>C0,LinearMipMapNearestFilter:()=>E0,LinearMipmapLinearFilter:()=>ai,LinearMipmapNearestFilter:()=>Io,LinearSRGBColorSpace:()=>Wr,LinearToneMapping:()=>bo,LinearTransfer:()=>Xr,Loader:()=>ln,LoaderUtils:()=>vo,LoadingManager:()=>xo,LoopOnce:()=>qf,LoopPingPong:()=>$f,LoopRepeat:()=>Yf,MOUSE:()=>y0,Material:()=>$e,MaterialBlending:()=>w0,MaterialLoader:()=>Cl,MathUtils:()=>vg,Matrix2:()=>vu,Matrix3:()=>oe,Matrix4:()=>re,MaxEquation:()=>Rf,Mesh:()=>ve,MeshBasicMaterial:()=>Nn,MeshDepthMaterial:()=>uo,MeshDistanceMaterial:()=>fo,MeshLambertMaterial:()=>$s,MeshMatcapMaterial:()=>gl,MeshNormalMaterial:()=>ml,MeshPhongMaterial:()=>fl,MeshPhysicalMaterial:()=>dl,MeshStandardMaterial:()=>Bi,MeshToonMaterial:()=>pl,MinEquation:()=>Cf,MirroredRepeatWrapping:()=>Vr,MixOperation:()=>Hf,MultiplyBlending:()=>ku,MultiplyOperation:()=>So,NearestFilter:()=>ze,NearestMipMapLinearFilter:()=>A0,NearestMipMapNearestFilter:()=>T0,NearestMipmapLinearFilter:()=>sr,NearestMipmapNearestFilter:()=>Hu,NeutralToneMapping:()=>Co,NeverCompare:()=>Qf,NeverDepth:()=>ba,NeverStencilFunc:()=>q0,NoBlending:()=>Fn,NoColorSpace:()=>vi,NoNormalPacking:()=>F0,NoToneMapping:()=>Zn,NormalAnimationBlendMode:()=>yc,NormalBlending:()=>nr,NormalGAPacking:()=>B0,NormalRGPacking:()=>O0,NotEqualCompare:()=>np,NotEqualDepth:()=>Ra,NotEqualStencilFunc:()=>K0,NumberKeyframeTrack:()=>Zs,Object3D:()=>me,ObjectLoader:()=>eu,ObjectSpaceNormalMap:()=>Jf,OctahedronGeometry:()=>co,OneFactor:()=>If,OneMinusConstantAlphaFactor:()=>Gf,OneMinusConstantColorFactor:()=>kf,OneMinusDstAlphaFactor:()=>Uf,OneMinusDstColorFactor:()=>Of,OneMinusSrcAlphaFactor:()=>Gu,OneMinusSrcColorFactor:()=>Df,OrthographicCamera:()=>xi,PCFShadowMap:()=>Mo,PCFSoftShadowMap:()=>wf,PMREMGenerator:()=>cr,Path:()=>ls,PerspectiveCamera:()=>Be,Plane:()=>Wn,PlaneGeometry:()=>Ys,PlaneHelper:()=>Iu,PointLight:()=>js,PointLightHelper:()=>bu,Points:()=>Gs,PointsMaterial:()=>jr,PolarGridHelper:()=>Au,PolyhedronGeometry:()=>Oi,PositionalAudio:()=>ou,PropertyBinding:()=>Se,PropertyMixer:()=>Nl,QuadraticBezierCurve:()=>ro,QuadraticBezierCurve3:()=>oo,Quaternion:()=>tn,QuaternionKeyframeTrack:()=>Js,QuaternionLinearInterpolant:()=>Ml,R11_EAC_Format:()=>Kl,RED_GREEN_RGTC2_Format:()=>Bo,RED_RGTC1_Format:()=>xc,REVISION:()=>Mf,RG11_EAC_Format:()=>Oo,RGBADepthPacking:()=>D0,RGBAFormat:()=>mn,RGBAIntegerFormat:()=>Hl,RGBA_ASTC_10x10_Format:()=>uc,RGBA_ASTC_10x5_Format:()=>lc,RGBA_ASTC_10x6_Format:()=>cc,RGBA_ASTC_10x8_Format:()=>hc,RGBA_ASTC_12x10_Format:()=>dc,RGBA_ASTC_12x12_Format:()=>fc,RGBA_ASTC_4x4_Format:()=>tc,RGBA_ASTC_5x4_Format:()=>ec,RGBA_ASTC_5x5_Format:()=>nc,RGBA_ASTC_6x5_Format:()=>ic,RGBA_ASTC_6x6_Format:()=>sc,RGBA_ASTC_8x5_Format:()=>rc,RGBA_ASTC_8x6_Format:()=>oc,RGBA_ASTC_8x8_Format:()=>ac,RGBA_BPTC_Format:()=>pc,RGBA_ETC2_EAC_Format:()=>Jl,RGBA_PVRTC_2BPPV1_Format:()=>Yl,RGBA_PVRTC_4BPPV1_Format:()=>ql,RGBA_S3TC_DXT1_Format:()=>No,RGBA_S3TC_DXT3_Format:()=>Uo,RGBA_S3TC_DXT5_Format:()=>Fo,RGBDepthPacking:()=>N0,RGBFormat:()=>Zu,RGBIntegerFormat:()=>R0,RGB_BPTC_SIGNED_Format:()=>mc,RGB_BPTC_UNSIGNED_Format:()=>gc,RGB_ETC1_Format:()=>$l,RGB_ETC2_Format:()=>Zl,RGB_PVRTC_2BPPV1_Format:()=>Xl,RGB_PVRTC_4BPPV1_Format:()=>Wl,RGB_S3TC_DXT1_Format:()=>Do,RGDepthPacking:()=>U0,RGFormat:()=>Hi,RGIntegerFormat:()=>Gl,RawShaderMaterial:()=>hs,Ray:()=>Ni,Raycaster:()=>mu,RectAreaLight:()=>Al,RedFormat:()=>Vl,RedIntegerFormat:()=>Lo,ReinhardToneMapping:()=>wo,RenderObjectRefreshType:()=>dg,RenderTarget:()=>$r,RenderTarget3D:()=>hu,RepeatWrapping:()=>kr,ReplaceStencilOp:()=>k0,ReverseSubtractEquation:()=>Ef,RingGeometry:()=>sl,SIGNED_R11_EAC_Format:()=>Ql,SIGNED_RED_GREEN_RGTC2_Format:()=>vc,SIGNED_RED_RGTC1_Format:()=>_c,SIGNED_RG11_EAC_Format:()=>jl,SRGBColorSpace:()=>Ze,SRGBTransfer:()=>_e,Scene:()=>Di,ShaderChunk:()=>le,ShaderLib:()=>li,ShaderMaterial:()=>Pe,ShadowMaterial:()=>ul,Shape:()=>cs,ShapeGeometry:()=>rl,ShapePath:()=>Nu,ShapeUtils:()=>qn,ShortType:()=>Xu,Skeleton:()=>Oa,SkeletonHelper:()=>Su,SkinnedMesh:()=>Fa,Source:()=>Ih,Sphere:()=>Ye,SphereGeometry:()=>ho,Spherical:()=>xu,SphericalHarmonics3:()=>_o,SplineCurve:()=>ao,SpotLight:()=>bl,SpotLightHelper:()=>Mu,Sprite:()=>Na,SpriteMaterial:()=>Kr,SrcAlphaFactor:()=>Vu,SrcAlphaSaturateFactor:()=>Bf,SrcColorFactor:()=>Lf,StaticCopyUsage:()=>sg,StaticDrawUsage:()=>bc,StaticReadUsage:()=>eg,StereoCamera:()=>su,StreamCopyUsage:()=>og,StreamDrawUsage:()=>tg,StreamReadUsage:()=>ig,StringKeyframeTrack:()=>gi,SubtractEquation:()=>Af,SubtractiveBlending:()=>zu,TOUCH:()=>M0,TangentSpaceNormalMap:()=>_i,TetrahedronGeometry:()=>ol,Texture:()=>ke,TextureLoader:()=>tu,TextureSource:()=>Xn,TextureUtils:()=>Fu,Timer:()=>tr,TimestampQuery:()=>lg,TorusGeometry:()=>al,TorusKnotGeometry:()=>ll,Triangle:()=>ti,TriangleFanDrawMode:()=>L0,TriangleStripDrawMode:()=>I0,TrianglesDrawMode:()=>P0,TubeGeometry:()=>cl,UVMapping:()=>Ol,Uint16BufferAttribute:()=>Zr,Uint32BufferAttribute:()=>Jr,Uint8BufferAttribute:()=>Fh,Uint8ClampedBufferAttribute:()=>Oh,Uniform:()=>uu,UniformsGroup:()=>du,UniformsLib:()=>Vt,UniformsUtils:()=>yi,UnsignedByteType:()=>wn,UnsignedInt101111Type:()=>Yu,UnsignedInt248Type:()=>or,UnsignedInt5999Type:()=>qu,UnsignedIntType:()=>On,UnsignedShort4444Type:()=>zl,UnsignedShort5551Type:()=>kl,UnsignedShortType:()=>rr,VSMShadowMap:()=>er,Vector2:()=>Mt,Vector3:()=>U,Vector4:()=>be,VectorKeyframeTrack:()=>go,VideoFrameTexture:()=>Hh,VideoTexture:()=>Va,WebGL3DRenderTarget:()=>Dh,WebGLArrayRenderTarget:()=>Lh,WebGLCoordinateSystem:()=>Cn,WebGLCubeRenderTarget:()=>Ec,WebGLRenderTarget:()=>Ne,WebGLRenderer:()=>Cc,WebGLUtils:()=>ix,WebGPUCoordinateSystem:()=>ss,WebXRController:()=>zs,WireframeGeometry:()=>hl,WrapAroundEnding:()=>Hr,ZeroCurvatureEnding:()=>ns,ZeroFactor:()=>Pf,ZeroSlopeEnding:()=>is,ZeroStencilOp:()=>z0,createCanvasElement:()=>sp,error:()=>Qt,getConsoleFunction:()=>mg,log:()=>Yr,setConsoleFunction:()=>pg,warn:()=>Bt,warnOnce:()=>di});function Kg(){let s=null,t=!1,e=null,n=null;function i(r,o){n=s.requestAnimationFrame(i),e(r,o)}return{start:function(){t!==!0&&e!==null&&s!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){s=r}}}function Ov(s){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,d=c.byteLength,u=s.createBuffer();s.bindBuffer(l,u),s.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=s.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=s.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=s.SHORT;else if(c instanceof Uint32Array)f=s.UNSIGNED_INT;else if(c instanceof Int32Array)f=s.INT;else if(c instanceof Int8Array)f=s.BYTE;else if(c instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){let h=l.array,d=l.updateRanges;if(s.bindBuffer(c,a),d.length===0)s.bufferSubData(c,0,h);else{d.sort((f,p)=>f.start-p.start);let u=0;for(let f=1;f<d.length;f++){let p=d[u],x=d[f];x.start<=p.start+p.count+1?p.count=Math.max(p.count,x.start+x.count-p.start):(++u,d[u]=x)}d.length=u+1;for(let f=0,p=d.length;f<p;f++){let x=d[f];s.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(s.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:r,update:o}}function vS(s,t,e,n,i,r){let o=new zt(0),a=i===!0?0:1,l,c,h=null,d=0,u=null;function f(M){let w=M.isScene===!0?M.background:null;if(w&&w.isTexture){let y=M.backgroundBlurriness>0;w=t.get(w,y)}return w}function p(M){let w=!1,y=f(M);y===null?g(o,a):y&&y.isColor&&(g(y,1),w=!0);let S=s.xr.getEnvironmentBlendMode();S==="additive"?e.buffers.color.setClear(0,0,0,1,r):S==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(s.autoClear||w)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function x(M,w){let y=f(w);y&&(y.isCubeTexture||y.mapping===ir)?(c===void 0&&(c=new ve(new pi(1,1,1),new Pe({name:"BackgroundCubeMaterial",uniforms:ar(li.backgroundCube.uniforms),vertexShader:li.backgroundCube.vertexShader,fragmentShader:li.backgroundCube.fragmentShader,side:nn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(S,b,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=y,c.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(_S.makeRotationFromEuler(w.backgroundRotation)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Qg),c.material.toneMapped=he.getTransfer(y.colorSpace)!==_e,(h!==y||d!==y.version||u!==s.toneMapping)&&(c.material.needsUpdate=!0,h=y,d=y.version,u=s.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new ve(new Ys(2,2),new Pe({name:"BackgroundMaterial",uniforms:ar(li.background.uniforms),vertexShader:li.background.vertexShader,fragmentShader:li.background.fragmentShader,side:ki,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,l.material.toneMapped=he.getTransfer(y.colorSpace)!==_e,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||d!==y.version||u!==s.toneMapping)&&(l.material.needsUpdate=!0,h=y,d=y.version,u=s.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function g(M,w){M.getRGB(ju,ap(s)),e.buffers.color.setClear(ju.r,ju.g,ju.b,w,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(M,w=1){o.set(M),a=w,g(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(M){a=M,g(o,a)},render:p,addToRenderList:x,dispose:m}}function yS(s,t){let e=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null),r=i,o=!1;function a(z,N,O,G,Y){let J=!1,rt=d(z,G,O,N);r!==rt&&(r=rt,c(r.object)),J=f(z,G,O,Y),J&&p(z,G,O,Y),Y!==null&&t.update(Y,s.ELEMENT_ARRAY_BUFFER),(J||o)&&(o=!1,y(z,N,O,G),Y!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(Y).buffer))}function l(){return s.createVertexArray()}function c(z){return s.bindVertexArray(z)}function h(z){return s.deleteVertexArray(z)}function d(z,N,O,G){let Y=G.wireframe===!0,J=n[N.id];J===void 0&&(J={},n[N.id]=J);let rt=z.isInstancedMesh===!0?z.id:0,K=J[rt];K===void 0&&(K={},J[rt]=K);let Q=K[O.id];Q===void 0&&(Q={},K[O.id]=Q);let et=Q[Y];return et===void 0&&(et=u(l()),Q[Y]=et),et}function u(z){let N=[],O=[],G=[];for(let Y=0;Y<e;Y++)N[Y]=0,O[Y]=0,G[Y]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:N,enabledAttributes:O,attributeDivisors:G,object:z,attributes:{},index:null}}function f(z,N,O,G){let Y=r.attributes,J=N.attributes,rt=0,K=O.getAttributes();for(let Q in K)if(K[Q].location>=0){let ot=Y[Q],Lt=J[Q];if(Lt===void 0&&(Q==="instanceMatrix"&&z.instanceMatrix&&(Lt=z.instanceMatrix),Q==="instanceColor"&&z.instanceColor&&(Lt=z.instanceColor)),ot===void 0||ot.attribute!==Lt||Lt&&ot.data!==Lt.data)return!0;rt++}return r.attributesNum!==rt||r.index!==G}function p(z,N,O,G){let Y={},J=N.attributes,rt=0,K=O.getAttributes();for(let Q in K)if(K[Q].location>=0){let ot=J[Q];ot===void 0&&(Q==="instanceMatrix"&&z.instanceMatrix&&(ot=z.instanceMatrix),Q==="instanceColor"&&z.instanceColor&&(ot=z.instanceColor));let Lt={};Lt.attribute=ot,ot&&ot.data&&(Lt.data=ot.data),Y[Q]=Lt,rt++}r.attributes=Y,r.attributesNum=rt,r.index=G}function x(){let z=r.newAttributes;for(let N=0,O=z.length;N<O;N++)z[N]=0}function g(z){m(z,0)}function m(z,N){let O=r.newAttributes,G=r.enabledAttributes,Y=r.attributeDivisors;O[z]=1,G[z]===0&&(s.enableVertexAttribArray(z),G[z]=1),Y[z]!==N&&(s.vertexAttribDivisor(z,N),Y[z]=N)}function M(){let z=r.newAttributes,N=r.enabledAttributes;for(let O=0,G=N.length;O<G;O++)N[O]!==z[O]&&(s.disableVertexAttribArray(O),N[O]=0)}function w(z,N,O,G,Y,J,rt){rt===!0?s.vertexAttribIPointer(z,N,O,Y,J):s.vertexAttribPointer(z,N,O,G,Y,J)}function y(z,N,O,G){x();let Y=G.attributes,J=O.getAttributes(),rt=N.defaultAttributeValues;for(let K in J){let Q=J[K];if(Q.location>=0){let et=Y[K];if(et===void 0&&(K==="instanceMatrix"&&z.instanceMatrix&&(et=z.instanceMatrix),K==="instanceColor"&&z.instanceColor&&(et=z.instanceColor)),et!==void 0){let ot=et.normalized,Lt=et.itemSize,It=t.get(et);if(It===void 0)continue;let Wt=It.buffer,qt=It.type,Zt=It.bytesPerElement,st=qt===s.INT||qt===s.UNSIGNED_INT||et.gpuType===Bl;if(et.isInterleavedBufferAttribute){let ht=et.data,dt=ht.stride,Tt=et.offset;if(ht.isInstancedInterleavedBuffer){for(let At=0;At<Q.locationSize;At++)m(Q.location+At,ht.meshPerAttribute);z.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=ht.meshPerAttribute*ht.count)}else for(let At=0;At<Q.locationSize;At++)g(Q.location+At);s.bindBuffer(s.ARRAY_BUFFER,Wt);for(let At=0;At<Q.locationSize;At++)w(Q.location+At,Lt/Q.locationSize,qt,ot,dt*Zt,(Tt+Lt/Q.locationSize*At)*Zt,st)}else{if(et.isInstancedBufferAttribute){for(let ht=0;ht<Q.locationSize;ht++)m(Q.location+ht,et.meshPerAttribute);z.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=et.meshPerAttribute*et.count)}else for(let ht=0;ht<Q.locationSize;ht++)g(Q.location+ht);s.bindBuffer(s.ARRAY_BUFFER,Wt);for(let ht=0;ht<Q.locationSize;ht++)w(Q.location+ht,Lt/Q.locationSize,qt,ot,Lt*Zt,Lt/Q.locationSize*ht*Zt,st)}}else if(rt!==void 0){let ot=rt[K];if(ot!==void 0)switch(ot.length){case 2:s.vertexAttrib2fv(Q.location,ot);break;case 3:s.vertexAttrib3fv(Q.location,ot);break;case 4:s.vertexAttrib4fv(Q.location,ot);break;default:s.vertexAttrib1fv(Q.location,ot)}}}}M()}function S(){C();for(let z in n){let N=n[z];for(let O in N){let G=N[O];for(let Y in G){let J=G[Y];for(let rt in J)h(J[rt].object),delete J[rt];delete G[Y]}}delete n[z]}}function b(z){if(n[z.id]===void 0)return;let N=n[z.id];for(let O in N){let G=N[O];for(let Y in G){let J=G[Y];for(let rt in J)h(J[rt].object),delete J[rt];delete G[Y]}}delete n[z.id]}function R(z){for(let N in n){let O=n[N];for(let G in O){let Y=O[G];if(Y[z.id]===void 0)continue;let J=Y[z.id];for(let rt in J)h(J[rt].object),delete J[rt];delete Y[z.id]}}}function v(z){for(let N in n){let O=n[N],G=z.isInstancedMesh===!0?z.id:0,Y=O[G];if(Y!==void 0){for(let J in Y){let rt=Y[J];for(let K in rt)h(rt[K].object),delete rt[K];delete Y[J]}delete O[G],Object.keys(O).length===0&&delete n[N]}}}function C(){I(),o=!0,r!==i&&(r=i,c(r.object))}function I(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:C,resetDefaultState:I,dispose:S,releaseStatesOfGeometry:b,releaseStatesOfObject:v,releaseStatesOfProgram:R,initAttributes:x,enableAttribute:g,disableUnusedAttributes:M}}function MS(s,t,e){let n;function i(l){n=l}function r(l,c){s.drawArrays(n,l,c),e.update(c,n,1)}function o(l,c,h){h!==0&&(s.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];e.update(u,n,1)}this.setMode=i,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function SS(s,t,e,n){let i;function r(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){let R=t.get("EXT_texture_filter_anisotropic");i=s.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(R){return!(R!==mn&&n.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(R){let v=R===sn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(R!==wn&&R!==pn&&!v&&n.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE))}function l(R){if(R==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Bt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let d=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&Bt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),p=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),M=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),w=s.getParameter(s.MAX_VARYING_VECTORS),y=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),S=s.getParameter(s.MAX_SAMPLES),b=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:p,maxTextureSize:x,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:M,maxVaryings:w,maxFragmentUniforms:y,maxSamples:S,samples:b}}function bS(s){let t=this,e=null,n=0,i=!1,r=!1,o=new Wn,a=new oe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||n!==0||i;return i=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){let p=d.clippingPlanes,x=d.clipIntersection,g=d.clipShadows,m=s.get(d);if(!i||p===null||p.length===0||r&&!g)r?h(null):c();else{let M=r?0:n,w=M*4,y=m.clippingState||null;l.value=y,y=h(p,u,w,f);for(let S=0;S!==w;++S)y[S]=e[S];m.clippingState=y,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,p){let x=d!==null?d.length:0,g=null;if(x!==0){if(g=l.value,p!==!0||g===null){let m=f+x*4,M=u.matrixWorldInverse;a.getNormalMatrix(M),(g===null||g.length<m)&&(g=new Float32Array(m));for(let w=0,y=f;w!==x;++w,y+=4)o.copy(d[w]).applyMatrix4(M,a),o.normal.toArray(g,y),g[y+3]=o.constant}l.value=g,l.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,g}}function CS(s){let t=[],e=[],n=s,i=s-ko+1+wS;for(let r=0;r<i;r++){let o=Math.pow(2,n);t.push(o);let a=1/(o-2),l=-a,c=1+a,h=[l,l,c,l,c,c,l,l,c,c,l,c],d=6,u=6,f=3,p=new Float32Array(f*u*d),x=new Float32Array(f*u*d);for(let m=0;m<d;m++){let M=m%3*2/3-1,w=m>2?0:-1,y=[M,w,0,M+2/3,w,0,M+2/3,w+1,0,M,w,0,M+2/3,w+1,0,M,w+1,0];p.set(y,f*u*m);for(let S=0;S<u;S++){let b=h[S*2]*2-1,R=h[S*2+1]*2-1;m===0?lr.set(1,R,b):m===1?lr.set(-b,1,-R):m===2?lr.set(-b,R,1):m===3?lr.set(-1,R,-b):m===4?lr.set(-b,-1,R):lr.set(b,R,-1),lr.toArray(x,(m*u+S)*f)}}let g=new se;g.setAttribute("position",new pe(p,f)),g.setAttribute("outputDirection",new pe(x,f)),e.push(new ve(g,null)),n>ko&&n--}return{lodMeshes:e,sizeLods:t}}function Ig(s,t,e){let n=new Ne(s,t,e);return n.texture.mapping=ir,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function zo(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function RS(s,t,e){return new Pe({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:AS,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:ed(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function PS(s,t,e){return new Pe({name:"SphericalGaussianBlur",defines:{SAMPLES:TS,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:ed(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function Lg(){return new Pe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ed(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function Dg(){return new Pe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ed(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function ed(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}function IS(s){let t=new WeakMap,e=new WeakMap,n=null;function i(u,f=!1){return u==null?null:f?o(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===Ro||f===Po)if(t.has(u)){let p=t.get(u).texture;return a(p,u.mapping)}else{let p=u.image;if(p&&p.height>0){let x=new Ec(p.height);return x.fromEquirectangularTexture(s,u),t.set(u,x),u.addEventListener("dispose",c),a(x.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){let f=u.mapping,p=f===Ro||f===Po,x=f===oi||f===Vi;if(p||x){let g=e.get(u),m=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==m)return n===null&&(n=new cr(s)),g=p?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),g.texture;if(g!==void 0)return g.texture;{let M=u.image;return p&&M&&M.height>0||x&&M&&l(M)?(n===null&&(n=new cr(s)),g=p?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function a(u,f){return f===Ro?u.mapping=oi:f===Po&&(u.mapping=Vi),u}function l(u){let f=0,p=6;for(let x=0;x<p;x++)u[x]!==void 0&&f++;return f===p}function c(u){let f=u.target;f.removeEventListener("dispose",c);let p=t.get(f);p!==void 0&&(t.delete(f),p.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let p=e.get(f);p!==void 0&&(e.delete(f),p.dispose())}function d(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:d}}function LS(s){let t={};function e(n){if(t[n]!==void 0)return t[n];let i=s.getExtension(n);return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let i=e(n);return i===null&&di("WebGLRenderer: "+n+" extension not supported."),i}}}function DS(s,t,e,n){let i={},r=new WeakMap;function o(d){let u=d.target;u.index!==null&&t.remove(u.index);for(let p in u.attributes)t.remove(u.attributes[p]);u.removeEventListener("dispose",o),delete i[u.id];let f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return i[u.id]===!0||(u.addEventListener("dispose",o),i[u.id]=!0,e.memory.geometries++),u}function l(d){let u=d.attributes;for(let f in u)t.update(u[f],s.ARRAY_BUFFER)}function c(d){let u=[],f=d.index,p=d.attributes.position,x=0;if(p===void 0)return;if(f!==null){let M=f.array;x=f.version;for(let w=0,y=M.length;w<y;w+=3){let S=M[w+0],b=M[w+1],R=M[w+2];u.push(S,b,b,R,R,S)}}else{let M=p.array;x=p.version;for(let w=0,y=M.length/3-1;w<y;w+=3){let S=w+0,b=w+1,R=w+2;u.push(S,b,b,R,R,S)}}let g=new(p.count>=65535?Jr:Zr)(u,1);g.version=x;let m=r.get(d);m&&t.remove(m),r.set(d,g)}function h(d){let u=r.get(d);if(u){let f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function NS(s,t,e){let n;function i(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){s.drawElements(n,u,r,d*o),e.update(u,n,1)}function c(d,u,f){f!==0&&(s.drawElementsInstanced(n,u,r,d*o,f),e.update(u,n,f))}function h(d,u,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,f);let x=0;for(let g=0;g<f;g++)x+=u[g];e.update(x,n,1)}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function US(s){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case s.TRIANGLES:e.triangles+=a*(r/3);break;case s.LINES:e.lines+=a*(r/2);break;case s.LINE_STRIP:e.lines+=a*(r-1);break;case s.LINE_LOOP:e.lines+=a*r;break;case s.POINTS:e.points+=a*r;break;default:Qt("WebGLInfo: Unknown draw mode:",o);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function FS(s,t,e){let n=new WeakMap,i=new be;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==d){let C=function(){R.dispose(),n.delete(a),a.removeEventListener("dispose",C)};u!==void 0&&u.texture.dispose();let f=a.morphAttributes.position!==void 0,p=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],M=a.morphAttributes.color||[],w=0;f===!0&&(w=1),p===!0&&(w=2),x===!0&&(w=3);let y=a.attributes.position.count*w,S=1;y>t.maxTextureSize&&(S=Math.ceil(y/t.maxTextureSize),y=t.maxTextureSize);let b=new Float32Array(y*S*4*d),R=new Fs(b,y,S,d);R.type=pn,R.needsUpdate=!0;let v=w*4;for(let I=0;I<d;I++){let z=g[I],N=m[I],O=M[I],G=y*S*4*I;for(let Y=0;Y<z.count;Y++){let J=Y*v;f===!0&&(i.fromBufferAttribute(z,Y),b[G+J+0]=i.x,b[G+J+1]=i.y,b[G+J+2]=i.z,b[G+J+3]=0),p===!0&&(i.fromBufferAttribute(N,Y),b[G+J+4]=i.x,b[G+J+5]=i.y,b[G+J+6]=i.z,b[G+J+7]=0),x===!0&&(i.fromBufferAttribute(O,Y),b[G+J+8]=i.x,b[G+J+9]=i.y,b[G+J+10]=i.z,b[G+J+11]=O.itemSize===4?i.w:1)}}u={count:d,texture:R,size:new Mt(y,S)},n.set(a,u),a.addEventListener("dispose",C)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",o.morphTexture,e);else{let f=0;for(let x=0;x<c.length;x++)f+=c[x];let p=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(s,"morphTargetBaseInfluence",p),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:r}}function OS(s,t,e,n,i){let r=new WeakMap;function o(c){let h=i.render.frame,d=c.geometry,u=t.get(c,d);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,s.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}function zS(s,t,e,n,i,r){let o=new Ne(t,e,{type:s,depthBuffer:i,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,l=null,c=new se;c.setAttribute("position",new Xt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Xt([0,2,0,0,2,0],2));let h=new hs({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new ve(c,h),u=new xi(-1,1,1,-1,0,1),f=null,p=null,x=!1,g,m=null,M=[],w=!1;this.setSize=function(y,S){o.setSize(y,S),a!==null&&a.setSize(y,S),l!==null&&l.setSize(y,S);for(let b=0;b<M.length;b++){let R=M[b];R.setSize&&R.setSize(y,S)}},this.setEffects=function(y){M=y,w=M.length>0&&M[0].isRenderPass===!0;let S=o.width,b=o.height;M.length>0&&a===null&&(a=new Ne(S,b,{type:sn,depthBuffer:!1,stencilBuffer:!1}),l=new Ne(S,b,{type:sn,depthBuffer:!1,stencilBuffer:!1}));for(let R=0;R<M.length;R++){let v=M[R];v.setSize&&v.setSize(S,b)}},this.begin=function(y,S){if(x||y.toneMapping===Zn&&M.length===0)return!1;if(m=S,S!==null){let b=S.width,R=S.height;(o.width!==b||o.height!==R)&&this.setSize(b,R)}return w===!1&&y.setRenderTarget(o),g=y.toneMapping,y.toneMapping=Zn,!0},this.hasRenderPass=function(){return w},this.end=function(y,S){y.toneMapping=g,x=!0;let b=o,R=a;for(let v=0;v<M.length;v++){let C=M[v];C.enabled!==!1&&(C.render(y,R,b,S),C.needsSwap!==!1&&(b=R,R=R===a?l:a))}if(f!==y.outputColorSpace||p!==y.toneMapping){f=y.outputColorSpace,p=y.toneMapping,h.defines={},he.getTransfer(f)===_e&&(h.defines.SRGB_TRANSFER="");let v=BS[p];v&&(h.defines[v]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=b.texture,y.setRenderTarget(m),y.render(d,u),m=null,x=!1},this.isCompositing=function(){return x},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}function Go(s,t,e){let n=s[0];if(n<=0||n>0)return s;let i=t*e,r=Ng[i];if(r===void 0&&(r=new Float32Array(i),Ng[i]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,s[o].toArray(r,a)}return r}function Ke(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function Qe(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function nd(s,t){let e=Ug[t];e===void 0&&(e=new Int32Array(t),Ug[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function kS(s,t){let e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function VS(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ke(e,t))return;s.uniform2fv(this.addr,t),Qe(e,t)}}function GS(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ke(e,t))return;s.uniform3fv(this.addr,t),Qe(e,t)}}function HS(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ke(e,t))return;s.uniform4fv(this.addr,t),Qe(e,t)}}function WS(s,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ke(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),Qe(e,t)}else{if(Ke(e,n))return;Bg.set(n),s.uniformMatrix2fv(this.addr,!1,Bg),Qe(e,n)}}function XS(s,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ke(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),Qe(e,t)}else{if(Ke(e,n))return;Og.set(n),s.uniformMatrix3fv(this.addr,!1,Og),Qe(e,n)}}function qS(s,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ke(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),Qe(e,t)}else{if(Ke(e,n))return;Fg.set(n),s.uniformMatrix4fv(this.addr,!1,Fg),Qe(e,n)}}function YS(s,t){let e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function $S(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ke(e,t))return;s.uniform2iv(this.addr,t),Qe(e,t)}}function ZS(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ke(e,t))return;s.uniform3iv(this.addr,t),Qe(e,t)}}function JS(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ke(e,t))return;s.uniform4iv(this.addr,t),Qe(e,t)}}function KS(s,t){let e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function QS(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ke(e,t))return;s.uniform2uiv(this.addr,t),Qe(e,t)}}function jS(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ke(e,t))return;s.uniform3uiv(this.addr,t),Qe(e,t)}}function tb(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ke(e,t))return;s.uniform4uiv(this.addr,t),Qe(e,t)}}function eb(s,t,e){let n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(bp.compareFunction=e.isReversedDepthBuffer()?Sc:Mc,r=bp):r=jg,e.setTexture2D(t||r,i)}function nb(s,t,e){let n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||ex,i)}function ib(s,t,e){let n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||nx,i)}function sb(s,t,e){let n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||tx,i)}function rb(s){switch(s){case 5126:return kS;case 35664:return VS;case 35665:return GS;case 35666:return HS;case 35674:return WS;case 35675:return XS;case 35676:return qS;case 5124:case 35670:return YS;case 35667:case 35671:return $S;case 35668:case 35672:return ZS;case 35669:case 35673:return JS;case 5125:return KS;case 36294:return QS;case 36295:return jS;case 36296:return tb;case 35678:case 36198:case 36298:case 36306:case 35682:return eb;case 35679:case 36299:case 36307:return nb;case 35680:case 36300:case 36308:case 36293:return ib;case 36289:case 36303:case 36311:case 36292:return sb}}function ob(s,t){s.uniform1fv(this.addr,t)}function ab(s,t){let e=Go(t,this.size,2);s.uniform2fv(this.addr,e)}function lb(s,t){let e=Go(t,this.size,3);s.uniform3fv(this.addr,e)}function cb(s,t){let e=Go(t,this.size,4);s.uniform4fv(this.addr,e)}function hb(s,t){let e=Go(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function ub(s,t){let e=Go(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function db(s,t){let e=Go(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function fb(s,t){s.uniform1iv(this.addr,t)}function pb(s,t){s.uniform2iv(this.addr,t)}function mb(s,t){s.uniform3iv(this.addr,t)}function gb(s,t){s.uniform4iv(this.addr,t)}function xb(s,t){s.uniform1uiv(this.addr,t)}function _b(s,t){s.uniform2uiv(this.addr,t)}function vb(s,t){s.uniform3uiv(this.addr,t)}function yb(s,t){s.uniform4uiv(this.addr,t)}function Mb(s,t,e){let n=this.cache,i=t.length,r=nd(e,i);Ke(n,r)||(s.uniform1iv(this.addr,r),Qe(n,r));let o;this.type===s.SAMPLER_2D_SHADOW?o=bp:o=jg;for(let a=0;a!==i;++a)e.setTexture2D(t[a]||o,r[a])}function Sb(s,t,e){let n=this.cache,i=t.length,r=nd(e,i);Ke(n,r)||(s.uniform1iv(this.addr,r),Qe(n,r));for(let o=0;o!==i;++o)e.setTexture3D(t[o]||ex,r[o])}function bb(s,t,e){let n=this.cache,i=t.length,r=nd(e,i);Ke(n,r)||(s.uniform1iv(this.addr,r),Qe(n,r));for(let o=0;o!==i;++o)e.setTextureCube(t[o]||nx,r[o])}function wb(s,t,e){let n=this.cache,i=t.length,r=nd(e,i);Ke(n,r)||(s.uniform1iv(this.addr,r),Qe(n,r));for(let o=0;o!==i;++o)e.setTexture2DArray(t[o]||tx,r[o])}function Tb(s){switch(s){case 5126:return ob;case 35664:return ab;case 35665:return lb;case 35666:return cb;case 35674:return hb;case 35675:return ub;case 35676:return db;case 5124:case 35670:return fb;case 35667:case 35671:return pb;case 35668:case 35672:return mb;case 35669:case 35673:return gb;case 5125:return xb;case 36294:return _b;case 36295:return vb;case 36296:return yb;case 35678:case 36198:case 36298:case 36306:case 35682:return Mb;case 35679:case 36299:case 36307:return Sb;case 35680:case 36300:case 36308:case 36293:return bb;case 36289:case 36303:case 36311:case 36292:return wb}}function zg(s,t){s.seq.push(t),s.map[t.id]=t}function Ab(s,t,e){let n=s.name,i=n.length;for(Mp.lastIndex=0;;){let r=Mp.exec(n),o=Mp.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===i){zg(e,c===void 0?new wp(a,s,t):new Tp(a,s,t));break}else{let d=e.map[a];d===void 0&&(d=new Ap(a),zg(e,d)),e=d}}}function kg(s,t,e){let n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}function Rb(s,t){let e=s.split(`
`),n=[],i=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=i;o<r;o++){let a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}function Pb(s){he._getMatrix(Vg,he.workingColorSpace,s);let t=`mat3( ${Vg.elements.map(e=>e.toFixed(4))} )`;switch(he.getTransfer(s)){case Xr:return[t,"LinearTransferOETF"];case _e:return[t,"sRGBTransferOETF"];default:return Bt("WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function Gg(s,t,e){let n=s.getShaderParameter(t,s.COMPILE_STATUS),r=(s.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+Rb(s.getShaderSource(t),a)}else return r}function Ib(s,t){let e=Pb(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Db(s,t){let e=Lb[t];return e===void 0?(Bt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}function Nb(){he.getLuminanceCoefficients(td);let s=td.x.toFixed(4),t=td.y.toFixed(4),e=td.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ub(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ac).join(`
`)}function Fb(s){let t=[];for(let e in s){let n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Ob(s,t){let e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){let r=s.getActiveAttrib(t,i),o=r.name,a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:s.getAttribLocation(t,o),locationSize:a}}return e}function Ac(s){return s!==""}function Hg(s,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Wg(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}function Ep(s){return s.replace(Bb,kb)}function kb(s,t){let e=le[t];if(e===void 0){let n=zb.get(t);if(n!==void 0)e=le[n],Bt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Ep(e)}function Xg(s){return s.replace(Vb,Gb)}function Gb(s,t,e,n){let i="";for(let r=parseInt(t);r<parseInt(e);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function qg(s){let t=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?t+=`
#define HIGH_PRECISION`:s.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Wb(s){return Hb[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}function qb(s){return s.envMap===!1?"ENVMAP_TYPE_CUBE":Xb[s.envMapMode]||"ENVMAP_TYPE_CUBE"}function $b(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":Yb[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}function Jb(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":Zb[s.combine]||"ENVMAP_BLENDING_NONE"}function Kb(s){let t=s.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Qb(s,t,e,n){let i=s.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=Wb(e),c=qb(e),h=$b(e),d=Jb(e),u=Kb(e),f=Ub(e),p=Fb(r),x=i.createProgram(),g,m,M=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(Ac).join(`
`),g.length>0&&(g+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(Ac).join(`
`),m.length>0&&(m+=`
`)):(g=[qg(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ac).join(`
`),m=[qg(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Zn?"#define TONE_MAPPING":"",e.toneMapping!==Zn?le.tonemapping_pars_fragment:"",e.toneMapping!==Zn?Db("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",le.colorspace_pars_fragment,Ib("linearToOutputTexel",e.outputColorSpace),Nb(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ac).join(`
`)),o=Ep(o),o=Hg(o,e),o=Wg(o,e),a=Ep(a),a=Hg(a,e),a=Wg(a,e),o=Xg(o),a=Xg(a),e.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,m=["#define varying in",e.glslVersion===Ku?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Ku?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let w=M+g+o,y=M+m+a,S=kg(i,i.VERTEX_SHADER,w),b=kg(i,i.FRAGMENT_SHADER,y);i.attachShader(x,S),i.attachShader(x,b),e.index0AttributeName!==void 0?i.bindAttribLocation(x,0,e.index0AttributeName):e.hasPositionAttribute===!0&&i.bindAttribLocation(x,0,"position"),i.linkProgram(x);function R(z){if(s.debug.checkShaderErrors){let N=i.getProgramInfoLog(x)||"",O=i.getShaderInfoLog(S)||"",G=i.getShaderInfoLog(b)||"",Y=N.trim(),J=O.trim(),rt=G.trim(),K=!0,Q=!0;if(i.getProgramParameter(x,i.LINK_STATUS)===!1)if(K=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,x,S,b);else{let et=Gg(i,S,"vertex"),ot=Gg(i,b,"fragment");Qt("WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(x,i.VALIDATE_STATUS)+`

Material Name: `+z.name+`
Material Type: `+z.type+`

Program Info Log: `+Y+`
`+et+`
`+ot)}else Y!==""?Bt("WebGLProgram: Program Info Log:",Y):(J===""||rt==="")&&(Q=!1);Q&&(z.diagnostics={runnable:K,programLog:Y,vertexShader:{log:J,prefix:g},fragmentShader:{log:rt,prefix:m}})}i.deleteShader(S),i.deleteShader(b),v=new Vo(i,x),C=Ob(i,x)}let v;this.getUniforms=function(){return v===void 0&&R(this),v};let C;this.getAttributes=function(){return C===void 0&&R(this),C};let I=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return I===!1&&(I=i.getProgramParameter(x,Eb)),I},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Cb++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=S,this.fragmentShader=b,this}function t1(s){return s===Hi||s===Oo||s===Bo}function e1(s,t,e,n,i,r){let o=new Bs,a=new Cp,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function p(v){return l.add(v),v===0?"uv":`uv${v}`}function x(v,C,I,z,N,O){let G=z.fog,Y=N.geometry,J=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?z.environment:null,rt=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,K=t.get(v.envMap||J,rt),Q=K&&K.mapping===ir?K.image.height:null,et=f[v.type];v.precision!==null&&(u=n.getMaxPrecision(v.precision),u!==v.precision&&Bt("WebGLProgram.getParameters:",v.precision,"not supported, using",u,"instead."));let ot=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,Lt=ot!==void 0?ot.length:0,It=0;Y.morphAttributes.position!==void 0&&(It=1),Y.morphAttributes.normal!==void 0&&(It=2),Y.morphAttributes.color!==void 0&&(It=3);let Wt,qt,Zt,st;if(et){let St=li[et];Wt=St.vertexShader,qt=St.fragmentShader}else{Wt=v.vertexShader,qt=v.fragmentShader;let St=a.getVertexShaderStage(v),Ft=a.getFragmentShaderStage(v);a.update(v,St,Ft),Zt=St.id,st=Ft.id}let ht=s.getRenderTarget(),dt=s.state.buffers.depth.getReversed(),Tt=N.isInstancedMesh===!0,At=N.isBatchedMesh===!0,Dt=!!v.map,ne=!!v.matcap,xt=!!K,wt=!!v.aoMap,Ct=!!v.lightMap,Pt=!!v.bumpMap&&v.wireframe===!1,at=!!v.normalMap,Ut=!!v.displacementMap,pt=!!v.emissiveMap,Et=!!v.metalnessMap,Ot=!!v.roughnessMap,k=v.anisotropy>0,jt=v.clearcoat>0,$=v.dispersion>0,T=v.retroreflectivity>0,_=v.iridescence>0,A=v.sheen>0,L=v.transmission>0,D=k&&!!v.anisotropyMap,F=jt&&!!v.clearcoatMap,V=jt&&!!v.clearcoatNormalMap,B=jt&&!!v.clearcoatRoughnessMap,X=_&&!!v.iridescenceMap,tt=_&&!!v.iridescenceThicknessMap,vt=A&&!!v.sheenColorMap,_t=A&&!!v.sheenRoughnessMap,bt=!!v.specularMap,j=!!v.specularColorMap,mt=!!v.specularIntensityMap,Rt=L&&!!v.transmissionMap,P=L&&!!v.thicknessMap,ct=!!v.gradientMap,Z=!!v.alphaMap,gt=v.alphaTest>0,yt=!!v.alphaHash,lt=!!v.extensions,Nt=Zn;v.toneMapped&&(ht===null||ht.isXRRenderTarget===!0)&&(Nt=s.toneMapping);let W={shaderID:et,shaderType:v.type,shaderName:v.name,vertexShader:Wt,fragmentShader:qt,defines:v.defines,customVertexShaderID:Zt,customFragmentShaderID:st,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:u,batching:At,batchingColor:At&&N._colorsTexture!==null,instancing:Tt,instancingColor:Tt&&N.instanceColor!==null,instancingMorph:Tt&&N.morphTexture!==null,outputColorSpace:ht===null?s.outputColorSpace:ht.isXRRenderTarget===!0?ht.texture.colorSpace:he.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Dt,matcap:ne,envMap:xt,envMapMode:xt&&K.mapping,envMapCubeUVHeight:Q,aoMap:wt,lightMap:Ct,bumpMap:Pt,normalMap:at,displacementMap:Ut,emissiveMap:pt,normalMapObjectSpace:at&&v.normalMapType===Jf,normalMapTangentSpace:at&&v.normalMapType===_i,packedNormalMap:at&&v.normalMapType===_i&&t1(v.normalMap.format),metalnessMap:Et,roughnessMap:Ot,anisotropy:k,anisotropyMap:D,clearcoat:jt,clearcoatMap:F,clearcoatNormalMap:V,clearcoatRoughnessMap:B,dispersion:$,retroreflection:T,iridescence:_,iridescenceMap:X,iridescenceThicknessMap:tt,sheen:A,sheenColorMap:vt,sheenRoughnessMap:_t,specularMap:bt,specularColorMap:j,specularIntensityMap:mt,transmission:L,transmissionMap:Rt,thicknessMap:P,gradientMap:ct,opaque:v.transparent===!1&&v.blending===nr&&v.alphaToCoverage===!1,alphaMap:Z,alphaTest:gt,alphaHash:yt,combine:v.combine,mapUv:Dt&&p(v.map.channel),aoMapUv:wt&&p(v.aoMap.channel),lightMapUv:Ct&&p(v.lightMap.channel),bumpMapUv:Pt&&p(v.bumpMap.channel),normalMapUv:at&&p(v.normalMap.channel),displacementMapUv:Ut&&p(v.displacementMap.channel),emissiveMapUv:pt&&p(v.emissiveMap.channel),metalnessMapUv:Et&&p(v.metalnessMap.channel),roughnessMapUv:Ot&&p(v.roughnessMap.channel),anisotropyMapUv:D&&p(v.anisotropyMap.channel),clearcoatMapUv:F&&p(v.clearcoatMap.channel),clearcoatNormalMapUv:V&&p(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:B&&p(v.clearcoatRoughnessMap.channel),iridescenceMapUv:X&&p(v.iridescenceMap.channel),iridescenceThicknessMapUv:tt&&p(v.iridescenceThicknessMap.channel),sheenColorMapUv:vt&&p(v.sheenColorMap.channel),sheenRoughnessMapUv:_t&&p(v.sheenRoughnessMap.channel),specularMapUv:bt&&p(v.specularMap.channel),specularColorMapUv:j&&p(v.specularColorMap.channel),specularIntensityMapUv:mt&&p(v.specularIntensityMap.channel),transmissionMapUv:Rt&&p(v.transmissionMap.channel),thicknessMapUv:P&&p(v.thicknessMap.channel),alphaMapUv:Z&&p(v.alphaMap.channel),vertexTangents:!!Y.attributes.tangent&&(at||k),vertexNormals:!!Y.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!Y.attributes.uv&&(Dt||Z),fog:!!G,useFog:v.fog===!0,fogExp2:!!G&&G.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||Y.attributes.normal===void 0&&at===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:dt,skinning:N.isSkinnedMesh===!0,hasPositionAttribute:Y.attributes.position!==void 0,morphTargets:Y.morphAttributes.position!==void 0,morphNormals:Y.morphAttributes.normal!==void 0,morphColors:Y.morphAttributes.color!==void 0,morphTargetsCount:Lt,morphTextureStride:It,numSunLights:C.sun.length,numDirLights:C.directional.length,numPointLights:C.point.length,numSpotLights:C.spot.length,numSpotLightMaps:C.spotLightMap.length,numRectAreaLights:C.rectArea.length,numHemiLights:C.hemi.length,numSunLightShadows:C.sunShadowMap.length,numDirLightShadows:C.directionalShadowMap.length,numPointLightShadows:C.pointShadowMap.length,numSpotLightShadows:C.spotShadowMap.length,numSpotLightShadowsWithMaps:C.numSpotLightShadowsWithMaps,numLightProbes:C.numLightProbes,numLightProbeGrids:O.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:s.shadowMap.enabled&&I.length>0,shadowMapType:s.shadowMap.type,toneMapping:Nt,decodeVideoTexture:Dt&&v.map.isVideoTexture===!0&&he.getTransfer(v.map.colorSpace)===_e,decodeVideoTextureEmissive:pt&&v.emissiveMap.isVideoTexture===!0&&he.getTransfer(v.emissiveMap.colorSpace)===_e,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===ri,flipSided:v.side===nn,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:lt&&v.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(lt&&v.extensions.multiDraw===!0||At)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return W.vertexUv1s=l.has(1),W.vertexUv2s=l.has(2),W.vertexUv3s=l.has(3),l.clear(),W}function g(v){let C=[];if(v.shaderID?C.push(v.shaderID):(C.push(v.customVertexShaderID),C.push(v.customFragmentShaderID)),v.defines!==void 0)for(let I in v.defines)C.push(I),C.push(v.defines[I]);return v.isRawShaderMaterial===!1&&(m(C,v),M(C,v),C.push(s.outputColorSpace)),C.push(v.customProgramCacheKey),C.join()}function m(v,C){v.push(C.precision),v.push(C.outputColorSpace),v.push(C.envMapMode),v.push(C.envMapCubeUVHeight),v.push(C.mapUv),v.push(C.alphaMapUv),v.push(C.lightMapUv),v.push(C.aoMapUv),v.push(C.bumpMapUv),v.push(C.normalMapUv),v.push(C.displacementMapUv),v.push(C.emissiveMapUv),v.push(C.metalnessMapUv),v.push(C.roughnessMapUv),v.push(C.anisotropyMapUv),v.push(C.clearcoatMapUv),v.push(C.clearcoatNormalMapUv),v.push(C.clearcoatRoughnessMapUv),v.push(C.iridescenceMapUv),v.push(C.iridescenceThicknessMapUv),v.push(C.sheenColorMapUv),v.push(C.sheenRoughnessMapUv),v.push(C.specularMapUv),v.push(C.specularColorMapUv),v.push(C.specularIntensityMapUv),v.push(C.transmissionMapUv),v.push(C.thicknessMapUv),v.push(C.combine),v.push(C.fogExp2),v.push(C.sizeAttenuation),v.push(C.morphTargetsCount),v.push(C.morphAttributeCount),v.push(C.numSunLights),v.push(C.numDirLights),v.push(C.numPointLights),v.push(C.numSpotLights),v.push(C.numSpotLightMaps),v.push(C.numHemiLights),v.push(C.numRectAreaLights),v.push(C.numSunLightShadows),v.push(C.numDirLightShadows),v.push(C.numPointLightShadows),v.push(C.numSpotLightShadows),v.push(C.numSpotLightShadowsWithMaps),v.push(C.numLightProbes),v.push(C.shadowMapType),v.push(C.toneMapping),v.push(C.numClippingPlanes),v.push(C.numClipIntersection),v.push(C.depthPacking)}function M(v,C){o.disableAll(),C.instancing&&o.enable(0),C.instancingColor&&o.enable(1),C.instancingMorph&&o.enable(2),C.matcap&&o.enable(3),C.envMap&&o.enable(4),C.normalMapObjectSpace&&o.enable(5),C.normalMapTangentSpace&&o.enable(6),C.clearcoat&&o.enable(7),C.iridescence&&o.enable(8),C.alphaTest&&o.enable(9),C.vertexColors&&o.enable(10),C.vertexAlphas&&o.enable(11),C.vertexUv1s&&o.enable(12),C.vertexUv2s&&o.enable(13),C.vertexUv3s&&o.enable(14),C.vertexTangents&&o.enable(15),C.anisotropy&&o.enable(16),C.alphaHash&&o.enable(17),C.batching&&o.enable(18),C.dispersion&&o.enable(19),C.retroreflection&&o.enable(24),C.batchingColor&&o.enable(20),C.gradientMap&&o.enable(21),C.packedNormalMap&&o.enable(22),C.vertexNormals&&o.enable(23),v.push(o.mask),o.disableAll(),C.fog&&o.enable(0),C.useFog&&o.enable(1),C.flatShading&&o.enable(2),C.logarithmicDepthBuffer&&o.enable(3),C.reversedDepthBuffer&&o.enable(4),C.skinning&&o.enable(5),C.morphTargets&&o.enable(6),C.morphNormals&&o.enable(7),C.morphColors&&o.enable(8),C.premultipliedAlpha&&o.enable(9),C.shadowMapEnabled&&o.enable(10),C.doubleSided&&o.enable(11),C.flipSided&&o.enable(12),C.useDepthPacking&&o.enable(13),C.dithering&&o.enable(14),C.transmission&&o.enable(15),C.sheen&&o.enable(16),C.opaque&&o.enable(17),C.pointsUvs&&o.enable(18),C.decodeVideoTexture&&o.enable(19),C.decodeVideoTextureEmissive&&o.enable(20),C.alphaToCoverage&&o.enable(21),C.numLightProbeGrids>0&&o.enable(22),C.hasPositionAttribute&&o.enable(23),v.push(o.mask)}function w(v){let C=f[v.type],I;if(C){let z=li[C];I=yi.clone(z.uniforms)}else I=v.uniforms;return I}function y(v,C){let I=h.get(C);return I!==void 0?++I.usedTimes:(I=new Qb(s,C,v,i),c.push(I),h.set(C,I)),I}function S(v){if(--v.usedTimes===0){let C=c.indexOf(v);c[C]=c[c.length-1],c.pop(),h.delete(v.cacheKey),v.destroy()}}function b(v){a.remove(v)}function R(){a.dispose()}return{getParameters:x,getProgramCacheKey:g,getUniforms:w,acquireProgram:y,releaseProgram:S,releaseShaderCache:b,programs:c,dispose:R}}function n1(){let s=new WeakMap;function t(o){return s.has(o)}function e(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function n(o){s.delete(o)}function i(o,a,l){s.get(o)[a]=l}function r(){s=new WeakMap}return{has:t,get:e,remove:n,update:i,dispose:r}}function i1(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.materialVariant!==t.materialVariant?s.materialVariant-t.materialVariant:s.z!==t.z?s.z-t.z:s.id-t.id}function Yg(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function $g(){let s=[],t=0,e=[],n=[],i=[];function r(){t=0,e.length=0,n.length=0,i.length=0}function o(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function a(u,f,p,x,g,m){let M=s[t];return M===void 0?(M={id:u.id,object:u,geometry:f,material:p,materialVariant:o(u),groupOrder:x,renderOrder:u.renderOrder,z:g,group:m},s[t]=M):(M.id=u.id,M.object=u,M.geometry=f,M.material=p,M.materialVariant=o(u),M.groupOrder=x,M.renderOrder=u.renderOrder,M.z=g,M.group=m),t++,M}function l(u,f,p,x,g,m,M){M.reversedDepth===!0&&(g=-g);let w=a(u,f,p,x,g,m);p.transmission>0?n.push(w):p.transparent===!0?i.push(w):e.push(w)}function c(u,f,p,x,g,m){let M=a(u,f,p,x,g,m);p.transmission>0?n.unshift(M):p.transparent===!0?i.unshift(M):e.unshift(M)}function h(u,f){e.length>1&&e.sort(u||i1),n.length>1&&n.sort(f||Yg),i.length>1&&i.sort(f||Yg)}function d(){for(let u=t,f=s.length;u<f;u++){let p=s[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:e,transmissive:n,transparent:i,init:r,push:l,unshift:c,finish:d,sort:h}}function s1(){let s=new WeakMap;function t(n,i){let r=s.get(n),o;return r===void 0?(o=new $g,s.set(n,[o])):i>=r.length?(o=new $g,r.push(o)):o=r[i],o}function e(){s=new WeakMap}return{get:t,dispose:e}}function r1(){let s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new U,color:new zt};break;case"SpotLight":e={position:new U,direction:new U,color:new zt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new U,color:new zt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new U,skyColor:new zt,groundColor:new zt};break;case"RectAreaLight":e={color:new zt,position:new U,halfWidth:new U,halfHeight:new U};break}return s[t.id]=e,e}}}function o1(){let s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}function l1(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function c1(s){let t=new r1,e=o1(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new U);let i=new U,r=new re,o=new re;function a(c){let h=0,d=0,u=0;for(let N=0;N<9;N++)n.probe[N].set(0,0,0);let f=0,p=0,x=0,g=0,m=0,M=0,w=0,y=0,S=0,b=0,R=0,v=0,C=0,I=0;c.sort(l1);for(let N=0,O=c.length;N<O;N++){let G=c[N],Y=G.color,J=G.intensity,rt=G.distance,K=null;if(G.shadow&&G.shadow.map&&(G.shadow.map.texture.format===Hi?K=G.shadow.map.texture:K=G.shadow.map.depthTexture||G.shadow.map.texture),G.isAmbientLight)h+=Y.r*J,d+=Y.g*J,u+=Y.b*J;else if(G.isLightProbe){for(let Q=0;Q<9;Q++)n.probe[Q].addScaledVector(G.sh.coefficients[Q],J);I++}else if(G.isSunLight){let Q=t.get(G);if(Q.color.copy(G.color).multiplyScalar(G.intensity),G.castShadow){let et=G.shadow,ot=e.get(G);ot.shadowIntensity=et.intensity,ot.shadowBias=et.bias,ot.shadowNormalBias=et.normalBias,ot.shadowRadius=et.radius,ot.shadowMapSize.copy(et.mapSize).multiply(et.getFrameExtents()),n.sunShadow[p]=ot,n.sunShadowMap[p]=K;let Lt=et.getViewportCount();for(let It=0;It<Lt;It++)n.sunShadowMatrix[x+It]=et.getMatrix(It),n.sunShadowCascade[x+It]=et._cascadeData[It];x+=Lt,p++}n.sun[f]=Q,f++}else if(G.isDirectionalLight){let Q=t.get(G);if(Q.color.copy(G.color).multiplyScalar(G.intensity),G.castShadow){let et=G.shadow,ot=e.get(G);ot.shadowIntensity=et.intensity,ot.shadowBias=et.bias,ot.shadowNormalBias=et.normalBias,ot.shadowRadius=et.radius,ot.shadowMapSize=et.mapSize,n.directionalShadow[g]=ot,n.directionalShadowMap[g]=K,n.directionalShadowMatrix[g]=G.shadow.matrix,S++}n.directional[g]=Q,g++}else if(G.isSpotLight){let Q=t.get(G);Q.position.setFromMatrixPosition(G.matrixWorld),Q.color.copy(Y).multiplyScalar(J),Q.distance=rt,Q.coneCos=Math.cos(G.angle),Q.penumbraCos=Math.cos(G.angle*(1-G.penumbra)),Q.decay=G.decay,n.spot[M]=Q;let et=G.shadow;if(G.map&&(n.spotLightMap[v]=G.map,v++,et.updateMatrices(G),G.castShadow&&C++),n.spotLightMatrix[M]=et.matrix,G.castShadow){let ot=e.get(G);ot.shadowIntensity=et.intensity,ot.shadowBias=et.bias,ot.shadowNormalBias=et.normalBias,ot.shadowRadius=et.radius,ot.shadowMapSize=et.mapSize,n.spotShadow[M]=ot,n.spotShadowMap[M]=K,R++}M++}else if(G.isRectAreaLight){let Q=t.get(G);Q.color.copy(Y).multiplyScalar(J),Q.halfWidth.set(G.width*.5,0,0),Q.halfHeight.set(0,G.height*.5,0),n.rectArea[w]=Q,w++}else if(G.isPointLight){let Q=t.get(G);if(Q.color.copy(G.color).multiplyScalar(G.intensity),Q.distance=G.distance,Q.decay=G.decay,G.castShadow){let et=G.shadow,ot=e.get(G);ot.shadowIntensity=et.intensity,ot.shadowBias=et.bias,ot.shadowNormalBias=et.normalBias,ot.shadowRadius=et.radius,ot.shadowMapSize=et.mapSize,ot.shadowCameraNear=et.camera.near,ot.shadowCameraFar=et.camera.far,n.pointShadow[m]=ot,n.pointShadowMap[m]=K,n.pointShadowMatrix[m]=G.shadow.matrix,b++}n.point[m]=Q,m++}else if(G.isHemisphereLight){let Q=t.get(G);Q.skyColor.copy(G.color).multiplyScalar(J),Q.groundColor.copy(G.groundColor).multiplyScalar(J),n.hemi[y]=Q,y++}}w>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Vt.LTC_FLOAT_1,n.rectAreaLTC2=Vt.LTC_FLOAT_2):(n.rectAreaLTC1=Vt.LTC_HALF_1,n.rectAreaLTC2=Vt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let z=n.hash;(z.sunLength!==f||z.directionalLength!==g||z.pointLength!==m||z.spotLength!==M||z.rectAreaLength!==w||z.hemiLength!==y||z.numSunShadows!==p||z.numDirectionalShadows!==S||z.numPointShadows!==b||z.numSpotShadows!==R||z.numSpotMaps!==v||z.numLightProbes!==I)&&(n.sun.length=f,n.directional.length=g,n.spot.length=M,n.rectArea.length=w,n.point.length=m,n.hemi.length=y,n.sunShadow.length=p,n.sunShadowMap.length=p,n.sunShadowMatrix.length=x,n.sunShadowCascade.length=x,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.directionalShadowMatrix.length=S,n.pointShadow.length=b,n.pointShadowMap.length=b,n.pointShadowMatrix.length=b,n.spotShadow.length=R,n.spotShadowMap.length=R,n.spotLightMatrix.length=R+v-C,n.spotLightMap.length=v,n.numSpotLightShadowsWithMaps=C,n.numLightProbes=I,z.sunLength=f,z.directionalLength=g,z.pointLength=m,z.spotLength=M,z.rectAreaLength=w,z.hemiLength=y,z.numSunShadows=p,z.numDirectionalShadows=S,z.numPointShadows=b,z.numSpotShadows=R,z.numSpotMaps=v,z.numLightProbes=I,n.version=a1++)}function l(c,h){let d=0,u=0,f=0,p=0,x=0,g=0,m=h.matrixWorldInverse;for(let M=0,w=c.length;M<w;M++){let y=c[M];if(y.isSunLight){let S=n.sun[d];S.direction.setFromMatrixPosition(y.matrixWorld),S.direction.transformDirection(m),d++}else if(y.isDirectionalLight){let S=n.directional[u];S.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),S.direction.sub(i),S.direction.transformDirection(m),u++}else if(y.isSpotLight){let S=n.spot[p];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),S.direction.sub(i),S.direction.transformDirection(m),p++}else if(y.isRectAreaLight){let S=n.rectArea[x];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),o.identity(),r.copy(y.matrixWorld),r.premultiply(m),o.extractRotation(r),S.halfWidth.set(y.width*.5,0,0),S.halfHeight.set(0,y.height*.5,0),S.halfWidth.applyMatrix4(o),S.halfHeight.applyMatrix4(o),x++}else if(y.isPointLight){let S=n.point[f];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),f++}else if(y.isHemisphereLight){let S=n.hemi[g];S.direction.setFromMatrixPosition(y.matrixWorld),S.direction.transformDirection(m),g++}}}return{setup:a,setupView:l,state:n}}function Zg(s){let t=new c1(s),e=[],n=[],i=[];function r(u){d.camera=u,e.length=0,n.length=0,i.length=0}function o(u){e.push(u)}function a(u){n.push(u)}function l(u){i.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let d={lightsArray:e,shadowsArray:n,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function h1(s){let t=new WeakMap;function e(i,r=0){let o=t.get(i),a;return o===void 0?(a=new Zg(s),t.set(i,[a])):r>=o.length?(a=new Zg(s),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}function m1(s,t,e){let n=new fi,i=new Mt,r=new Mt,o=new be,a=new uo,l=new fo,c={},h=e.maxTextureSize,d={[ki]:nn,[nn]:ki,[ri]:ri},u=new Pe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Mt},radius:{value:4}},vertexShader:u1,fragmentShader:d1}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let p=new se;p.setAttribute("position",new pe(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new ve(p,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Mo;let m=this.type;this.render=function(b,R,v){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||b.length===0)return;this.type===wf&&(Bt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Mo);let C=s.getRenderTarget(),I=s.getActiveCubeFace(),z=s.getActiveMipmapLevel(),N=s.state;N.setBlending(Fn),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);let O=m!==this.type;O&&R.traverse(function(G){G.material&&(Array.isArray(G.material)?G.material.forEach(Y=>Y.needsUpdate=!0):G.material.needsUpdate=!0)});for(let G=0,Y=b.length;G<Y;G++){let J=b[G],rt=J.shadow;if(rt===void 0){Bt("WebGLShadowMap:",J,"has no shadow.");continue}if(rt.autoUpdate===!1&&rt.needsUpdate===!1)continue;i.copy(rt.mapSize);let K=rt.getFrameExtents();i.multiply(K),r.copy(rt.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/K.x),i.x=r.x*K.x,rt.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/K.y),i.y=r.y*K.y,rt.mapSize.y=r.y));let Q=s.state.buffers.depth.getReversed();if(rt.camera._reversedDepth=Q,rt.map===null||O===!0){if(rt.map!==null&&(rt.map.depthTexture!==null&&(rt.map.depthTexture.dispose(),rt.map.depthTexture=null),rt.map.dispose()),this.type===er){if(J.isPointLight){Bt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}rt.map=new Ne(i.x,i.y,{format:Hi,type:sn,minFilter:Ce,magFilter:Ce,generateMipmaps:!1}),rt.map.texture.name=J.name+".shadowMap",rt.map.depthTexture=new Fi(i.x,i.y,pn),rt.map.depthTexture.name=J.name+".shadowMapDepth",rt.map.depthTexture.format=ni,rt.map.depthTexture.compareFunction=null,rt.map.depthTexture.minFilter=ze,rt.map.depthTexture.magFilter=ze}else J.isPointLight?(rt.map=new Ec(i.x),rt.map.depthTexture=new Ga(i.x,On)):(rt.map=new Ne(i.x,i.y),rt.map.depthTexture=new Fi(i.x,i.y,On)),rt.map.depthTexture.name=J.name+".shadowMap",rt.map.depthTexture.format=ni,this.type===Mo?(rt.map.depthTexture.compareFunction=Q?Sc:Mc,rt.map.depthTexture.minFilter=Ce,rt.map.depthTexture.magFilter=Ce):(rt.map.depthTexture.compareFunction=null,rt.map.depthTexture.minFilter=ze,rt.map.depthTexture.magFilter=ze);rt.camera.updateProjectionMatrix()}rt.map.isWebGLCubeRenderTarget!==!0&&(rt.map.width!==i.x||rt.map.height!==i.y)&&rt.map.setSize(i.x,i.y);let et=rt.map.isWebGLCubeRenderTarget?6:rt.getViewportCount();J.isPointLight!==!0&&rt.updateMatrices(J,v);for(let ot=0;ot<et;ot++){let Lt=rt.getCamera(ot);if(J.isPointLight){let It=rt.camera,Wt=rt.matrix,qt=J.distance||It.far;qt!==It.far&&(It.far=qt,It.updateProjectionMatrix()),Tc.setFromMatrixPosition(J.matrixWorld),It.position.copy(Tc),Sp.copy(It.position),Sp.add(f1[ot]),It.up.copy(p1[ot]),It.lookAt(Sp),It.updateMatrixWorld(),Wt.makeTranslation(-Tc.x,-Tc.y,-Tc.z),Jg.multiplyMatrices(It.projectionMatrix,It.matrixWorldInverse),rt._frustum.setFromProjectionMatrix(Jg,It.coordinateSystem,It.reversedDepth)}if(rt.map.isWebGLCubeRenderTarget)s.setRenderTarget(rt.map,ot),s.clear();else{ot===0&&(s.setRenderTarget(rt.map),s.clear());let It=rt.getViewport(ot);o.set(r.x*It.x,r.y*It.y,r.x*It.z,r.y*It.w),N.viewport(o)}n=rt.getFrustum(ot),y(R,v,Lt,J,this.type)}rt.isPointLightShadow!==!0&&this.type===er&&M(rt,v),rt.needsUpdate=!1}m=this.type,g.needsUpdate=!1,s.setRenderTarget(C,I,z)};function M(b,R){let v=t.update(x);u.defines.VSM_SAMPLES!==b.blurSamples&&(u.defines.VSM_SAMPLES=b.blurSamples,f.defines.VSM_SAMPLES=b.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),b.mapPass===null?b.mapPass=new Ne(i.x,i.y,{format:Hi,type:sn}):(b.mapPass.width!==b.map.width||b.mapPass.height!==b.map.height)&&b.mapPass.setSize(b.map.width,b.map.height),u.uniforms.shadow_pass.value=b.map.depthTexture,u.uniforms.resolution.value.set(b.map.width,b.map.height),u.uniforms.radius.value=b.radius,s.setRenderTarget(b.mapPass),s.clear(),s.renderBufferDirect(R,null,v,u,x,null),f.uniforms.shadow_pass.value=b.mapPass.texture,f.uniforms.resolution.value.set(b.map.width,b.map.height),f.uniforms.radius.value=b.radius,s.setRenderTarget(b.map),s.clear(),s.renderBufferDirect(R,null,v,f,x,null)}function w(b,R,v,C){let I=null,z=v.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(z!==void 0)I=z;else if(I=v.isPointLight===!0?l:a,s.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){let N=I.uuid,O=R.uuid,G=c[N];G===void 0&&(G={},c[N]=G);let Y=G[O];Y===void 0&&(Y=I.clone(),G[O]=Y,R.addEventListener("dispose",S)),I=Y}if(I.visible=R.visible,I.wireframe=R.wireframe,C===er?I.side=R.shadowSide!==null?R.shadowSide:R.side:I.side=R.shadowSide!==null?R.shadowSide:d[R.side],I.alphaMap=R.alphaMap,I.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,I.map=R.map,I.clipShadows=R.clipShadows,I.clippingPlanes=R.clippingPlanes,I.clipIntersection=R.clipIntersection,I.displacementMap=R.displacementMap,I.displacementScale=R.displacementScale,I.displacementBias=R.displacementBias,I.wireframeLinewidth=R.wireframeLinewidth,I.linewidth=R.linewidth,v.isPointLight===!0&&I.isMeshDistanceMaterial===!0){let N=s.properties.get(I);N.light=v}return I}function y(b,R,v,C,I){if(b.visible===!1)return;if(b.layers.test(R.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&I===er)&&(!b.frustumCulled||b.intersectsFrustum(n))){b.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,b.matrixWorld);let O=t.update(b),G=b.material;if(Array.isArray(G)){let Y=O.groups;for(let J=0,rt=Y.length;J<rt;J++){let K=Y[J],Q=G[K.materialIndex];if(Q&&Q.visible){let et=w(b,Q,C,I);b.onBeforeShadow(s,b,R,v,O,et,K),s.renderBufferDirect(v,null,O,et,b,K),b.onAfterShadow(s,b,R,v,O,et,K)}}}else if(G.visible){let Y=w(b,G,C,I);b.onBeforeShadow(s,b,R,v,O,Y,null),s.renderBufferDirect(v,null,O,Y,b,null),b.onAfterShadow(s,b,R,v,O,Y,null)}}let N=b.children;for(let O=0,G=N.length;O<G;O++)y(N[O],R,v,C,I)}function S(b){b.target.removeEventListener("dispose",S);for(let v in c){let C=c[v],I=b.target.uuid;I in C&&(C[I].dispose(),delete C[I])}}}function g1(s,t){function e(){let P=!1,ct=new be,Z=null,gt=new be(0,0,0,0);return{setMask:function(yt){Z!==yt&&!P&&(s.colorMask(yt,yt,yt,yt),Z=yt)},setLocked:function(yt){P=yt},setClear:function(yt,lt,Nt,W,St){St===!0&&(yt*=W,lt*=W,Nt*=W),ct.set(yt,lt,Nt,W),gt.equals(ct)===!1&&(s.clearColor(yt,lt,Nt,W),gt.copy(ct))},reset:function(){P=!1,Z=null,gt.set(-1,0,0,0)}}}function n(){let P=!1,ct=!1,Z=null,gt=null,yt=null;return{setReversed:function(lt){if(ct!==lt){let Nt=t.get("EXT_clip_control");lt?Nt.clipControlEXT(Nt.LOWER_LEFT_EXT,Nt.ZERO_TO_ONE_EXT):Nt.clipControlEXT(Nt.LOWER_LEFT_EXT,Nt.NEGATIVE_ONE_TO_ONE_EXT),ct=lt;let W=yt;yt=null,this.setClear(W)}},getReversed:function(){return ct},setTest:function(lt){lt?ht(s.DEPTH_TEST):dt(s.DEPTH_TEST)},setMask:function(lt){Z!==lt&&!P&&(s.depthMask(lt),Z=lt)},setFunc:function(lt){if(ct&&(lt=_g[lt]),gt!==lt){switch(lt){case ba:s.depthFunc(s.NEVER);break;case wa:s.depthFunc(s.ALWAYS);break;case Ta:s.depthFunc(s.LESS);break;case Ns:s.depthFunc(s.LEQUAL);break;case Aa:s.depthFunc(s.EQUAL);break;case Ea:s.depthFunc(s.GEQUAL);break;case Ca:s.depthFunc(s.GREATER);break;case Ra:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}gt=lt}},setLocked:function(lt){P=lt},setClear:function(lt){yt!==lt&&(yt=lt,ct&&(lt=1-lt),s.clearDepth(lt))},reset:function(){P=!1,Z=null,gt=null,yt=null,ct=!1}}}function i(){let P=!1,ct=null,Z=null,gt=null,yt=null,lt=null,Nt=null,W=null,St=null;return{setTest:function(Ft){P||(Ft?ht(s.STENCIL_TEST):dt(s.STENCIL_TEST))},setMask:function(Ft){ct!==Ft&&!P&&(s.stencilMask(Ft),ct=Ft)},setFunc:function(Ft,te,de){(Z!==Ft||gt!==te||yt!==de)&&(s.stencilFunc(Ft,te,de),Z=Ft,gt=te,yt=de)},setOp:function(Ft,te,de){(lt!==Ft||Nt!==te||W!==de)&&(s.stencilOp(Ft,te,de),lt=Ft,Nt=te,W=de)},setLocked:function(Ft){P=Ft},setClear:function(Ft){St!==Ft&&(s.clearStencil(Ft),St=Ft)},reset:function(){P=!1,ct=null,Z=null,gt=null,yt=null,lt=null,Nt=null,W=null,St=null}}}let r=new e,o=new n,a=new i,l=new WeakMap,c=new WeakMap,h={},d={},u={},f=new WeakMap,p=[],x=null,g=!1,m=null,M=null,w=null,y=null,S=null,b=null,R=null,v=new zt(0,0,0),C=0,I=!1,z=null,N=null,O=null,G=null,Y=null,J=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS),rt=!1,K=0,Q=s.getParameter(s.VERSION);Q.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(Q)[1]),rt=K>=1):Q.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(Q)[1]),rt=K>=2);let et=null,ot={},Lt=s.getParameter(s.SCISSOR_BOX),It=s.getParameter(s.VIEWPORT),Wt=new be().fromArray(Lt),qt=new be().fromArray(It);function Zt(P,ct,Z,gt){let yt=new Uint8Array(4),lt=s.createTexture();s.bindTexture(P,lt),s.texParameteri(P,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(P,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Nt=0;Nt<Z;Nt++)P===s.TEXTURE_3D||P===s.TEXTURE_2D_ARRAY?s.texImage3D(ct,0,s.RGBA,1,1,gt,0,s.RGBA,s.UNSIGNED_BYTE,yt):s.texImage2D(ct+Nt,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,yt);return lt}let st={};st[s.TEXTURE_2D]=Zt(s.TEXTURE_2D,s.TEXTURE_2D,1),st[s.TEXTURE_CUBE_MAP]=Zt(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),st[s.TEXTURE_2D_ARRAY]=Zt(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),st[s.TEXTURE_3D]=Zt(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ht(s.DEPTH_TEST),o.setFunc(Ns),Pt(!1),at(Bu),ht(s.CULL_FACE),wt(Fn);function ht(P){h[P]!==!0&&(s.enable(P),h[P]=!0)}function dt(P){h[P]!==!1&&(s.disable(P),h[P]=!1)}function Tt(P,ct){return u[P]!==ct?(s.bindFramebuffer(P,ct),u[P]=ct,P===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=ct),P===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=ct),!0):!1}function At(P,ct){let Z=p,gt=!1;if(P){Z=f.get(ct),Z===void 0&&(Z=[],f.set(ct,Z));let yt=P.textures;if(Z.length!==yt.length||Z[0]!==s.COLOR_ATTACHMENT0){for(let lt=0,Nt=yt.length;lt<Nt;lt++)Z[lt]=s.COLOR_ATTACHMENT0+lt;Z.length=yt.length,gt=!0}}else Z[0]!==s.BACK&&(Z[0]=s.BACK,gt=!0);gt&&s.drawBuffers(Z)}function Dt(P){return x!==P?(s.useProgram(P),x=P,!0):!1}let ne={[ps]:s.FUNC_ADD,[Af]:s.FUNC_SUBTRACT,[Ef]:s.FUNC_REVERSE_SUBTRACT};ne[Cf]=s.MIN,ne[Rf]=s.MAX;let xt={[Pf]:s.ZERO,[If]:s.ONE,[Lf]:s.SRC_COLOR,[Vu]:s.SRC_ALPHA,[Bf]:s.SRC_ALPHA_SATURATE,[Ff]:s.DST_COLOR,[Nf]:s.DST_ALPHA,[Df]:s.ONE_MINUS_SRC_COLOR,[Gu]:s.ONE_MINUS_SRC_ALPHA,[Of]:s.ONE_MINUS_DST_COLOR,[Uf]:s.ONE_MINUS_DST_ALPHA,[zf]:s.CONSTANT_COLOR,[kf]:s.ONE_MINUS_CONSTANT_COLOR,[Vf]:s.CONSTANT_ALPHA,[Gf]:s.ONE_MINUS_CONSTANT_ALPHA};function wt(P,ct,Z,gt,yt,lt,Nt,W,St,Ft){if(P===Fn){g===!0&&(dt(s.BLEND),g=!1);return}if(g===!1&&(ht(s.BLEND),g=!0),P!==Tf){if(P!==m||Ft!==I){if((M!==ps||S!==ps)&&(s.blendEquation(s.FUNC_ADD),M=ps,S=ps),Ft)switch(P){case nr:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case fs:s.blendFunc(s.ONE,s.ONE);break;case zu:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case ku:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:Qt("WebGLState: Invalid blending: ",P);break}else switch(P){case nr:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case fs:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case zu:Qt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ku:Qt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Qt("WebGLState: Invalid blending: ",P);break}w=null,y=null,b=null,R=null,v.set(0,0,0),C=0,m=P,I=Ft}return}yt=yt||ct,lt=lt||Z,Nt=Nt||gt,(ct!==M||yt!==S)&&(s.blendEquationSeparate(ne[ct],ne[yt]),M=ct,S=yt),(Z!==w||gt!==y||lt!==b||Nt!==R)&&(s.blendFuncSeparate(xt[Z],xt[gt],xt[lt],xt[Nt]),w=Z,y=gt,b=lt,R=Nt),(W.equals(v)===!1||St!==C)&&(s.blendColor(W.r,W.g,W.b,St),v.copy(W),C=St),m=P,I=!1}function Ct(P,ct){P.side===ri?dt(s.CULL_FACE):ht(s.CULL_FACE);let Z=P.side===nn;ct&&(Z=!Z),Pt(Z),P.blending===nr&&P.transparent===!1?wt(Fn):wt(P.blending,P.blendEquation,P.blendSrc,P.blendDst,P.blendEquationAlpha,P.blendSrcAlpha,P.blendDstAlpha,P.blendColor,P.blendAlpha,P.premultipliedAlpha),o.setFunc(P.depthFunc),o.setTest(P.depthTest),o.setMask(P.depthWrite),r.setMask(P.colorWrite);let gt=P.stencilWrite;a.setTest(gt),gt&&(a.setMask(P.stencilWriteMask),a.setFunc(P.stencilFunc,P.stencilRef,P.stencilFuncMask),a.setOp(P.stencilFail,P.stencilZFail,P.stencilZPass)),pt(P.polygonOffset,P.polygonOffsetFactor,P.polygonOffsetUnits),P.alphaToCoverage===!0?ht(s.SAMPLE_ALPHA_TO_COVERAGE):dt(s.SAMPLE_ALPHA_TO_COVERAGE)}function Pt(P){z!==P&&(P?s.frontFace(s.CW):s.frontFace(s.CCW),z=P)}function at(P){P!==Sf?(ht(s.CULL_FACE),P!==N&&(P===Bu?s.cullFace(s.BACK):P===bf?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):dt(s.CULL_FACE),N=P}function Ut(P){P!==O&&(rt&&s.lineWidth(P),O=P)}function pt(P,ct,Z){P?(ht(s.POLYGON_OFFSET_FILL),(G!==ct||Y!==Z)&&(G=ct,Y=Z,o.getReversed()&&(ct=-ct),s.polygonOffset(ct,Z))):dt(s.POLYGON_OFFSET_FILL)}function Et(P){P?ht(s.SCISSOR_TEST):dt(s.SCISSOR_TEST)}function Ot(P){P===void 0&&(P=s.TEXTURE0+J-1),et!==P&&(s.activeTexture(P),et=P)}function k(P,ct,Z){Z===void 0&&(et===null?Z=s.TEXTURE0+J-1:Z=et);let gt=ot[Z];gt===void 0&&(gt={type:void 0,texture:void 0},ot[Z]=gt),(gt.type!==P||gt.texture!==ct)&&(et!==Z&&(s.activeTexture(Z),et=Z),s.bindTexture(P,ct||st[P]),gt.type=P,gt.texture=ct)}function jt(){let P=ot[et];P!==void 0&&P.type!==void 0&&(s.bindTexture(P.type,null),P.type=void 0,P.texture=void 0)}function $(){try{s.compressedTexImage2D(...arguments)}catch(P){Qt("WebGLState:",P)}}function T(){try{s.compressedTexImage3D(...arguments)}catch(P){Qt("WebGLState:",P)}}function _(){try{s.texSubImage2D(...arguments)}catch(P){Qt("WebGLState:",P)}}function A(){try{s.texSubImage3D(...arguments)}catch(P){Qt("WebGLState:",P)}}function L(){try{s.compressedTexSubImage2D(...arguments)}catch(P){Qt("WebGLState:",P)}}function D(){try{s.compressedTexSubImage3D(...arguments)}catch(P){Qt("WebGLState:",P)}}function F(){try{s.texStorage2D(...arguments)}catch(P){Qt("WebGLState:",P)}}function V(){try{s.texStorage3D(...arguments)}catch(P){Qt("WebGLState:",P)}}function B(){try{s.texImage2D(...arguments)}catch(P){Qt("WebGLState:",P)}}function X(){try{s.texImage3D(...arguments)}catch(P){Qt("WebGLState:",P)}}function tt(P){return d[P]!==void 0?d[P]:s.getParameter(P)}function vt(P,ct){d[P]!==ct&&(s.pixelStorei(P,ct),d[P]=ct)}function _t(P){Wt.equals(P)===!1&&(s.scissor(P.x,P.y,P.z,P.w),Wt.copy(P))}function bt(P){qt.equals(P)===!1&&(s.viewport(P.x,P.y,P.z,P.w),qt.copy(P))}function j(P,ct){let Z=c.get(ct);Z===void 0&&(Z=new WeakMap,c.set(ct,Z));let gt=Z.get(P);gt===void 0&&(gt=s.getUniformBlockIndex(ct,P.name),Z.set(P,gt))}function mt(P,ct){let gt=c.get(ct).get(P);l.get(ct)!==gt&&(s.uniformBlockBinding(ct,gt,P.__bindingPointIndex),l.set(ct,gt))}function Rt(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),h={},d={},et=null,ot={},u={},f=new WeakMap,p=[],x=null,g=!1,m=null,M=null,w=null,y=null,S=null,b=null,R=null,v=new zt(0,0,0),C=0,I=!1,z=null,N=null,O=null,G=null,Y=null,Wt.set(0,0,s.canvas.width,s.canvas.height),qt.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ht,disable:dt,bindFramebuffer:Tt,drawBuffers:At,useProgram:Dt,setBlending:wt,setMaterial:Ct,setFlipSided:Pt,setCullFace:at,setLineWidth:Ut,setPolygonOffset:pt,setScissorTest:Et,activeTexture:Ot,bindTexture:k,unbindTexture:jt,compressedTexImage2D:$,compressedTexImage3D:T,texImage2D:B,texImage3D:X,pixelStorei:vt,getParameter:tt,updateUBOMapping:j,uniformBlockBinding:mt,texStorage2D:F,texStorage3D:V,texSubImage2D:_,texSubImage3D:A,compressedTexSubImage2D:L,compressedTexSubImage3D:D,scissor:_t,viewport:bt,reset:Rt}}function x1(s,t,e,n,i,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Mt,h=new WeakMap,d=new Set,u,f=new WeakMap,p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(T,_){return p?new OffscreenCanvas(T,_):qr("canvas")}function g(T,_,A){let L=1,D=$(T);if((D.width>A||D.height>A)&&(L=A/Math.max(D.width,D.height)),L<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){let F=Math.floor(L*D.width),V=Math.floor(L*D.height);u===void 0&&(u=x(F,V));let B=_?x(F,V):u;return B.width=F,B.height=V,B.getContext("2d").drawImage(T,0,0,F,V),Bt("WebGLRenderer: Texture has been resized from ("+D.width+"x"+D.height+") to ("+F+"x"+V+")."),B}else return"data"in T&&Bt("WebGLRenderer: Image in DataTexture is too big ("+D.width+"x"+D.height+")."),T;return T}function m(T){return T.generateMipmaps}function M(T){s.generateMipmap(T)}function w(T){return T.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:T.isWebGL3DRenderTarget?s.TEXTURE_3D:T.isWebGLArrayRenderTarget||T.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function y(T,_,A,L,D,F=!1){if(T!==null){if(s[T]!==void 0)return s[T];Bt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let V;L&&(V=t.get("EXT_texture_norm16"),V||Bt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let B=_;if(_===s.RED&&(A===s.FLOAT&&(B=s.R32F),A===s.HALF_FLOAT&&(B=s.R16F),A===s.UNSIGNED_BYTE&&(B=s.R8),A===s.UNSIGNED_SHORT&&V&&(B=V.R16_EXT),A===s.SHORT&&V&&(B=V.R16_SNORM_EXT)),_===s.RED_INTEGER&&(A===s.UNSIGNED_BYTE&&(B=s.R8UI),A===s.UNSIGNED_SHORT&&(B=s.R16UI),A===s.UNSIGNED_INT&&(B=s.R32UI),A===s.BYTE&&(B=s.R8I),A===s.SHORT&&(B=s.R16I),A===s.INT&&(B=s.R32I)),_===s.RG&&(A===s.FLOAT&&(B=s.RG32F),A===s.HALF_FLOAT&&(B=s.RG16F),A===s.UNSIGNED_BYTE&&(B=s.RG8),A===s.UNSIGNED_SHORT&&V&&(B=V.RG16_EXT),A===s.SHORT&&V&&(B=V.RG16_SNORM_EXT)),_===s.RG_INTEGER&&(A===s.UNSIGNED_BYTE&&(B=s.RG8UI),A===s.UNSIGNED_SHORT&&(B=s.RG16UI),A===s.UNSIGNED_INT&&(B=s.RG32UI),A===s.BYTE&&(B=s.RG8I),A===s.SHORT&&(B=s.RG16I),A===s.INT&&(B=s.RG32I)),_===s.RGB_INTEGER&&(A===s.UNSIGNED_BYTE&&(B=s.RGB8UI),A===s.UNSIGNED_SHORT&&(B=s.RGB16UI),A===s.UNSIGNED_INT&&(B=s.RGB32UI),A===s.BYTE&&(B=s.RGB8I),A===s.SHORT&&(B=s.RGB16I),A===s.INT&&(B=s.RGB32I)),_===s.RGBA_INTEGER&&(A===s.UNSIGNED_BYTE&&(B=s.RGBA8UI),A===s.UNSIGNED_SHORT&&(B=s.RGBA16UI),A===s.UNSIGNED_INT&&(B=s.RGBA32UI),A===s.BYTE&&(B=s.RGBA8I),A===s.SHORT&&(B=s.RGBA16I),A===s.INT&&(B=s.RGBA32I)),_===s.RGB&&(A===s.UNSIGNED_SHORT&&V&&(B=V.RGB16_EXT),A===s.SHORT&&V&&(B=V.RGB16_SNORM_EXT),A===s.UNSIGNED_INT_5_9_9_9_REV&&(B=s.RGB9_E5),A===s.UNSIGNED_INT_10F_11F_11F_REV&&(B=s.R11F_G11F_B10F)),_===s.RGBA){let X=F?Xr:he.getTransfer(D);A===s.FLOAT&&(B=s.RGBA32F),A===s.HALF_FLOAT&&(B=s.RGBA16F),A===s.UNSIGNED_BYTE&&(B=X===_e?s.SRGB8_ALPHA8:s.RGBA8),A===s.UNSIGNED_SHORT&&V&&(B=V.RGBA16_EXT),A===s.SHORT&&V&&(B=V.RGBA16_SNORM_EXT),A===s.UNSIGNED_SHORT_4_4_4_4&&(B=s.RGBA4),A===s.UNSIGNED_SHORT_5_5_5_1&&(B=s.RGB5_A1)}return(B===s.R16F||B===s.R32F||B===s.RG16F||B===s.RG32F||B===s.RGBA16F||B===s.RGBA32F)&&t.get("EXT_color_buffer_float"),B}function S(T,_){let A;return T?_===null||_===On||_===or?A=s.DEPTH24_STENCIL8:_===pn?A=s.DEPTH32F_STENCIL8:_===rr&&(A=s.DEPTH24_STENCIL8,Bt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===On||_===or?A=s.DEPTH_COMPONENT24:_===pn?A=s.DEPTH_COMPONENT32F:_===rr&&(A=s.DEPTH_COMPONENT16),A}function b(T,_){return m(T)===!0||T.isFramebufferTexture&&T.minFilter!==ze&&T.minFilter!==Ce?Math.log2(Math.max(_.width,_.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?_.mipmaps.length:1}function R(T){let _=T.target;_.removeEventListener("dispose",R),C(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&d.delete(_)}function v(T){let _=T.target;_.removeEventListener("dispose",v),z(_)}function C(T){let _=n.get(T);if(_.__webglInit===void 0)return;let A=T.source,L=f.get(A);if(L){let D=L[_.__cacheKey];D.usedTimes--,D.usedTimes===0&&I(T),Object.keys(L).length===0&&f.delete(A)}n.remove(T)}function I(T){let _=n.get(T);s.deleteTexture(_.__webglTexture);let A=T.source,L=f.get(A);delete L[_.__cacheKey],o.memory.textures--}function z(T){let _=n.get(T);if(T.depthTexture&&(T.depthTexture.dispose(),n.remove(T.depthTexture)),T.isWebGLCubeRenderTarget)for(let L=0;L<6;L++){if(Array.isArray(_.__webglFramebuffer[L]))for(let D=0;D<_.__webglFramebuffer[L].length;D++)s.deleteFramebuffer(_.__webglFramebuffer[L][D]);else s.deleteFramebuffer(_.__webglFramebuffer[L]);_.__webglDepthbuffer&&s.deleteRenderbuffer(_.__webglDepthbuffer[L])}else{if(Array.isArray(_.__webglFramebuffer))for(let L=0;L<_.__webglFramebuffer.length;L++)s.deleteFramebuffer(_.__webglFramebuffer[L]);else s.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&s.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&s.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let L=0;L<_.__webglColorRenderbuffer.length;L++)_.__webglColorRenderbuffer[L]&&s.deleteRenderbuffer(_.__webglColorRenderbuffer[L]);_.__webglDepthRenderbuffer&&s.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let A=T.textures;for(let L=0,D=A.length;L<D;L++){let F=n.get(A[L]);F.__webglTexture&&(s.deleteTexture(F.__webglTexture),o.memory.textures--),n.remove(A[L])}n.remove(T)}let N=0;function O(){N=0}function G(){return N}function Y(T){N=T}function J(){let T=N;return T>=i.maxTextures&&Bt("WebGLTextures: Trying to use "+(T+1)+" texture units while this GPU supports only "+i.maxTextures),N+=1,T}function rt(T){let _=[];return _.push(T.wrapS),_.push(T.wrapT),_.push(T.wrapR||0),_.push(T.magFilter),_.push(T.minFilter),_.push(T.anisotropy),_.push(T.internalFormat),_.push(T.format),_.push(T.type),_.push(T.generateMipmaps),_.push(T.premultiplyAlpha),_.push(T.flipY),_.push(T.unpackAlignment),_.push(T.colorSpace),_.join()}function K(T,_){let A=n.get(T);if(T.isVideoTexture&&k(T),T.isRenderTargetTexture===!1&&T.isExternalTexture!==!0&&T.version>0&&A.__version!==T.version){let L=T.image;if(L===null)Bt("WebGLRenderer: Texture marked for update but no image data found.");else if(L.complete===!1)Bt("WebGLRenderer: Texture marked for update but image is incomplete");else{dt(A,T,_);return}}else T.isExternalTexture&&(A.__webglTexture=T.sourceTexture?T.sourceTexture:null);e.bindTexture(s.TEXTURE_2D,A.__webglTexture,s.TEXTURE0+_)}function Q(T,_){let A=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&A.__version!==T.version){dt(A,T,_);return}else T.isExternalTexture&&(A.__webglTexture=T.sourceTexture?T.sourceTexture:null);e.bindTexture(s.TEXTURE_2D_ARRAY,A.__webglTexture,s.TEXTURE0+_)}function et(T,_){let A=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&A.__version!==T.version){dt(A,T,_);return}e.bindTexture(s.TEXTURE_3D,A.__webglTexture,s.TEXTURE0+_)}function ot(T,_){let A=n.get(T);if(T.isCubeDepthTexture!==!0&&T.version>0&&A.__version!==T.version){Tt(A,T,_);return}e.bindTexture(s.TEXTURE_CUBE_MAP,A.__webglTexture,s.TEXTURE0+_)}let Lt={[kr]:s.REPEAT,[Mn]:s.CLAMP_TO_EDGE,[Vr]:s.MIRRORED_REPEAT},It={[ze]:s.NEAREST,[Hu]:s.NEAREST_MIPMAP_NEAREST,[sr]:s.NEAREST_MIPMAP_LINEAR,[Ce]:s.LINEAR,[Io]:s.LINEAR_MIPMAP_NEAREST,[ai]:s.LINEAR_MIPMAP_LINEAR},Wt={[Qf]:s.NEVER,[ip]:s.ALWAYS,[jf]:s.LESS,[Mc]:s.LEQUAL,[tp]:s.EQUAL,[Sc]:s.GEQUAL,[ep]:s.GREATER,[np]:s.NOTEQUAL};function qt(T,_){if(_.type===pn&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===Ce||_.magFilter===Io||_.magFilter===sr||_.magFilter===ai||_.minFilter===Ce||_.minFilter===Io||_.minFilter===sr||_.minFilter===ai)&&Bt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(T,s.TEXTURE_WRAP_S,Lt[_.wrapS]),s.texParameteri(T,s.TEXTURE_WRAP_T,Lt[_.wrapT]),(T===s.TEXTURE_3D||T===s.TEXTURE_2D_ARRAY)&&s.texParameteri(T,s.TEXTURE_WRAP_R,Lt[_.wrapR]),s.texParameteri(T,s.TEXTURE_MAG_FILTER,It[_.magFilter]),s.texParameteri(T,s.TEXTURE_MIN_FILTER,It[_.minFilter]),_.compareFunction&&(s.texParameteri(T,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(T,s.TEXTURE_COMPARE_FUNC,Wt[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===ze||_.minFilter!==sr&&_.minFilter!==ai||_.type===pn&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let A=t.get("EXT_texture_filter_anisotropic");s.texParameterf(T,A.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,i.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Zt(T,_){let A=!1;T.__webglInit===void 0&&(T.__webglInit=!0,_.addEventListener("dispose",R));let L=_.source,D=f.get(L);D===void 0&&(D={},f.set(L,D));let F=rt(_);if(F!==T.__cacheKey){D[F]===void 0&&(D[F]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,A=!0),D[F].usedTimes++;let V=D[T.__cacheKey];V!==void 0&&(D[T.__cacheKey].usedTimes--,V.usedTimes===0&&I(_)),T.__cacheKey=F,T.__webglTexture=D[F].texture}return A}function st(T,_,A){return Math.floor(Math.floor(T/A)/_)}function ht(T,_,A,L){let F=T.updateRanges;if(F.length===0)e.texSubImage2D(s.TEXTURE_2D,0,0,0,_.width,_.height,A,L,_.data);else{F.sort((vt,_t)=>vt.start-_t.start);let V=0;for(let vt=1;vt<F.length;vt++){let _t=F[V],bt=F[vt],j=_t.start+_t.count,mt=st(bt.start,_.width,4),Rt=st(_t.start,_.width,4);bt.start<=j+1&&mt===Rt&&st(bt.start+bt.count-1,_.width,4)===mt?_t.count=Math.max(_t.count,bt.start+bt.count-_t.start):(++V,F[V]=bt)}F.length=V+1;let B=e.getParameter(s.UNPACK_ROW_LENGTH),X=e.getParameter(s.UNPACK_SKIP_PIXELS),tt=e.getParameter(s.UNPACK_SKIP_ROWS);e.pixelStorei(s.UNPACK_ROW_LENGTH,_.width);for(let vt=0,_t=F.length;vt<_t;vt++){let bt=F[vt],j=Math.floor(bt.start/4),mt=Math.ceil(bt.count/4),Rt=j%_.width,P=Math.floor(j/_.width),ct=mt,Z=1;e.pixelStorei(s.UNPACK_SKIP_PIXELS,Rt),e.pixelStorei(s.UNPACK_SKIP_ROWS,P),e.texSubImage2D(s.TEXTURE_2D,0,Rt,P,ct,Z,A,L,_.data)}T.clearUpdateRanges(),e.pixelStorei(s.UNPACK_ROW_LENGTH,B),e.pixelStorei(s.UNPACK_SKIP_PIXELS,X),e.pixelStorei(s.UNPACK_SKIP_ROWS,tt)}}function dt(T,_,A){let L=s.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(L=s.TEXTURE_2D_ARRAY),_.isData3DTexture&&(L=s.TEXTURE_3D);let D=Zt(T,_),F=_.source;e.bindTexture(L,T.__webglTexture,s.TEXTURE0+A);let V=n.get(F);if(F.version!==V.__version||D===!0){if(e.activeTexture(s.TEXTURE0+A),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let Z=he.getPrimaries(he.workingColorSpace),gt=_.colorSpace===vi?null:he.getPrimaries(_.colorSpace),yt=_.colorSpace===vi||Z===gt?s.NONE:s.BROWSER_DEFAULT_WEBGL;e.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,yt)}e.pixelStorei(s.UNPACK_ALIGNMENT,_.unpackAlignment);let X=g(_.image,!1,i.maxTextureSize);X=jt(_,X);let tt=r.convert(_.format,_.colorSpace),vt=r.convert(_.type),_t=y(_.internalFormat,tt,vt,_.normalized,_.colorSpace,_.isVideoTexture);qt(L,_);let bt,j=_.mipmaps,mt=_.isVideoTexture!==!0,Rt=V.__version===void 0||D===!0,P=F.dataReady,ct=b(_,X);if(_.isDepthTexture)_t=S(_.format===Gi,_.type),Rt&&(mt?e.texStorage2D(s.TEXTURE_2D,1,_t,X.width,X.height):e.texImage2D(s.TEXTURE_2D,0,_t,X.width,X.height,0,tt,vt,null));else if(_.isDataTexture)if(j.length>0){mt&&Rt&&e.texStorage2D(s.TEXTURE_2D,ct,_t,j[0].width,j[0].height);for(let Z=0,gt=j.length;Z<gt;Z++)bt=j[Z],mt?P&&e.texSubImage2D(s.TEXTURE_2D,Z,0,0,bt.width,bt.height,tt,vt,bt.data):e.texImage2D(s.TEXTURE_2D,Z,_t,bt.width,bt.height,0,tt,vt,bt.data);_.generateMipmaps=!1}else mt?(Rt&&e.texStorage2D(s.TEXTURE_2D,ct,_t,X.width,X.height),P&&ht(_,X,tt,vt)):e.texImage2D(s.TEXTURE_2D,0,_t,X.width,X.height,0,tt,vt,X.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){mt&&Rt&&e.texStorage3D(s.TEXTURE_2D_ARRAY,ct,_t,j[0].width,j[0].height,X.depth);for(let Z=0,gt=j.length;Z<gt;Z++)if(bt=j[Z],_.format!==mn)if(tt!==null)if(mt){if(P)if(_.layerUpdates.size>0){let yt=Qu(bt.width,bt.height,_.format,_.type);for(let lt of _.layerUpdates){let Nt=bt.data.subarray(lt*yt/bt.data.BYTES_PER_ELEMENT,(lt+1)*yt/bt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,Z,0,0,lt,bt.width,bt.height,1,tt,Nt)}}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,Z,0,0,0,bt.width,bt.height,X.depth,tt,bt.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,Z,_t,bt.width,bt.height,X.depth,0,bt.data,0,0);else Bt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else mt?P&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,Z,0,0,0,bt.width,bt.height,X.depth,tt,vt,bt.data):e.texImage3D(s.TEXTURE_2D_ARRAY,Z,_t,bt.width,bt.height,X.depth,0,tt,vt,bt.data);_.layerUpdates.size>0&&_.clearLayerUpdates()}else{mt&&Rt&&e.texStorage2D(s.TEXTURE_2D,ct,_t,j[0].width,j[0].height);for(let Z=0,gt=j.length;Z<gt;Z++)bt=j[Z],_.format!==mn?tt!==null?mt?P&&e.compressedTexSubImage2D(s.TEXTURE_2D,Z,0,0,bt.width,bt.height,tt,bt.data):e.compressedTexImage2D(s.TEXTURE_2D,Z,_t,bt.width,bt.height,0,bt.data):Bt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):mt?P&&e.texSubImage2D(s.TEXTURE_2D,Z,0,0,bt.width,bt.height,tt,vt,bt.data):e.texImage2D(s.TEXTURE_2D,Z,_t,bt.width,bt.height,0,tt,vt,bt.data)}else if(_.isDataArrayTexture)if(mt){if(Rt&&e.texStorage3D(s.TEXTURE_2D_ARRAY,ct,_t,X.width,X.height,X.depth),P)if(_.layerUpdates.size>0){let Z=Qu(X.width,X.height,_.format,_.type);for(let gt of _.layerUpdates){let yt=X.data.subarray(gt*Z/X.data.BYTES_PER_ELEMENT,(gt+1)*Z/X.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,gt,X.width,X.height,1,tt,vt,yt)}_.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,X.width,X.height,X.depth,tt,vt,X.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,_t,X.width,X.height,X.depth,0,tt,vt,X.data);else if(_.isData3DTexture)mt?(Rt&&e.texStorage3D(s.TEXTURE_3D,ct,_t,X.width,X.height,X.depth),P&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,X.width,X.height,X.depth,tt,vt,X.data)):e.texImage3D(s.TEXTURE_3D,0,_t,X.width,X.height,X.depth,0,tt,vt,X.data);else if(_.isFramebufferTexture){if(Rt)if(mt)e.texStorage2D(s.TEXTURE_2D,ct,_t,X.width,X.height);else{let Z=X.width,gt=X.height;for(let yt=0;yt<ct;yt++)e.texImage2D(s.TEXTURE_2D,yt,_t,Z,gt,0,tt,vt,null),Z>>=1,gt>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in s){let Z=s.canvas;if(Z.hasAttribute("layoutsubtree")||Z.setAttribute("layoutsubtree","true"),X.parentNode!==Z){Z.appendChild(X),d.add(_),Z.onpaint=gt=>{let yt=gt.changedElements;for(let lt of d)yt.includes(lt.image)&&(lt.needsUpdate=!0)},Z.requestPaint();return}if(s.texElementImage2D.length===3)s.texElementImage2D(s.TEXTURE_2D,s.RGBA8,X);else{let yt=s.RGBA,lt=s.RGBA,Nt=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,0,yt,lt,Nt,X)}s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(j.length>0){if(mt&&Rt){let Z=$(j[0]);e.texStorage2D(s.TEXTURE_2D,ct,_t,Z.width,Z.height)}for(let Z=0,gt=j.length;Z<gt;Z++)bt=j[Z],mt?P&&e.texSubImage2D(s.TEXTURE_2D,Z,0,0,tt,vt,bt):e.texImage2D(s.TEXTURE_2D,Z,_t,tt,vt,bt);_.generateMipmaps=!1}else if(mt){if(Rt){let Z=$(X);e.texStorage2D(s.TEXTURE_2D,ct,_t,Z.width,Z.height)}P&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,tt,vt,X)}else e.texImage2D(s.TEXTURE_2D,0,_t,tt,vt,X);m(_)&&M(L),V.__version=F.version,_.onUpdate&&_.onUpdate(_)}T.__version=_.version}function Tt(T,_,A){if(_.image.length!==6)return;let L=Zt(T,_),D=_.source;e.bindTexture(s.TEXTURE_CUBE_MAP,T.__webglTexture,s.TEXTURE0+A);let F=n.get(D);if(D.version!==F.__version||L===!0){e.activeTexture(s.TEXTURE0+A);let V=he.getPrimaries(he.workingColorSpace),B=_.colorSpace===vi?null:he.getPrimaries(_.colorSpace),X=_.colorSpace===vi||V===B?s.NONE:s.BROWSER_DEFAULT_WEBGL;e.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(s.UNPACK_ALIGNMENT,_.unpackAlignment),e.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,X);let tt=_.isCompressedTexture||_.image[0].isCompressedTexture,vt=_.image[0]&&_.image[0].isDataTexture,_t=[];for(let lt=0;lt<6;lt++)!tt&&!vt?_t[lt]=g(_.image[lt],!0,i.maxCubemapSize):_t[lt]=vt?_.image[lt].image:_.image[lt],_t[lt]=jt(_,_t[lt]);let bt=_t[0],j=r.convert(_.format,_.colorSpace),mt=r.convert(_.type),Rt=y(_.internalFormat,j,mt,_.normalized,_.colorSpace),P=_.isVideoTexture!==!0,ct=F.__version===void 0||L===!0,Z=D.dataReady,gt=b(_,bt);qt(s.TEXTURE_CUBE_MAP,_);let yt;if(tt){P&&ct&&e.texStorage2D(s.TEXTURE_CUBE_MAP,gt,Rt,bt.width,bt.height);for(let lt=0;lt<6;lt++){yt=_t[lt].mipmaps;for(let Nt=0;Nt<yt.length;Nt++){let W=yt[Nt];_.format!==mn?j!==null?P?Z&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt,0,0,W.width,W.height,j,W.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt,Rt,W.width,W.height,0,W.data):Bt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):P?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt,0,0,W.width,W.height,j,mt,W.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt,Rt,W.width,W.height,0,j,mt,W.data)}}}else{if(yt=_.mipmaps,P&&ct){yt.length>0&&gt++;let lt=$(_t[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,gt,Rt,lt.width,lt.height)}for(let lt=0;lt<6;lt++)if(vt){P?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,0,0,_t[lt].width,_t[lt].height,j,mt,_t[lt].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,Rt,_t[lt].width,_t[lt].height,0,j,mt,_t[lt].data);for(let Nt=0;Nt<yt.length;Nt++){let St=yt[Nt].image[lt].image;P?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt+1,0,0,St.width,St.height,j,mt,St.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt+1,Rt,St.width,St.height,0,j,mt,St.data)}}else{P?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,0,0,j,mt,_t[lt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,Rt,j,mt,_t[lt]);for(let Nt=0;Nt<yt.length;Nt++){let W=yt[Nt];P?Z&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt+1,0,0,j,mt,W.image[lt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Nt+1,Rt,j,mt,W.image[lt])}}}m(_)&&M(s.TEXTURE_CUBE_MAP),F.__version=D.version,_.onUpdate&&_.onUpdate(_)}T.__version=_.version}function At(T,_,A,L,D,F){let V=r.convert(A.format,A.colorSpace),B=r.convert(A.type),X=y(A.internalFormat,V,B,A.normalized,A.colorSpace),tt=n.get(_),vt=n.get(A);if(vt.__renderTarget=_,!tt.__hasExternalTextures){let _t=Math.max(1,_.width>>F),bt=Math.max(1,_.height>>F);D===s.TEXTURE_3D||D===s.TEXTURE_2D_ARRAY?e.texImage3D(D,F,X,_t,bt,_.depth,0,V,B,null):e.texImage2D(D,F,X,_t,bt,0,V,B,null)}e.bindFramebuffer(s.FRAMEBUFFER,T),Ot(_)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,L,D,vt.__webglTexture,0,Et(_)):(D===s.TEXTURE_2D||D>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&D<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,L,D,vt.__webglTexture,F),e.bindFramebuffer(s.FRAMEBUFFER,null)}function Dt(T,_,A){if(s.bindRenderbuffer(s.RENDERBUFFER,T),_.depthBuffer){let L=_.depthTexture,D=L&&L.isDepthTexture?L.type:null,F=S(_.stencilBuffer,D),V=_.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;Ot(_)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Et(_),F,_.width,_.height):A?s.renderbufferStorageMultisample(s.RENDERBUFFER,Et(_),F,_.width,_.height):s.renderbufferStorage(s.RENDERBUFFER,F,_.width,_.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,V,s.RENDERBUFFER,T)}else{let L=_.textures;for(let D=0;D<L.length;D++){let F=L[D],V=r.convert(F.format,F.colorSpace),B=r.convert(F.type),X=y(F.internalFormat,V,B,F.normalized,F.colorSpace);Ot(_)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Et(_),X,_.width,_.height):A?s.renderbufferStorageMultisample(s.RENDERBUFFER,Et(_),X,_.width,_.height):s.renderbufferStorage(s.RENDERBUFFER,X,_.width,_.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function ne(T,_,A){let L=_.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(s.FRAMEBUFFER,T),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let D=n.get(_.depthTexture);if(D.__renderTarget=_,(!D.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),L){if(D.__webglInit===void 0&&(D.__webglInit=!0,_.depthTexture.addEventListener("dispose",R)),D.__webglTexture===void 0){D.__webglTexture=s.createTexture(),e.bindTexture(s.TEXTURE_CUBE_MAP,D.__webglTexture),qt(s.TEXTURE_CUBE_MAP,_.depthTexture);let tt=r.convert(_.depthTexture.format),vt=r.convert(_.depthTexture.type),_t;_.depthTexture.format===ni?_t=s.DEPTH_COMPONENT24:_.depthTexture.format===Gi&&(_t=s.DEPTH24_STENCIL8);for(let bt=0;bt<6;bt++)s.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+bt,0,_t,_.width,_.height,0,tt,vt,null)}}else K(_.depthTexture,0);let F=D.__webglTexture,V=Et(_),B=L?s.TEXTURE_CUBE_MAP_POSITIVE_X+A:s.TEXTURE_2D,X=_.depthTexture.format===Gi?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(_.depthTexture.format===ni)Ot(_)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,X,B,F,0,V):s.framebufferTexture2D(s.FRAMEBUFFER,X,B,F,0);else if(_.depthTexture.format===Gi)Ot(_)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,X,B,F,0,V):s.framebufferTexture2D(s.FRAMEBUFFER,X,B,F,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function xt(T){let _=n.get(T),A=T.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==T.depthTexture){let L=T.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),L){let D=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,L.removeEventListener("dispose",D)};L.addEventListener("dispose",D),_.__depthDisposeCallback=D}_.__boundDepthTexture=L}if(T.depthTexture&&!_.__autoAllocateDepthBuffer)if(A)for(let L=0;L<6;L++)ne(_.__webglFramebuffer[L],T,L);else{let L=T.texture.mipmaps;L&&L.length>0?ne(_.__webglFramebuffer[0],T,0):ne(_.__webglFramebuffer,T,0)}else if(A){_.__webglDepthbuffer=[];for(let L=0;L<6;L++)if(e.bindFramebuffer(s.FRAMEBUFFER,_.__webglFramebuffer[L]),_.__webglDepthbuffer[L]===void 0)_.__webglDepthbuffer[L]=s.createRenderbuffer(),Dt(_.__webglDepthbuffer[L],T,!1);else{let D=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,F=_.__webglDepthbuffer[L];s.bindRenderbuffer(s.RENDERBUFFER,F),s.framebufferRenderbuffer(s.FRAMEBUFFER,D,s.RENDERBUFFER,F)}}else{let L=T.texture.mipmaps;if(L&&L.length>0?e.bindFramebuffer(s.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(s.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=s.createRenderbuffer(),Dt(_.__webglDepthbuffer,T,!1);else{let D=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,F=_.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,F),s.framebufferRenderbuffer(s.FRAMEBUFFER,D,s.RENDERBUFFER,F)}}e.bindFramebuffer(s.FRAMEBUFFER,null)}function wt(T,_,A){let L=n.get(T);_!==void 0&&At(L.__webglFramebuffer,T,T.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),A!==void 0&&xt(T)}function Ct(T){let _=T.texture,A=n.get(T),L=n.get(_);T.addEventListener("dispose",v);let D=T.textures,F=T.isWebGLCubeRenderTarget===!0,V=D.length>1;if(V||(L.__webglTexture===void 0&&(L.__webglTexture=s.createTexture()),L.__version=_.version,o.memory.textures++),F){A.__webglFramebuffer=[];for(let B=0;B<6;B++)if(_.mipmaps&&_.mipmaps.length>0){A.__webglFramebuffer[B]=[];for(let X=0;X<_.mipmaps.length;X++)A.__webglFramebuffer[B][X]=s.createFramebuffer()}else A.__webglFramebuffer[B]=s.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){A.__webglFramebuffer=[];for(let B=0;B<_.mipmaps.length;B++)A.__webglFramebuffer[B]=s.createFramebuffer()}else A.__webglFramebuffer=s.createFramebuffer();if(V)for(let B=0,X=D.length;B<X;B++){let tt=n.get(D[B]);tt.__webglTexture===void 0&&(tt.__webglTexture=s.createTexture(),o.memory.textures++)}if(T.samples>0&&Ot(T)===!1){A.__webglMultisampledFramebuffer=s.createFramebuffer(),A.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,A.__webglMultisampledFramebuffer);for(let B=0;B<D.length;B++){let X=D[B];A.__webglColorRenderbuffer[B]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,A.__webglColorRenderbuffer[B]);let tt=r.convert(X.format,X.colorSpace),vt=r.convert(X.type),_t=y(X.internalFormat,tt,vt,X.normalized,X.colorSpace,T.isXRRenderTarget===!0),bt=Et(T);s.renderbufferStorageMultisample(s.RENDERBUFFER,bt,_t,T.width,T.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+B,s.RENDERBUFFER,A.__webglColorRenderbuffer[B])}s.bindRenderbuffer(s.RENDERBUFFER,null),T.depthBuffer&&(A.__webglDepthRenderbuffer=s.createRenderbuffer(),Dt(A.__webglDepthRenderbuffer,T,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(F){e.bindTexture(s.TEXTURE_CUBE_MAP,L.__webglTexture),qt(s.TEXTURE_CUBE_MAP,_);for(let B=0;B<6;B++)if(_.mipmaps&&_.mipmaps.length>0)for(let X=0;X<_.mipmaps.length;X++)At(A.__webglFramebuffer[B][X],T,_,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+B,X);else At(A.__webglFramebuffer[B],T,_,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+B,0);m(_)&&M(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(V){for(let B=0,X=D.length;B<X;B++){let tt=D[B],vt=n.get(tt),_t=s.TEXTURE_2D;(T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(_t=T.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(_t,vt.__webglTexture),qt(_t,tt),At(A.__webglFramebuffer,T,tt,s.COLOR_ATTACHMENT0+B,_t,0),m(tt)&&M(_t)}e.unbindTexture()}else{let B=s.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(B=T.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(B,L.__webglTexture),qt(B,_),_.mipmaps&&_.mipmaps.length>0)for(let X=0;X<_.mipmaps.length;X++)At(A.__webglFramebuffer[X],T,_,s.COLOR_ATTACHMENT0,B,X);else At(A.__webglFramebuffer,T,_,s.COLOR_ATTACHMENT0,B,0);m(_)&&M(B),e.unbindTexture()}T.depthBuffer&&xt(T)}function Pt(T){let _=T.textures;for(let A=0,L=_.length;A<L;A++){let D=_[A];if(m(D)){let F=w(T),V=n.get(D).__webglTexture;e.bindTexture(F,V),M(F),e.unbindTexture()}}}let at=[],Ut=[];function pt(T){if(T.samples>0){if(Ot(T)===!1){let _=T.textures,A=T.width,L=T.height,D=s.COLOR_BUFFER_BIT,F=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,V=n.get(T),B=_.length>1;if(B)for(let tt=0;tt<_.length;tt++)e.bindFramebuffer(s.FRAMEBUFFER,V.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+tt,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,V.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+tt,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,V.__webglMultisampledFramebuffer);let X=T.texture.mipmaps;X&&X.length>0?e.bindFramebuffer(s.DRAW_FRAMEBUFFER,V.__webglFramebuffer[0]):e.bindFramebuffer(s.DRAW_FRAMEBUFFER,V.__webglFramebuffer);for(let tt=0;tt<_.length;tt++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(D|=s.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(D|=s.STENCIL_BUFFER_BIT)),B){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,V.__webglColorRenderbuffer[tt]);let vt=n.get(_[tt]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,vt,0)}s.blitFramebuffer(0,0,A,L,0,0,A,L,D,s.NEAREST),l===!0&&(at.length=0,Ut.length=0,at.push(s.COLOR_ATTACHMENT0+tt),T.depthBuffer&&T.storeMultisampledDepthBuffer===!1&&(at.push(F),Ut.push(F),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,Ut)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,at))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),B)for(let tt=0;tt<_.length;tt++){e.bindFramebuffer(s.FRAMEBUFFER,V.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+tt,s.RENDERBUFFER,V.__webglColorRenderbuffer[tt]);let vt=n.get(_[tt]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,V.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+tt,s.TEXTURE_2D,vt,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,V.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.storeMultisampledDepthBuffer===!1&&l){let _=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[_])}}}function Et(T){return Math.min(i.maxSamples,T.samples)}function Ot(T){let _=n.get(T);return T.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function k(T){let _=o.render.frame;h.get(T)!==_&&(h.set(T,_),T.update())}function jt(T,_){let A=T.colorSpace,L=T.format,D=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||A!==Wr&&A!==vi&&(he.getTransfer(A)===_e?(L!==mn||D!==wn)&&Bt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Qt("WebGLTextures: Unsupported texture color space:",A)),_}function $(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(c.width=T.naturalWidth||T.width,c.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(c.width=T.displayWidth,c.height=T.displayHeight):(c.width=T.width,c.height=T.height),c}this.allocateTextureUnit=J,this.resetTextureUnits=O,this.getTextureUnits=G,this.setTextureUnits=Y,this.setTexture2D=K,this.setTexture2DArray=Q,this.setTexture3D=et,this.setTextureCube=ot,this.rebindTextures=wt,this.setupRenderTarget=Ct,this.updateRenderTargetMipmap=Pt,this.updateMultisampleRenderTarget=pt,this.setupDepthRenderbuffer=xt,this.setupFrameBufferTexture=At,this.useMultisampledRTT=Ot,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function ix(s,t){function e(n,i=vi){let r,o=he.getTransfer(i);if(n===wn)return s.UNSIGNED_BYTE;if(n===zl)return s.UNSIGNED_SHORT_4_4_4_4;if(n===kl)return s.UNSIGNED_SHORT_5_5_5_1;if(n===qu)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Yu)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===Wu)return s.BYTE;if(n===Xu)return s.SHORT;if(n===rr)return s.UNSIGNED_SHORT;if(n===Bl)return s.INT;if(n===On)return s.UNSIGNED_INT;if(n===pn)return s.FLOAT;if(n===sn)return s.HALF_FLOAT;if(n===$u)return s.ALPHA;if(n===Zu)return s.RGB;if(n===mn)return s.RGBA;if(n===ni)return s.DEPTH_COMPONENT;if(n===Gi)return s.DEPTH_STENCIL;if(n===Vl)return s.RED;if(n===Lo)return s.RED_INTEGER;if(n===Hi)return s.RG;if(n===Gl)return s.RG_INTEGER;if(n===Hl)return s.RGBA_INTEGER;if(n===Do||n===No||n===Uo||n===Fo)if(o===_e)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Do)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===No)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Uo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Fo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Do)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===No)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Uo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Fo)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Wl||n===Xl||n===ql||n===Yl)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Wl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Xl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ql)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Yl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===$l||n===Zl||n===Jl||n===Kl||n===Ql||n===Oo||n===jl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===$l||n===Zl)return o===_e?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Jl)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Kl)return r.COMPRESSED_R11_EAC;if(n===Ql)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Oo)return r.COMPRESSED_RG11_EAC;if(n===jl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===tc||n===ec||n===nc||n===ic||n===sc||n===rc||n===oc||n===ac||n===lc||n===cc||n===hc||n===uc||n===dc||n===fc)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===tc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ec)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===nc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ic)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===sc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===rc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===oc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ac)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===lc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===cc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===hc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===uc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===dc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===fc)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===pc||n===mc||n===gc)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===pc)return o===_e?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===mc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===gc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===xc||n===_c||n===Bo||n===vc)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===xc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===_c)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Bo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===vc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===or?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:e}}function M1(s,t){function e(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,ap(s)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function i(g,m,M,w,y){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(g,m):m.isMeshLambertMaterial?(r(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(g,m),d(g,m)):m.isMeshPhongMaterial?(r(g,m),h(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(g,m),u(g,m),m.isMeshPhysicalMaterial&&f(g,m,y)):m.isMeshMatcapMaterial?(r(g,m),p(g,m)):m.isMeshDepthMaterial?r(g,m):m.isMeshDistanceMaterial?(r(g,m),x(g,m)):m.isMeshNormalMaterial?r(g,m):m.isLineBasicMaterial?(o(g,m),m.isLineDashedMaterial&&a(g,m)):m.isPointsMaterial?l(g,m,M,w):m.isSpriteMaterial?c(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,e(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===nn&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,e(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===nn&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,e(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,e(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);let M=t.get(m),w=M.envMap,y=M.envMapRotation;w&&(g.envMap.value=w,g.envMapRotation.value.setFromMatrix4(y1.makeRotationFromEuler(y)).transpose(),w.isCubeTexture&&w.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(sx),g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,g.aoMapTransform))}function o(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform))}function a(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function l(g,m,M,w){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*M,g.scale.value=w*.5,m.map&&(g.map.value=m.map,e(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function c(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function d(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function u(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,M){g.ior.value=m.ior,m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===nn&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.retroreflectivity>0&&(g.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=M.texture,g.transmissionSamplerSize.value.set(M.width,M.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,m){m.matcap&&(g.matcap.value=m.matcap)}function x(g,m){let M=t.get(m).light;g.referencePosition.value.setFromMatrixPosition(M.matrixWorld),g.nearDistance.value=M.shadow.camera.near,g.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function S1(s,t,e,n){let i={},r={},o=[],a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,S){let b=S.program;n.uniformBlockBinding(y,b)}function c(y,S){let b=i[y.id];b===void 0&&(g(y),b=h(y),i[y.id]=b,y.addEventListener("dispose",M));let R=S.program;n.updateUBOMapping(y,R);let v=t.render.frame;r[y.id]!==v&&(u(y),r[y.id]=v)}function h(y){let S=d();y.__bindingPointIndex=S;let b=s.createBuffer(),R=y.__size,v=y.usage;return s.bindBuffer(s.UNIFORM_BUFFER,b),s.bufferData(s.UNIFORM_BUFFER,R,v),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,S,b),b}function d(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return Qt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){let S=i[y.id],b=y.uniforms,R=y.__cache;s.bindBuffer(s.UNIFORM_BUFFER,S);for(let v=0,C=b.length;v<C;v++){let I=b[v];if(Array.isArray(I))for(let z=0,N=I.length;z<N;z++)f(I[z],v,z,R);else f(I,v,0,R)}s.bindBuffer(s.UNIFORM_BUFFER,null)}function f(y,S,b,R){if(x(y,S,b,R)===!0){let v=y.__offset,C=y.value;if(Array.isArray(C)){let I=0;for(let z=0;z<C.length;z++){let N=C[z],O=m(N);p(N,y.__data,I),typeof N!="number"&&typeof N!="boolean"&&!N.isMatrix3&&!ArrayBuffer.isView(N)&&(I+=O.storage/Float32Array.BYTES_PER_ELEMENT)}}else p(C,y.__data,0);s.bufferSubData(s.UNIFORM_BUFFER,v,y.__data)}}function p(y,S,b){typeof y=="number"||typeof y=="boolean"?S[0]=y:y.isMatrix3?(S[0]=y.elements[0],S[1]=y.elements[1],S[2]=y.elements[2],S[3]=0,S[4]=y.elements[3],S[5]=y.elements[4],S[6]=y.elements[5],S[7]=0,S[8]=y.elements[6],S[9]=y.elements[7],S[10]=y.elements[8],S[11]=0):ArrayBuffer.isView(y)?S.set(new y.constructor(y.buffer,y.byteOffset,S.length)):y.toArray(S,b)}function x(y,S,b,R){let v=y.value,C=S+"_"+b;if(R[C]===void 0)return typeof v=="number"||typeof v=="boolean"?R[C]=v:ArrayBuffer.isView(v)?R[C]=v.slice():R[C]=v.clone(),!0;{let I=R[C];if(typeof v=="number"||typeof v=="boolean"){if(I!==v)return R[C]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(I.equals(v)===!1)return I.copy(v),!0}}return!1}function g(y){let S=y.uniforms,b=0,R=16;for(let C=0,I=S.length;C<I;C++){let z=Array.isArray(S[C])?S[C]:[S[C]];for(let N=0,O=z.length;N<O;N++){let G=z[N],Y=Array.isArray(G.value)?G.value:[G.value];for(let J=0,rt=Y.length;J<rt;J++){let K=Y[J],Q=m(K),et=b%R,ot=et%Q.boundary,Lt=et+ot;b+=ot,Lt!==0&&R-Lt<Q.storage&&(b+=R-Lt),G.__data=new Float32Array(Q.storage/Float32Array.BYTES_PER_ELEMENT),G.__offset=b,b+=Q.storage}}}let v=b%R;return v>0&&(b+=R-v),y.__size=b,y.__cache={},this}function m(y){let S={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(S.boundary=4,S.storage=4):y.isVector2?(S.boundary=8,S.storage=8):y.isVector3||y.isColor?(S.boundary=16,S.storage=12):y.isVector4?(S.boundary=16,S.storage=16):y.isMatrix3?(S.boundary=48,S.storage=48):y.isMatrix4?(S.boundary=64,S.storage=64):y.isTexture?Bt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(y)?(S.boundary=16,S.storage=y.byteLength):Bt("WebGLRenderer: Unsupported uniform value type.",y),S}function M(y){let S=y.target;S.removeEventListener("dispose",M);let b=o.indexOf(S.__bindingPointIndex);o.splice(b,1),s.deleteBuffer(i[S.id]),delete i[S.id],delete r[S.id]}function w(){for(let y in i)s.deleteBuffer(i[y]);o=[],i={},r={}}return{bind:l,update:c,dispose:w}}function w1(){return Mi===null&&(Mi=new Sn(b1,16,16,Hi,sn),Mi.name="DFG_LUT",Mi.minFilter=Ce,Mi.magFilter=Ce,Mi.wrapS=Mn,Mi.wrapT=Mn,Mi.generateMipmaps=!1,Mi.needsUpdate=!0),Mi}var Bv,zv,kv,Vv,Gv,Hv,Wv,Xv,qv,Yv,$v,Zv,Jv,Kv,Qv,jv,ty,ey,ny,iy,sy,ry,oy,ay,ly,cy,hy,uy,dy,fy,py,my,gy,xy,_y,vy,yy,My,Sy,by,wy,Ty,Ay,Ey,Cy,Ry,Py,Iy,Ly,Dy,Ny,Uy,Fy,Oy,By,zy,ky,Vy,Gy,Hy,Wy,Xy,qy,Yy,$y,Zy,Jy,Ky,Qy,jy,tM,eM,nM,iM,sM,rM,oM,aM,lM,cM,hM,uM,dM,fM,pM,mM,gM,xM,_M,vM,yM,MM,SM,bM,wM,TM,AM,EM,CM,RM,PM,IM,LM,DM,NM,UM,FM,OM,BM,zM,kM,VM,GM,HM,WM,XM,qM,YM,$M,ZM,JM,KM,QM,jM,tS,eS,nS,iS,sS,rS,oS,aS,lS,cS,hS,uS,dS,fS,pS,mS,gS,xS,le,Vt,li,ju,_S,Qg,ko,wS,TS,AS,wc,Pg,xp,_p,vp,yp,ES,lr,cr,Ec,BS,jg,bp,tx,ex,nx,Ng,Ug,Fg,Og,Bg,wp,Tp,Ap,Mp,Vo,Eb,Cb,Vg,Lb,td,Bb,zb,Vb,Hb,Xb,Yb,Zb,jb,Cp,Rp,a1,u1,d1,f1,p1,Jg,Tc,Sp,_1,v1,Pp,Ip,y1,sx,b1,Mi,Cc,Si=Le(()=>{gp();gp();Bv=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,zv=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,kv=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Vv=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Gv=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Hv=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Wv=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Xv=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,qv=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Yv=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,$v=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Zv=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Jv=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Kv=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Qv=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,jv=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,ty=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,ey=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,ny=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,iy=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,sy=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,ry=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,oy=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,ay=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ly=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,cy=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,hy=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,uy=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,dy=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,fy=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,py="gl_FragColor = linearToOutputTexel( gl_FragColor );",my=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,gy=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,xy=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,_y=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,vy=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,yy=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,My=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Sy=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,by=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,wy=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Ty=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Ay=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ey=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Cy=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Ry=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Py=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,Iy=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Ly=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Dy=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Ny=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Uy=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Fy=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Oy=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,By=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,zy=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ky=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Vy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Gy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Hy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Wy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Xy=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,qy=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Yy=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,$y=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Zy=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Jy=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ky=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Qy=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,jy=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,tM=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,eM=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,nM=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,iM=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,sM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,rM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,oM=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,aM=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,lM=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,cM=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,hM=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,uM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,dM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,fM=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,pM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,mM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,gM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,xM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,_M=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,vM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,yM=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,MM=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,SM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,bM=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,wM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,TM=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,AM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,EM=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,CM=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,RM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,PM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,IM=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,LM=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,DM=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,NM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,UM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,FM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,OM=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,BM=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,zM=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,kM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,VM=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,GM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,HM=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,WM=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,XM=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,qM=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,YM=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,$M=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,ZM=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,JM=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,KM=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,QM=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,jM=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,tS=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,eS=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,nS=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,iS=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,sS=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,rS=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,oS=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,aS=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,lS=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,cS=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hS=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,uS=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dS=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,fS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,pS=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,mS=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gS=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,xS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,le={alphahash_fragment:Bv,alphahash_pars_fragment:zv,alphamap_fragment:kv,alphamap_pars_fragment:Vv,alphatest_fragment:Gv,alphatest_pars_fragment:Hv,aomap_fragment:Wv,aomap_pars_fragment:Xv,batching_pars_vertex:qv,batching_vertex:Yv,begin_vertex:$v,beginnormal_vertex:Zv,bsdfs:Jv,iridescence_fragment:Kv,bumpmap_pars_fragment:Qv,clipping_planes_fragment:jv,clipping_planes_pars_fragment:ty,clipping_planes_pars_vertex:ey,clipping_planes_vertex:ny,color_fragment:iy,color_pars_fragment:sy,color_pars_vertex:ry,color_vertex:oy,common:ay,cube_uv_reflection_fragment:ly,defaultnormal_vertex:cy,displacementmap_pars_vertex:hy,displacementmap_vertex:uy,emissivemap_fragment:dy,emissivemap_pars_fragment:fy,colorspace_fragment:py,colorspace_pars_fragment:my,envmap_fragment:gy,envmap_common_pars_fragment:xy,envmap_pars_fragment:_y,envmap_pars_vertex:vy,envmap_physical_pars_fragment:Py,envmap_vertex:yy,fog_vertex:My,fog_pars_vertex:Sy,fog_fragment:by,fog_pars_fragment:wy,gradientmap_pars_fragment:Ty,lightmap_pars_fragment:Ay,lights_lambert_fragment:Ey,lights_lambert_pars_fragment:Cy,lights_pars_begin:Ry,lights_toon_fragment:Iy,lights_toon_pars_fragment:Ly,lights_phong_fragment:Dy,lights_phong_pars_fragment:Ny,lights_physical_fragment:Uy,lights_physical_pars_fragment:Fy,lights_fragment_begin:Oy,lights_fragment_maps:By,lights_fragment_end:zy,lightprobes_pars_fragment:ky,logdepthbuf_fragment:Vy,logdepthbuf_pars_fragment:Gy,logdepthbuf_pars_vertex:Hy,logdepthbuf_vertex:Wy,map_fragment:Xy,map_pars_fragment:qy,map_particle_fragment:Yy,map_particle_pars_fragment:$y,metalnessmap_fragment:Zy,metalnessmap_pars_fragment:Jy,morphinstance_vertex:Ky,morphcolor_vertex:Qy,morphnormal_vertex:jy,morphtarget_pars_vertex:tM,morphtarget_vertex:eM,normal_fragment_begin:nM,normal_fragment_maps:iM,normal_pars_fragment:sM,normal_pars_vertex:rM,normal_vertex:oM,normalmap_pars_fragment:aM,clearcoat_normal_fragment_begin:lM,clearcoat_normal_fragment_maps:cM,clearcoat_pars_fragment:hM,iridescence_pars_fragment:uM,opaque_fragment:dM,packing:fM,premultiplied_alpha_fragment:pM,project_vertex:mM,dithering_fragment:gM,dithering_pars_fragment:xM,roughnessmap_fragment:_M,roughnessmap_pars_fragment:vM,shadowmap_pars_fragment:yM,shadowmap_pars_vertex:MM,shadowmap_vertex:SM,shadowmask_pars_fragment:bM,skinbase_vertex:wM,skinning_pars_vertex:TM,skinning_vertex:AM,skinnormal_vertex:EM,specularmap_fragment:CM,specularmap_pars_fragment:RM,tonemapping_fragment:PM,tonemapping_pars_fragment:IM,transmission_fragment:LM,transmission_pars_fragment:DM,uv_pars_fragment:NM,uv_pars_vertex:UM,uv_vertex:FM,worldpos_vertex:OM,background_vert:BM,background_frag:zM,backgroundCube_vert:kM,backgroundCube_frag:VM,cube_vert:GM,cube_frag:HM,depth_vert:WM,depth_frag:XM,distance_vert:qM,distance_frag:YM,equirect_vert:$M,equirect_frag:ZM,linedashed_vert:JM,linedashed_frag:KM,meshbasic_vert:QM,meshbasic_frag:jM,meshlambert_vert:tS,meshlambert_frag:eS,meshmatcap_vert:nS,meshmatcap_frag:iS,meshnormal_vert:sS,meshnormal_frag:rS,meshphong_vert:oS,meshphong_frag:aS,meshphysical_vert:lS,meshphysical_frag:cS,meshtoon_vert:hS,meshtoon_frag:uS,points_vert:dS,points_frag:fS,shadow_vert:pS,shadow_frag:mS,sprite_vert:gS,sprite_frag:xS},Vt={common:{diffuse:{value:new zt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new oe},alphaMap:{value:null},alphaMapTransform:{value:new oe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new oe}},envmap:{envMap:{value:null},envMapRotation:{value:new oe},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new oe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new oe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new oe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new oe},normalScale:{value:new Mt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new oe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new oe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new oe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new oe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new zt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new U},probesMax:{value:new U},probesResolution:{value:new U}},points:{diffuse:{value:new zt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new oe},alphaTest:{value:0},uvTransform:{value:new oe}},sprite:{diffuse:{value:new zt(16777215)},opacity:{value:1},center:{value:new Mt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new oe},alphaMap:{value:null},alphaMapTransform:{value:new oe},alphaTest:{value:0}}},li={basic:{uniforms:gn([Vt.common,Vt.specularmap,Vt.envmap,Vt.aomap,Vt.lightmap,Vt.fog]),vertexShader:le.meshbasic_vert,fragmentShader:le.meshbasic_frag},lambert:{uniforms:gn([Vt.common,Vt.specularmap,Vt.envmap,Vt.aomap,Vt.lightmap,Vt.emissivemap,Vt.bumpmap,Vt.normalmap,Vt.displacementmap,Vt.fog,Vt.lights,{emissive:{value:new zt(0)},envMapIntensity:{value:1}}]),vertexShader:le.meshlambert_vert,fragmentShader:le.meshlambert_frag},phong:{uniforms:gn([Vt.common,Vt.specularmap,Vt.envmap,Vt.aomap,Vt.lightmap,Vt.emissivemap,Vt.bumpmap,Vt.normalmap,Vt.displacementmap,Vt.fog,Vt.lights,{emissive:{value:new zt(0)},specular:{value:new zt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:le.meshphong_vert,fragmentShader:le.meshphong_frag},standard:{uniforms:gn([Vt.common,Vt.envmap,Vt.aomap,Vt.lightmap,Vt.emissivemap,Vt.bumpmap,Vt.normalmap,Vt.displacementmap,Vt.roughnessmap,Vt.metalnessmap,Vt.fog,Vt.lights,{emissive:{value:new zt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:le.meshphysical_vert,fragmentShader:le.meshphysical_frag},toon:{uniforms:gn([Vt.common,Vt.aomap,Vt.lightmap,Vt.emissivemap,Vt.bumpmap,Vt.normalmap,Vt.displacementmap,Vt.gradientmap,Vt.fog,Vt.lights,{emissive:{value:new zt(0)}}]),vertexShader:le.meshtoon_vert,fragmentShader:le.meshtoon_frag},matcap:{uniforms:gn([Vt.common,Vt.bumpmap,Vt.normalmap,Vt.displacementmap,Vt.fog,{matcap:{value:null}}]),vertexShader:le.meshmatcap_vert,fragmentShader:le.meshmatcap_frag},points:{uniforms:gn([Vt.points,Vt.fog]),vertexShader:le.points_vert,fragmentShader:le.points_frag},dashed:{uniforms:gn([Vt.common,Vt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:le.linedashed_vert,fragmentShader:le.linedashed_frag},depth:{uniforms:gn([Vt.common,Vt.displacementmap]),vertexShader:le.depth_vert,fragmentShader:le.depth_frag},normal:{uniforms:gn([Vt.common,Vt.bumpmap,Vt.normalmap,Vt.displacementmap,{opacity:{value:1}}]),vertexShader:le.meshnormal_vert,fragmentShader:le.meshnormal_frag},sprite:{uniforms:gn([Vt.sprite,Vt.fog]),vertexShader:le.sprite_vert,fragmentShader:le.sprite_frag},background:{uniforms:{uvTransform:{value:new oe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:le.background_vert,fragmentShader:le.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new oe}},vertexShader:le.backgroundCube_vert,fragmentShader:le.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:le.cube_vert,fragmentShader:le.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:le.equirect_vert,fragmentShader:le.equirect_frag},distance:{uniforms:gn([Vt.common,Vt.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:le.distance_vert,fragmentShader:le.distance_frag},shadow:{uniforms:gn([Vt.lights,Vt.fog,{color:{value:new zt(0)},opacity:{value:1}}]),vertexShader:le.shadow_vert,fragmentShader:le.shadow_frag}};li.physical={uniforms:gn([li.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new oe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new oe},clearcoatNormalScale:{value:new Mt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new oe},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new oe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new oe},sheen:{value:0},sheenColor:{value:new zt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new oe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new oe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new oe},transmissionSamplerSize:{value:new Mt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new oe},attenuationDistance:{value:0},attenuationColor:{value:new zt(0)},specularColor:{value:new zt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new oe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new oe},anisotropyVector:{value:new Mt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new oe}}]),vertexShader:le.meshphysical_vert,fragmentShader:le.meshphysical_frag};ju={r:0,b:0,g:0},_S=new re,Qg=new oe;Qg.set(-1,0,0,0,1,0,0,0,1);ko=4,wS=6,TS=20,AS=256,wc=new xi,Pg=new zt,xp=null,_p=0,vp=0,yp=!1,ES=new U,lr=new U,cr=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,i=100,r={}){let{size:o=256,position:a=ES}=r;xp=this._renderer.getRenderTarget(),_p=this._renderer.getActiveCubeFace(),vp=this._renderer.getActiveMipmapLevel(),yp=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,i,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Dg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Lg(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(xp,_p,vp),this._renderer.xr.enabled=yp,t.scissorTest=!1,zo(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===oi||t.mapping===Vi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),xp=this._renderer.getRenderTarget(),_p=this._renderer.getActiveCubeFace(),vp=this._renderer.getActiveMipmapLevel(),yp=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Ce,minFilter:Ce,generateMipmaps:!1,type:sn,format:mn,colorSpace:Wr,depthBuffer:!1},i=Ig(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ig(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=CS(r)),this._blurMaterial=PS(r,t,e),this._ggxMaterial=RS(r,t,e)}return i}_compileMaterial(t){let e=new ve(new se,t);this._renderer.compile(e,wc)}_sceneToCubeUV(t,e,n,i,r){let l=new Be(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Pg),d.toneMapping=Zn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(i),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new ve(new pi,new Nn({name:"PMREM.Background",side:nn,depthWrite:!1,depthTest:!1})));let x=this._backgroundBox,g=x.material,m=!1,M=t.background;M?M.isColor&&(g.color.copy(M),t.background=null,m=!0):(g.color.copy(Pg),m=!0);for(let w=0;w<6;w++){let y=w%3;y===0?(l.up.set(0,c[w],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[w],r.y,r.z)):y===1?(l.up.set(0,0,c[w]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[w],r.z)):(l.up.set(0,c[w],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[w]));let S=this._cubeSize;zo(i,y*S,w>2?S:0,S,S),d.setRenderTarget(i),m&&d.render(x,l),d.render(t,l)}d.toneMapping=f,d.autoClear=u,t.background=M}_textureToCubeUV(t,e){let n=this._renderer,i=t.mapping===oi||t.mapping===Vi;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=Dg()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Lg());let r=i?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;zo(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,wc)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let i=this._lodMeshes.length;for(let r=1;r<i;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let i=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=c*1.25,f=d*u,{_lodMax:p}=this,x=this._sizeLods[n],g=3*x*(n>p-ko?n-p+ko:0),m=4*(this._cubeSize-x);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=p-e,zo(r,g,m,3*x,2*x),i.setRenderTarget(r),i.render(a,wc),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=p-n,zo(t,g,m,3*x,2*x),i.setRenderTarget(t),i.render(a,wc)}_blur(t,e,n,i){let r=this._pingPongRenderTarget,o=Math.min(i,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,o),this._blurPass(r,t,n,n,o)}_blurPass(t,e,n,i,r){let o=this._renderer,a=this._blurMaterial,l=this._lodMeshes[i];l.material=a;let c=a.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[i],d=3*h*(i>this._lodMax-ko?i-this._lodMax+ko:0),u=4*(this._cubeSize-h);zo(e,d,u,3*h,2*h),o.setRenderTarget(e),o.render(l,wc)}};Ec=class extends Ne{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new as(i),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new pi(5,5,5),r=new Pe({name:"CubemapFromEquirect",uniforms:ar(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:nn,blending:Fn});r.uniforms.tEquirect.value=e;let o=new ve(i,r),a=e.minFilter;return e.minFilter===ai&&(e.minFilter=Ce),new Il(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,i=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,i);t.setRenderTarget(r)}};BS={[bo]:"LINEAR_TONE_MAPPING",[wo]:"REINHARD_TONE_MAPPING",[To]:"CINEON_TONE_MAPPING",[ms]:"ACES_FILMIC_TONE_MAPPING",[Eo]:"AGX_TONE_MAPPING",[Co]:"NEUTRAL_TONE_MAPPING",[Ao]:"CUSTOM_TONE_MAPPING"};jg=new ke,bp=new Fi(1,1),tx=new Fs,ex=new Os,nx=new as,Ng=[],Ug=[],Fg=new Float32Array(16),Og=new Float32Array(9),Bg=new Float32Array(4);wp=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=rb(e.type)}},Tp=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Tb(e.type)}},Ap=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let i=this.seq;for(let r=0,o=i.length;r!==o;++r){let a=i[r];a.setValue(t,e[a.id],n)}}},Mp=/(\w+)(\])?(\[|\.)?/g;Vo=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);Ab(a,l,this)}let i=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?i.push(o):r.push(o);i.length>0&&(this.seq=i.concat(r))}setValue(t,e,n,i){let r=this.map[e];r!==void 0&&r.setValue(t,n,i)}setOptional(t,e,n){let i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,i)}}static seqWithValue(t,e){let n=[];for(let i=0,r=t.length;i!==r;++i){let o=t[i];o.id in e&&n.push(o)}return n}};Eb=37297,Cb=0;Vg=new oe;Lb={[bo]:"Linear",[wo]:"Reinhard",[To]:"Cineon",[ms]:"ACESFilmic",[Eo]:"AgX",[Co]:"Neutral",[Ao]:"Custom"};td=new U;Bb=/^[ \t]*#include +<([\w\d./]+)>/gm;zb=new Map;Vb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;Hb={[Mo]:"SHADOWMAP_TYPE_PCF",[er]:"SHADOWMAP_TYPE_VSM"};Xb={[oi]:"ENVMAP_TYPE_CUBE",[Vi]:"ENVMAP_TYPE_CUBE",[ir]:"ENVMAP_TYPE_CUBE_UV"};Yb={[Vi]:"ENVMAP_MODE_REFRACTION"};Zb={[So]:"ENVMAP_BLENDING_MULTIPLY",[Hf]:"ENVMAP_BLENDING_MIX",[Wf]:"ENVMAP_BLENDING_ADD"};jb=0,Cp=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let i=this._getShaderCacheForMaterial(t);return i.has(e)===!1&&(i.add(e),e.usedTimes++),i.has(n)===!1&&(i.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new Rp(t),e.set(t,n)),n}},Rp=class{constructor(t){this.id=jb++,this.code=t,this.usedTimes=0}};a1=0;u1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,d1=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,f1=[new U(1,0,0),new U(-1,0,0),new U(0,1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1)],p1=[new U(0,-1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1),new U(0,-1,0),new U(0,-1,0)],Jg=new re,Tc=new U,Sp=new U;_1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,v1=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Pp=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new to(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Pe({vertexShader:_1,fragmentShader:v1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ve(new Ys(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Ip=class extends Rn{constructor(t,e){super();let n=this,i=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,p=null,x=typeof XRWebGLBinding<"u",g=new Pp,m={},M=e.getContextAttributes(),w=null,y=null,S=[],b=[],R=new Mt,v=null,C=null,I=new Be;I.viewport=new be;let z=new Be;z.viewport=new be;let N=[I,z],O=new Ll,G=null,Y=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(st){let ht=S[st];return ht===void 0&&(ht=new zs,S[st]=ht),ht.getTargetRaySpace()},this.getControllerGrip=function(st){let ht=S[st];return ht===void 0&&(ht=new zs,S[st]=ht),ht.getGripSpace()},this.getHand=function(st){let ht=S[st];return ht===void 0&&(ht=new zs,S[st]=ht),ht.getHandSpace()};function J(st){let ht=b.indexOf(st.inputSource);if(ht===-1)return;let dt=S[ht];dt!==void 0&&(dt.update(st.inputSource,st.frame,c||o),dt.dispatchEvent({type:st.type,data:st.inputSource}))}function rt(){i.removeEventListener("select",J),i.removeEventListener("selectstart",J),i.removeEventListener("selectend",J),i.removeEventListener("squeeze",J),i.removeEventListener("squeezestart",J),i.removeEventListener("squeezeend",J),i.removeEventListener("end",rt),i.removeEventListener("inputsourceschange",K);for(let st=0;st<S.length;st++){let ht=b[st];ht!==null&&(b[st]=null,S[st].disconnect(ht))}G=null,Y=null,g.reset();for(let st in m)delete m[st];if(t.setRenderTarget(w),f=null,u=null,d=null,i=null,y=null,Zt.stop(),n.isPresenting=!1,t.setPixelRatio(v),t.setSize(R.width,R.height,!1),C!==null){let st=C.camera;st.fov=C.fov,st.zoom=C.zoom,st.updateProjectionMatrix(),C=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(st){r=st,n.isPresenting===!0&&Bt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(st){a=st,n.isPresenting===!0&&Bt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(st){c=st},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&x&&(d=new XRWebGLBinding(i,e)),d},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(st){if(i=st,i!==null){if(w=t.getRenderTarget(),i.addEventListener("select",J),i.addEventListener("selectstart",J),i.addEventListener("selectend",J),i.addEventListener("squeeze",J),i.addEventListener("squeezestart",J),i.addEventListener("squeezeend",J),i.addEventListener("end",rt),i.addEventListener("inputsourceschange",K),M.xrCompatible!==!0&&await e.makeXRCompatible(),v=t.getPixelRatio(),t.getSize(R),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let dt=null,Tt=null,At=null;M.depth&&(At=M.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,dt=M.stencil?Gi:ni,Tt=M.stencil?or:On);let Dt={colorFormat:e.RGBA8,depthFormat:At,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Dt),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),y=new Ne(u.textureWidth,u.textureHeight,{format:mn,type:wn,depthTexture:new Fi(u.textureWidth,u.textureHeight,Tt,void 0,void 0,void 0,void 0,void 0,void 0,dt),stencilBuffer:M.stencil,colorSpace:t.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let dt={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(i,e,dt),i.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Ne(f.framebufferWidth,f.framebufferHeight,{format:mn,type:wn,colorSpace:t.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await i.requestReferenceSpace(a),Zt.setContext(i),Zt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function K(st){for(let ht=0;ht<st.removed.length;ht++){let dt=st.removed[ht],Tt=b.indexOf(dt);Tt>=0&&(b[Tt]=null,S[Tt].disconnect(dt))}for(let ht=0;ht<st.added.length;ht++){let dt=st.added[ht],Tt=b.indexOf(dt);if(Tt===-1){for(let Dt=0;Dt<S.length;Dt++)if(Dt>=b.length){b.push(dt),Tt=Dt;break}else if(b[Dt]===null){b[Dt]=dt,Tt=Dt;break}if(Tt===-1)break}let At=S[Tt];At&&At.connect(dt)}}let Q=new U,et=new U;function ot(st,ht,dt){Q.setFromMatrixPosition(ht.matrixWorld),et.setFromMatrixPosition(dt.matrixWorld);let Tt=Q.distanceTo(et),At=ht.projectionMatrix.elements,Dt=dt.projectionMatrix.elements,ne=At[14]/(At[10]-1),xt=At[14]/(At[10]+1),wt=(At[9]+1)/At[5],Ct=(At[9]-1)/At[5],Pt=(At[8]-1)/At[0],at=(Dt[8]+1)/Dt[0],Ut=ne*Pt,pt=ne*at,Et=Tt/(-Pt+at),Ot=Et*-Pt;if(ht.matrixWorld.decompose(st.position,st.quaternion,st.scale),st.translateX(Ot),st.translateZ(Et),st.matrixWorld.compose(st.position,st.quaternion,st.scale),st.matrixWorldInverse.copy(st.matrixWorld).invert(),At[10]===-1)st.projectionMatrix.copy(ht.projectionMatrix),st.projectionMatrixInverse.copy(ht.projectionMatrixInverse);else{let k=ne+Et,jt=xt+Et,$=Ut-Ot,T=pt+(Tt-Ot),_=wt*xt/jt*k,A=Ct*xt/jt*k;st.projectionMatrix.makePerspective($,T,_,A,k,jt),st.projectionMatrixInverse.copy(st.projectionMatrix).invert()}}function Lt(st,ht){ht===null?st.matrixWorld.copy(st.matrix):st.matrixWorld.multiplyMatrices(ht.matrixWorld,st.matrix),st.matrixWorldInverse.copy(st.matrixWorld).invert()}this.updateCamera=function(st){if(i===null)return;let ht=st.near,dt=st.far;g.texture!==null&&(g.depthNear>0&&(ht=g.depthNear),g.depthFar>0&&(dt=g.depthFar)),O.near=z.near=I.near=ht,O.far=z.far=I.far=dt,(G!==O.near||Y!==O.far)&&(i.updateRenderState({depthNear:O.near,depthFar:O.far}),G=O.near,Y=O.far),O.layers.mask=st.layers.mask|6,I.layers.mask=O.layers.mask&-5,z.layers.mask=O.layers.mask&-3;let Tt=st.parent,At=O.cameras;Lt(O,Tt);for(let Dt=0;Dt<At.length;Dt++)Lt(At[Dt],Tt);At.length===2?ot(O,I,z):O.projectionMatrix.copy(I.projectionMatrix),C===null&&st.isPerspectiveCamera&&(C={camera:st,fov:st.fov,zoom:st.zoom}),It(st,O,Tt)};function It(st,ht,dt){dt===null?st.matrix.copy(ht.matrixWorld):(st.matrix.copy(dt.matrixWorld),st.matrix.invert(),st.matrix.multiply(ht.matrixWorld)),st.matrix.decompose(st.position,st.quaternion,st.scale),st.updateMatrixWorld(!0),st.projectionMatrix.copy(ht.projectionMatrix),st.projectionMatrixInverse.copy(ht.projectionMatrixInverse),st.isPerspectiveCamera&&(st.fov=Us*2*Math.atan(1/st.projectionMatrix.elements[5]),st.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(st){l=st,u!==null&&(u.fixedFoveation=st),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=st)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(O)},this.getCameraTexture=function(st){return m[st]};let Wt=null;function qt(st,ht){if(h=ht.getViewerPose(c||o),p=ht,h!==null){let dt=h.views;f!==null&&(t.setRenderTargetFramebuffer(y,f.framebuffer),t.setRenderTarget(y));let Tt=!1;dt.length!==O.cameras.length&&(O.cameras.length=0,Tt=!0);for(let xt=0;xt<dt.length;xt++){let wt=dt[xt],Ct=null;if(f!==null)Ct=f.getViewport(wt);else{let at=d.getViewSubImage(u,wt);Ct=at.viewport,xt===0&&(t.setRenderTargetTextures(y,at.colorTexture,at.depthStencilTexture),t.setRenderTarget(y))}let Pt=N[xt];Pt===void 0&&(Pt=new Be,Pt.layers.enable(xt),Pt.viewport=new be,N[xt]=Pt),Pt.matrix.fromArray(wt.transform.matrix),Pt.matrix.decompose(Pt.position,Pt.quaternion,Pt.scale),Pt.projectionMatrix.fromArray(wt.projectionMatrix),Pt.projectionMatrixInverse.copy(Pt.projectionMatrix).invert(),Pt.viewport.set(Ct.x,Ct.y,Ct.width,Ct.height),xt===0&&(O.matrix.copy(Pt.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),Tt===!0&&O.cameras.push(Pt)}let At=i.enabledFeatures;if(At&&At.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&x){d=n.getBinding();let xt=d.getDepthInformation(dt[0]);xt&&xt.isValid&&xt.texture&&g.init(xt,i.renderState)}if(At&&At.includes("camera-access")&&x){t.state.unbindTexture(),d=n.getBinding();for(let xt=0;xt<dt.length;xt++){let wt=dt[xt].camera;if(wt){let Ct=m[wt];Ct||(Ct=new to,m[wt]=Ct);let Pt=d.getCameraImage(wt);Ct.sourceTexture=Pt}}}}for(let dt=0;dt<S.length;dt++){let Tt=b[dt],At=S[dt];Tt!==null&&At!==void 0&&At.update(Tt,ht,c||o)}Wt&&Wt(st,ht),ht.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ht}),p=null}let Zt=new Kg;Zt.setAnimationLoop(qt),this.setAnimationLoop=function(st){Wt=st},this.dispose=function(){}}},y1=new re,sx=new oe;sx.set(-1,0,0,0,1,0,0,0,1);b1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Mi=null;Cc=class{constructor(t={}){let{canvas:e=sp(),context:n=null,depth:i=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=wn}=t;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=o;let x=f,g=new Set([Hl,Gl,Lo]),m=new Set([wn,On,rr,or,zl,kl]),M=new Uint32Array(4),w=new Int32Array(4),y=new U,S=null,b=null,R=[],v=[],C=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Zn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let I=this,z=!1,N=null,O=null,G=null,Y=null;this._outputColorSpace=Ze;let J=0,rt=0,K=null,Q=-1,et=null,ot=new be,Lt=new be,It=null,Wt=new zt(0),qt=0,Zt=e.width,st=e.height,ht=1,dt=null,Tt=null,At=new be(0,0,Zt,st),Dt=new be(0,0,Zt,st),ne=!1,xt=new fi,wt=!1,Ct=!1,Pt=new re,at=new U,Ut=new be,pt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Et=!1;function Ot(){return K===null?ht:1}let k=n;function jt(E,q){return e.getContext(E,q)}let $,T,_,A,L,D,F,V,B,X,tt,vt,_t,bt,j,mt,Rt,P,ct,Z,gt,yt,lt;try{let E={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",St,!1),e.addEventListener("webglcontextrestored",Ft,!1),e.addEventListener("webglcontextcreationerror",te,!1),k===null){let q="webgl2";if(k=jt(q,E),k===null)throw jt(q)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Nt()}catch(E){throw e.removeEventListener("webglcontextlost",St,!1),e.removeEventListener("webglcontextrestored",Ft,!1),e.removeEventListener("webglcontextcreationerror",te,!1),Qt("WebGLRenderer: "+E.message),E}function Nt(){$=new LS(k),$.init(),gt=new ix(k,$),T=new SS(k,$,t,gt),_=new g1(k,$),T.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),O=k.createFramebuffer(),G=k.createFramebuffer(),Y=k.createFramebuffer(),A=new US(k),L=new n1,D=new x1(k,$,_,L,T,gt,A),F=new IS(I),V=new Ov(k),yt=new yS(k,V),B=new DS(k,V,A,yt),X=new OS(k,B,V,yt,A),P=new FS(k,T,D),j=new bS(L),tt=new e1(I,F,$,T,yt,j),vt=new M1(I,L),_t=new s1,bt=new h1($),Rt=new vS(I,F,_,X,p,l),mt=new m1(I,X,T),lt=new S1(k,A,T,_),ct=new MS(k,$,A),Z=new NS(k,$,A),A.programs=tt.programs,I.capabilities=T,I.extensions=$,I.properties=L,I.renderLists=_t,I.shadowMap=mt,I.state=_,I.info=A}x!==wn&&(C=new zS(x,e.width,e.height,a,i,r));let W=new Ip(I,k);this.xr=W,this.getContext=function(){return k},this.getContextAttributes=function(){return k.getContextAttributes()},this.forceContextLoss=function(){let E=$.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){let E=$.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return ht},this.setPixelRatio=function(E){E!==void 0&&(ht=E,this.setSize(Zt,st,!1))},this.getSize=function(E){return E.set(Zt,st)},this.setSize=function(E,q,ut=!0){if(W.isPresenting){Bt("WebGLRenderer: Can't change size while VR device is presenting.");return}Zt=E,st=q,e.width=Math.floor(E*ht),e.height=Math.floor(q*ht),ut===!0&&(e.style.width=E+"px",e.style.height=q+"px"),C!==null&&C.setSize(e.width,e.height),this.setViewport(0,0,E,q)},this.getDrawingBufferSize=function(E){return E.set(Zt*ht,st*ht).floor()},this.setDrawingBufferSize=function(E,q,ut){Zt=E,st=q,ht=ut,e.width=Math.floor(E*ut),e.height=Math.floor(q*ut),this.setViewport(0,0,E,q)},this.setEffects=function(E){if(x===wn){Qt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(E){for(let q=0;q<E.length;q++)if(E[q].isOutputPass===!0){Bt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}C.setEffects(E||[])},this.getCurrentViewport=function(E){return E.copy(ot)},this.getViewport=function(E){return E.copy(At)},this.setViewport=function(E,q,ut,nt){E.isVector4?At.set(E.x,E.y,E.z,E.w):At.set(E,q,ut,nt),_.viewport(ot.copy(At).multiplyScalar(ht).round())},this.getScissor=function(E){return E.copy(Dt)},this.setScissor=function(E,q,ut,nt){E.isVector4?Dt.set(E.x,E.y,E.z,E.w):Dt.set(E,q,ut,nt),_.scissor(Lt.copy(Dt).multiplyScalar(ht).round())},this.getScissorTest=function(){return ne},this.setScissorTest=function(E){_.setScissorTest(ne=E)},this.setOpaqueSort=function(E){dt=E},this.setTransparentSort=function(E){Tt=E},this.getClearColor=function(E){return E.copy(Rt.getClearColor())},this.setClearColor=function(){Rt.setClearColor(...arguments)},this.getClearAlpha=function(){return Rt.getClearAlpha()},this.setClearAlpha=function(){Rt.setClearAlpha(...arguments)},this.clear=function(E=!0,q=!0,ut=!0){let nt=0;if(E){let it=!1;if(K!==null){let kt=K.texture.format;it=g.has(kt)}if(it){let kt=K.texture.type,$t=m.has(kt),Gt=Rt.getClearColor(),Jt=Rt.getClearAlpha(),ee=Gt.r,ce=Gt.g,fe=Gt.b;$t?(M[0]=ee,M[1]=ce,M[2]=fe,M[3]=Jt,k.clearBufferuiv(k.COLOR,0,M)):(w[0]=ee,w[1]=ce,w[2]=fe,w[3]=Jt,k.clearBufferiv(k.COLOR,0,w))}else nt|=k.COLOR_BUFFER_BIT}q&&(nt|=k.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),ut&&(nt|=k.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),nt!==0&&k.clear(nt)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(E){E.setRenderer(this),N=E},this.dispose=function(){e.removeEventListener("webglcontextlost",St,!1),e.removeEventListener("webglcontextrestored",Ft,!1),e.removeEventListener("webglcontextcreationerror",te,!1),Rt.dispose(),_t.dispose(),bt.dispose(),L.dispose(),F.dispose(),X.dispose(),yt.dispose(),lt.dispose(),tt.dispose(),W.dispose(),W.removeEventListener("sessionstart",cn),W.removeEventListener("sessionend",xn),zn.stop()};function St(E){E.preventDefault(),Yr("WebGLRenderer: Context Lost."),z=!0}function Ft(){Yr("WebGLRenderer: Context Restored."),z=!1;let E=A.autoReset,q=mt.enabled,ut=mt.autoUpdate,nt=mt.needsUpdate,it=mt.type;Nt(),A.autoReset=E,mt.enabled=q,mt.autoUpdate=ut,mt.needsUpdate=nt,mt.type=it}function te(E){Qt("WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function de(E){let q=E.target;q.removeEventListener("dispose",de),Te(q)}function Te(E){Ue(E),L.remove(E)}function Ue(E){let q=L.get(E).programs;q!==void 0&&(q.forEach(function(ut){tt.releaseProgram(ut)}),E.isShaderMaterial&&tt.releaseShaderCache(E))}this.renderBufferDirect=function(E,q,ut,nt,it,kt){q===null&&(q=pt);let $t=it.isMesh&&it.matrixWorld.determinantAffine()<0,Gt=ta(E,q,ut,nt,it);_.setMaterial(nt,$t);let Jt=ut.index,ee=1;if(nt.wireframe===!0){if(Jt=B.getWireframeAttribute(ut),Jt===void 0)return;ee=2}let ce=ut.drawRange,fe=ut.attributes.position,Kt=ce.start*ee,ye=(ce.start+ce.count)*ee;kt!==null&&(Kt=Math.max(Kt,kt.start*ee),ye=Math.min(ye,(kt.start+kt.count)*ee)),Jt!==null?(Kt=Math.max(Kt,0),ye=Math.min(ye,Jt.count)):fe!=null&&(Kt=Math.max(Kt,0),ye=Math.min(ye,fe.count));let Xe=ye-Kt;if(Xe<0||Xe===1/0)return;yt.setup(it,nt,Gt,ut,Jt);let Re,Ae=ct;if(Jt!==null&&(Re=V.get(Jt),Ae=Z,Ae.setIndex(Re)),it.isMesh)nt.wireframe===!0?(_.setLineWidth(nt.wireframeLinewidth*Ot()),Ae.setMode(k.LINES)):Ae.setMode(k.TRIANGLES);else if(it.isLine){let hn=nt.linewidth;hn===void 0&&(hn=1),_.setLineWidth(hn*Ot()),it.isLineSegments?Ae.setMode(k.LINES):it.isLineLoop?Ae.setMode(k.LINE_LOOP):Ae.setMode(k.LINE_STRIP)}else it.isPoints?Ae.setMode(k.POINTS):it.isSprite&&Ae.setMode(k.TRIANGLES);if(it.isBatchedMesh)if($.get("WEBGL_multi_draw"))Ae.renderMultiDraw(it._multiDrawStarts,it._multiDrawCounts,it._multiDrawCount);else{let hn=it._multiDrawStarts,Yt=it._multiDrawCounts,_n=it._multiDrawCount,xe=Jt?V.get(Jt).bytesPerElement:1,kn=L.get(nt).currentProgram.getUniforms();for(let ci=0;ci<_n;ci++)kn.setValue(k,"_gl_DrawID",ci),Ae.render(hn[ci]/xe,Yt[ci])}else if(it.isInstancedMesh)Ae.renderInstances(Kt,Xe,it.count);else if(ut.isInstancedBufferGeometry){let hn=ut._maxInstanceCount!==void 0?ut._maxInstanceCount:1/0,Yt=Math.min(ut.instanceCount,hn);Ae.renderInstances(Kt,Xe,Yt)}else Ae.render(Kt,Xe)};function Ve(E,q,ut,nt){N!==null&&E.isNodeMaterial&&N.setObject(nt,E),wt===!0&&j.setState(E,ut,!1),E.transparent===!0&&E.side===ri&&E.forceSinglePass===!1?(E.side=nn,E.needsUpdate=!0,_s(E,q,nt),E.side=ki,E.needsUpdate=!0,_s(E,q,nt),E.side=ri):_s(E,q,nt)}this.compile=function(E,q,ut=null){ut===null&&(ut=E),N!==null&&N.renderStart(E,q,ut),b=bt.get(ut),b.init(q),v.push(b),ut.traverseVisible(function(it){it.isLight&&it.layers.test(q.layers)&&(b.pushLight(it),it.castShadow&&b.pushShadow(it))}),E!==ut&&E.traverseVisible(function(it){it.isLight&&it.layers.test(q.layers)&&(b.pushLight(it),it.castShadow&&b.pushShadow(it))}),b.setupLights(),N!==null&&N.updateLights(b.state.lightsArray),Ct=this.localClippingEnabled,wt=j.init(this.clippingPlanes,Ct),wt===!0&&j.setGlobalState(this.clippingPlanes,q),N!==null&&mt.render(b.state.shadowsArray,ut,q);let nt=new Set;return E.traverse(function(it){if(!(it.isMesh||it.isPoints||it.isLine||it.isSprite))return;let kt=it.material;if(kt)if(Array.isArray(kt))for(let $t=0;$t<kt.length;$t++){let Gt=kt[$t];Ve(Gt,ut,q,it),nt.add(Gt)}else Ve(kt,ut,q,it),nt.add(kt)}),b=v.pop(),N!==null&&N.renderEnd(),nt},this.compileAsync=function(E,q,ut=null){let nt=this.compile(E,q,ut);return new Promise(it=>{function kt(){if(nt.forEach(function($t){let Jt=L.get($t).currentProgram;(Jt===void 0||Jt.isReady())&&nt.delete($t)}),nt.size===0){it(E);return}setTimeout(kt,10)}$.get("KHR_parallel_shader_compile")!==null?kt():setTimeout(kt,10)})};let Fe=null;function on(E){Fe&&Fe(E)}function cn(){zn.stop()}function xn(){zn.start()}let zn=new Kg;zn.setAnimationLoop(on),typeof self<"u"&&zn.setContext(self),this.setAnimationLoop=function(E){Fe=E,W.setAnimationLoop(E),E===null?zn.stop():zn.start()},W.addEventListener("sessionstart",cn),W.addEventListener("sessionend",xn),this.render=function(E,q){if(q!==void 0&&q.isCamera!==!0){Qt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(z===!0)return;N!==null&&N.renderStart(E,q);let ut=W.enabled===!0&&W.isPresenting===!0,nt=C!==null&&(K===null||ut)&&C.begin(I,K);if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),q.parent===null&&q.matrixWorldAutoUpdate===!0&&q.updateMatrixWorld(),W.enabled===!0&&W.isPresenting===!0&&(C===null||C.isCompositing()===!1)&&(W.cameraAutoUpdate===!0&&W.updateCamera(q),q=W.getCamera()),E.isScene===!0&&E.onBeforeRender(I,E,q,K),b=bt.get(E,v.length),b.init(q),b.state.textureUnits=D.getTextureUnits(),v.push(b),Pt.multiplyMatrices(q.projectionMatrix,q.matrixWorldInverse),xt.setFromProjectionMatrix(Pt,Cn,q.reversedDepth),Ct=this.localClippingEnabled,wt=j.init(this.clippingPlanes,Ct),S=_t.get(E,R.length),S.init(),R.push(S),W.enabled===!0&&W.isPresenting===!0){let $t=I.xr.getDepthSensingMesh();$t!==null&&an($t,q,-1/0,I.sortObjects)}an(E,q,0,I.sortObjects),S.finish(),N!==null&&N.updateLights(b.state.lightsArray),I.sortObjects===!0&&S.sort(dt,Tt),Et=W.enabled===!1||W.isPresenting===!1||W.hasDepthSensing()===!1,Et&&Rt.addToRenderList(S,E),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),wt===!0&&j.beginShadows();let it=b.state.shadowsArray;if(mt.render(it,E,q),wt===!0&&j.endShadows(),(nt&&C.hasRenderPass())===!1){let $t=S.opaque,Gt=S.transmissive;if(b.setupLights(),q.isArrayCamera){let Jt=q.cameras;if(Gt.length>0)for(let ee=0,ce=Jt.length;ee<ce;ee++){let fe=Jt[ee];Wi($t,Gt,E,fe)}Et&&Rt.render(E);for(let ee=0,ce=Jt.length;ee<ce;ee++){let fe=Jt[ee];ue(S,E,fe,fe.viewport)}}else Gt.length>0&&Wi($t,Gt,E,q),Et&&Rt.render(E),ue(S,E,q)}K!==null&&rt===0&&(D.updateMultisampleRenderTarget(K),D.updateRenderTargetMipmap(K)),nt&&C.end(I),E.isScene===!0&&E.onAfterRender(I,E,q),yt.resetDefaultState(),Q=-1,et=null,v.pop(),v.length>0?(b=v[v.length-1],D.setTextureUnits(b.state.textureUnits),wt===!0&&j.setGlobalState(I.clippingPlanes,b.state.camera)):b=null,R.pop(),R.length>0?S=R[R.length-1]:S=null,N!==null&&N.renderEnd()};function an(E,q,ut,nt){if(E.visible===!1)return;if(E.layers.test(q.layers)){if(E.isGroup)ut=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(q);else if(E.isLightProbeGrid)b.pushLightProbeGrid(E);else if(E.isLight)b.pushLight(E),E.castShadow&&b.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||E.intersectsFrustum(xt)){nt&&Ut.setFromMatrixPosition(E.matrixWorld).applyMatrix4(Pt);let $t=X.update(E),Gt=E.material;Gt.visible&&S.push(E,$t,Gt,ut,Ut.z,null,q)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||E.intersectsFrustum(xt))){let $t=X.update(E),Gt=E.material;if(nt&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Ut.copy(E.boundingSphere.center)):($t.boundingSphere===null&&$t.computeBoundingSphere(),Ut.copy($t.boundingSphere.center)),Ut.applyMatrix4(E.matrixWorld).applyMatrix4(Pt)),Array.isArray(Gt)){let Jt=$t.groups;for(let ee=0,ce=Jt.length;ee<ce;ee++){let fe=Jt[ee],Kt=Gt[fe.materialIndex];Kt&&Kt.visible&&S.push(E,$t,Kt,ut,Ut.z,fe,q)}}else Gt.visible&&S.push(E,$t,Gt,ut,Ut.z,null,q)}}let kt=E.children;for(let $t=0,Gt=kt.length;$t<Gt;$t++)an(kt[$t],q,ut,nt)}function ue(E,q,ut,nt){let{opaque:it,transmissive:kt,transparent:$t}=E;b.setupLightsView(ut),wt===!0&&j.setGlobalState(I.clippingPlanes,ut),nt&&_.viewport(ot.copy(nt)),it.length>0&&xs(it,q,ut),kt.length>0&&xs(kt,q,ut),$t.length>0&&xs($t,q,ut),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function Wi(E,q,ut,nt){if((ut.isScene===!0?ut.overrideMaterial:null)!==null)return;if(b.state.transmissionRenderTarget[nt.id]===void 0){let Kt=$.has("EXT_color_buffer_half_float")||$.has("EXT_color_buffer_float");b.state.transmissionRenderTarget[nt.id]=new Ne(1,1,{generateMipmaps:!0,type:Kt?sn:wn,minFilter:ai,samples:Math.max(4,T.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:he.workingColorSpace})}let kt=b.state.transmissionRenderTarget[nt.id],$t=nt.viewport||ot;kt.setSize($t.z*I.transmissionResolutionScale,$t.w*I.transmissionResolutionScale);let Gt=I.getRenderTarget(),Jt=I.getActiveCubeFace(),ee=I.getActiveMipmapLevel();I.setRenderTarget(kt),I.getClearColor(Wt),qt=I.getClearAlpha(),qt<1&&I.setClearColor(16777215,.5),I.clear(),Et&&Rt.render(ut);let ce=I.toneMapping;I.toneMapping=Zn;let fe=nt.viewport;if(nt.viewport!==void 0&&(nt.viewport=void 0),b.setupLightsView(nt),wt===!0&&j.setGlobalState(I.clippingPlanes,nt),xs(E,ut,nt),D.updateMultisampleRenderTarget(kt),D.updateRenderTargetMipmap(kt),$.has("WEBGL_multisampled_render_to_texture")===!1){let Kt=!1;for(let ye=0,Xe=q.length;ye<Xe;ye++){let Re=q[ye],{object:Ae,geometry:hn,material:Yt,group:_n}=Re;if(Yt.side===ri&&Ae.layers.test(nt.layers)){let xe=Yt.side;Yt.side=nn,Yt.needsUpdate=!0,ur(Ae,ut,nt,hn,Yt,_n),Yt.side=xe,Yt.needsUpdate=!0,Kt=!0}}Kt===!0&&(D.updateMultisampleRenderTarget(kt),D.updateRenderTargetMipmap(kt))}I.setRenderTarget(Gt,Jt,ee),I.setClearColor(Wt,qt),fe!==void 0&&(nt.viewport=fe),I.toneMapping=ce}function xs(E,q,ut){let nt=q.isScene===!0?q.overrideMaterial:null;for(let it=0,kt=E.length;it<kt;it++){let $t=E[it],{object:Gt,geometry:Jt,group:ee}=$t,ce=$t.material;ce.allowOverride===!0&&nt!==null&&(ce=nt),Gt.layers.test(ut.layers)&&ur(Gt,q,ut,Jt,ce,ee)}}function ur(E,q,ut,nt,it,kt){N!==null&&it.isNodeMaterial&&N.setObject(E,it),E.onBeforeRender(I,q,ut,nt,it,kt),E.modelViewMatrix.multiplyMatrices(ut.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),it.onBeforeRender(I,q,ut,nt,E,kt),it.transparent===!0&&it.side===ri&&it.forceSinglePass===!1?(it.side=nn,it.needsUpdate=!0,I.renderBufferDirect(ut,q,nt,it,E,kt),it.side=ki,it.needsUpdate=!0,I.renderBufferDirect(ut,q,nt,it,E,kt),it.side=ri):I.renderBufferDirect(ut,q,nt,it,E,kt),E.onAfterRender(I,q,ut,nt,it,kt)}function _s(E,q,ut){q.isScene!==!0&&(q=pt);let nt=L.get(E),it=b.state.lights,kt=b.state.shadowsArray,$t=it.state.version,Gt=tt.getParameters(E,it.state,kt,q,ut,b.state.lightProbeGridArray),Jt=tt.getProgramCacheKey(Gt),ee=nt.programs;nt.environment=E.isMeshStandardMaterial||E.isMeshLambertMaterial||E.isMeshPhongMaterial?q.environment:null,nt.fog=q.fog;let ce=E.isMeshStandardMaterial||E.isMeshLambertMaterial&&!E.envMap||E.isMeshPhongMaterial&&!E.envMap;nt.envMap=F.get(E.envMap||nt.environment,ce),nt.envMapRotation=nt.environment!==null&&E.envMap===null?q.environmentRotation:E.envMapRotation,ee===void 0&&(E.addEventListener("dispose",de),ee=new Map,nt.programs=ee);let fe=ee.get(Jt);if(fe!==void 0){if(nt.currentProgram===fe&&nt.lightsStateVersion===$t)return Qo(E,Gt),fe}else Gt.uniforms=tt.getUniforms(E),N!==null&&E.isNodeMaterial&&N.build(E,ut,Gt),E.onBeforeCompile(Gt,I),fe=tt.acquireProgram(Gt,Jt),ee.set(Jt,fe),nt.uniforms=Gt.uniforms;let Kt=nt.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Kt.clippingPlanes=j.uniform),Qo(E,Gt),nt.needsLights=Fc(E),nt.lightsStateVersion=$t,nt.needsLights&&(Kt.ambientLightColor.value=it.state.ambient,Kt.lightProbe.value=it.state.probe,Kt.sunLights.value=it.state.sun,Kt.sunLightShadows.value=it.state.sunShadow,Kt.directionalLights.value=it.state.directional,Kt.directionalLightShadows.value=it.state.directionalShadow,Kt.spotLights.value=it.state.spot,Kt.spotLightShadows.value=it.state.spotShadow,Kt.rectAreaLights.value=it.state.rectArea,Kt.ltc_1.value=it.state.rectAreaLTC1,Kt.ltc_2.value=it.state.rectAreaLTC2,Kt.pointLights.value=it.state.point,Kt.pointLightShadows.value=it.state.pointShadow,Kt.hemisphereLights.value=it.state.hemi,Kt.sunShadowMatrix.value=it.state.sunShadowMatrix,Kt.sunShadowCascade.value=it.state.sunShadowCascade,Kt.directionalShadowMatrix.value=it.state.directionalShadowMatrix,Kt.spotLightMatrix.value=it.state.spotLightMatrix,Kt.spotLightMap.value=it.state.spotLightMap,Kt.pointShadowMatrix.value=it.state.pointShadowMatrix),nt.lightProbeGrid=b.state.lightProbeGridArray.length>0,nt.currentProgram=fe,nt.uniformsList=null,fe}function Ko(E){if(E.uniformsList===null){let q=E.currentProgram.getUniforms();E.uniformsList=Vo.seqWithValue(q.seq,E.uniforms)}return E.uniformsList}function Qo(E,q){let ut=L.get(E);ut.outputColorSpace=q.outputColorSpace,ut.batching=q.batching,ut.batchingColor=q.batchingColor,ut.instancing=q.instancing,ut.instancingColor=q.instancingColor,ut.instancingMorph=q.instancingMorph,ut.skinning=q.skinning,ut.morphTargets=q.morphTargets,ut.morphNormals=q.morphNormals,ut.morphColors=q.morphColors,ut.morphTargetsCount=q.morphTargetsCount,ut.numClippingPlanes=q.numClippingPlanes,ut.numIntersection=q.numClipIntersection,ut.vertexAlphas=q.vertexAlphas,ut.vertexTangents=q.vertexTangents,ut.toneMapping=q.toneMapping}function jo(E,q){if(E.length===0)return null;if(E.length===1)return E[0].texture!==null?E[0]:null;y.setFromMatrixPosition(q.matrixWorld);for(let ut=0,nt=E.length;ut<nt;ut++){let it=E[ut];if(it.texture!==null&&it.boundingBox.containsPoint(y))return it}return null}function ta(E,q,ut,nt,it){q.isScene!==!0&&(q=pt),D.resetTextureUnits();let kt=q.fog,$t=nt.isMeshStandardMaterial||nt.isMeshLambertMaterial||nt.isMeshPhongMaterial?q.environment:null,Gt=K===null?I.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:he.workingColorSpace,Jt=nt.isMeshStandardMaterial||nt.isMeshLambertMaterial&&!nt.envMap||nt.isMeshPhongMaterial&&!nt.envMap,ee=F.get(nt.envMap||$t,Jt),ce=nt.vertexColors===!0&&!!ut.attributes.color&&ut.attributes.color.itemSize===4,fe=!!ut.attributes.tangent&&(!!nt.normalMap||nt.anisotropy>0),Kt=!!ut.morphAttributes.position,ye=!!ut.morphAttributes.normal,Xe=!!ut.morphAttributes.color,Re=Zn;nt.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(Re=I.toneMapping);let Ae=ut.morphAttributes.position||ut.morphAttributes.normal||ut.morphAttributes.color,hn=Ae!==void 0?Ae.length:0,Yt=L.get(nt),_n=b.state.lights;if(wt===!0&&(Ct===!0||E!==et)){let Ee=E===et&&nt.id===Q;j.setState(nt,E,Ee)}let xe=!1;nt.version===Yt.__version?(Yt.needsLights&&Yt.lightsStateVersion!==_n.state.version||Yt.outputColorSpace!==Gt||it.isBatchedMesh&&Yt.batching===!1||!it.isBatchedMesh&&Yt.batching===!0||it.isBatchedMesh&&Yt.batchingColor===!0&&it._colorsTexture===null||it.isBatchedMesh&&Yt.batchingColor===!1&&it._colorsTexture!==null||it.isInstancedMesh&&Yt.instancing===!1||!it.isInstancedMesh&&Yt.instancing===!0||it.isSkinnedMesh&&Yt.skinning===!1||!it.isSkinnedMesh&&Yt.skinning===!0||it.isInstancedMesh&&Yt.instancingColor===!0&&it.instanceColor===null||it.isInstancedMesh&&Yt.instancingColor===!1&&it.instanceColor!==null||it.isInstancedMesh&&Yt.instancingMorph===!0&&it.morphTexture===null||it.isInstancedMesh&&Yt.instancingMorph===!1&&it.morphTexture!==null||Yt.envMap!==ee||nt.fog===!0&&Yt.fog!==kt||Yt.numClippingPlanes!==void 0&&(Yt.numClippingPlanes!==j.numPlanes||Yt.numIntersection!==j.numIntersection)||Yt.vertexAlphas!==ce||Yt.vertexTangents!==fe||Yt.morphTargets!==Kt||Yt.morphNormals!==ye||Yt.morphColors!==Xe||Yt.toneMapping!==Re||Yt.morphTargetsCount!==hn||!!Yt.lightProbeGrid!=b.state.lightProbeGridArray.length>0)&&(xe=!0):(xe=!0,Yt.__version=nt.version);let kn=Yt.currentProgram;xe===!0&&(kn=_s(nt,q,it),N&&nt.isNodeMaterial&&N.onUpdateProgram(nt,kn,Yt));let ci=!1,Xi=!1,dr=!1,we=kn.getUniforms(),Ge=Yt.uniforms;if(_.useProgram(kn.program)&&(ci=!0,Xi=!0,dr=!0),nt.id!==Q&&(Q=nt.id,Xi=!0),Yt.needsLights){let Ee=jo(b.state.lightProbeGridArray,it);Yt.lightProbeGrid!==Ee&&(Yt.lightProbeGrid=Ee,Xi=!0)}if(ci||et!==E){_.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),we.setValue(k,"projectionMatrix",E.projectionMatrix),we.setValue(k,"viewMatrix",E.matrixWorldInverse);let Yi=we.map.cameraPosition;Yi!==void 0&&Yi.setValue(k,at.setFromMatrixPosition(E.matrixWorld)),T.logarithmicDepthBuffer&&we.setValue(k,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(nt.isMeshPhongMaterial||nt.isMeshToonMaterial||nt.isMeshLambertMaterial||nt.isMeshBasicMaterial||nt.isMeshStandardMaterial||nt.isShaderMaterial)&&we.setValue(k,"isOrthographic",E.isOrthographicCamera===!0),et!==E&&(et=E,Xi=!0,dr=!0)}if(Yt.needsLights&&(_n.state.sunShadowMap.length>0&&we.setValue(k,"sunShadowMap",_n.state.sunShadowMap,D),_n.state.directionalShadowMap.length>0&&we.setValue(k,"directionalShadowMap",_n.state.directionalShadowMap,D),_n.state.spotShadowMap.length>0&&we.setValue(k,"spotShadowMap",_n.state.spotShadowMap,D),_n.state.pointShadowMap.length>0&&we.setValue(k,"pointShadowMap",_n.state.pointShadowMap,D)),it.isSkinnedMesh){we.setOptional(k,it,"bindMatrix"),we.setOptional(k,it,"bindMatrixInverse");let Ee=it.skeleton;Ee&&(Ee.boneTexture===null&&Ee.computeBoneTexture(),we.setValue(k,"boneTexture",Ee.boneTexture,D))}it.isBatchedMesh&&(we.setOptional(k,it,"batchingTexture"),we.setValue(k,"batchingTexture",it._matricesTexture,D),we.setOptional(k,it,"batchingIdTexture"),we.setValue(k,"batchingIdTexture",it._indirectTexture,D),we.setOptional(k,it,"batchingColorTexture"),it._colorsTexture!==null&&we.setValue(k,"batchingColorTexture",it._colorsTexture,D));let qi=ut.morphAttributes;if((qi.position!==void 0||qi.normal!==void 0||qi.color!==void 0)&&P.update(it,ut,kn),(Xi||Yt.receiveShadow!==it.receiveShadow)&&(Yt.receiveShadow=it.receiveShadow,we.setValue(k,"receiveShadow",it.receiveShadow)),(nt.isMeshStandardMaterial||nt.isMeshLambertMaterial||nt.isMeshPhongMaterial)&&nt.envMap===null&&q.environment!==null&&(Ge.envMapIntensity.value=q.environmentIntensity),Ge.dfgLUT!==void 0&&(Ge.dfgLUT.value=w1()),Xi){if(we.setValue(k,"toneMappingExposure",I.toneMappingExposure),Yt.needsLights&&ea(Ge,dr),kt&&nt.fog===!0&&vt.refreshFogUniforms(Ge,kt),vt.refreshMaterialUniforms(Ge,nt,ht,st,b.state.transmissionRenderTarget[E.id]),Yt.needsLights&&Yt.lightProbeGrid){let Ee=Yt.lightProbeGrid;Ge.probesSH.value=Ee.texture,Ge.probesMin.value.copy(Ee.boundingBox.min),Ge.probesMax.value.copy(Ee.boundingBox.max),Ge.probesResolution.value.copy(Ee.resolution)}Vo.upload(k,Ko(Yt),Ge,D)}if(nt.isShaderMaterial&&nt.uniformsNeedUpdate===!0&&(Vo.upload(k,Ko(Yt),Ge,D),nt.uniformsNeedUpdate=!1),nt.isSpriteMaterial&&we.setValue(k,"center",it.center),we.setValue(k,"modelViewMatrix",it.modelViewMatrix),we.setValue(k,"normalMatrix",it.normalMatrix),we.setValue(k,"modelMatrix",it.matrixWorld),nt.uniformsGroups!==void 0){let Ee=nt.uniformsGroups;for(let Yi=0,fr=Ee.length;Yi<fr;Yi++){let Xp=Ee[Yi];lt.update(Xp,kn),lt.bind(Xp,kn)}}return kn}function ea(E,q){E.ambientLightColor.needsUpdate=q,E.lightProbe.needsUpdate=q,E.sunLights.needsUpdate=q,E.sunLightShadows.needsUpdate=q,E.directionalLights.needsUpdate=q,E.directionalLightShadows.needsUpdate=q,E.pointLights.needsUpdate=q,E.pointLightShadows.needsUpdate=q,E.spotLights.needsUpdate=q,E.spotLightShadows.needsUpdate=q,E.rectAreaLights.needsUpdate=q,E.hemisphereLights.needsUpdate=q}function Fc(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return J},this.getActiveMipmapLevel=function(){return rt},this.getRenderTarget=function(){return K},this.setRenderTargetTextures=function(E,q,ut){let nt=L.get(E);nt.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,nt.__autoAllocateDepthBuffer===!1&&(nt.__useRenderToTexture=!1),L.get(E.texture).__webglTexture=q,L.get(E.depthTexture).__webglTexture=nt.__autoAllocateDepthBuffer?void 0:ut,nt.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,q){let ut=L.get(E);ut.__webglFramebuffer=q,ut.__useDefaultFramebuffer=q===void 0},this.setRenderTarget=function(E,q=0,ut=0){K=E,J=q,rt=ut;let nt=null,it=!1,kt=!1;if(E){let Gt=L.get(E);if(Gt.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(k.FRAMEBUFFER,Gt.__webglFramebuffer),ot.copy(E.viewport),Lt.copy(E.scissor),It=E.scissorTest,_.viewport(ot),_.scissor(Lt),_.setScissorTest(It),Q=-1;return}else if(Gt.__webglFramebuffer===void 0)D.setupRenderTarget(E);else if(Gt.__hasExternalTextures)D.rebindTextures(E,L.get(E.texture).__webglTexture,L.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){let ce=E.depthTexture;if(Gt.__boundDepthTexture!==ce){if(ce!==null&&L.has(ce)&&(E.width!==ce.image.width||E.height!==ce.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");D.setupDepthRenderbuffer(E)}}let Jt=E.texture;(Jt.isData3DTexture||Jt.isDataArrayTexture||Jt.isCompressedArrayTexture)&&(kt=!0);let ee=L.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(ee[q])?nt=ee[q][ut]:nt=ee[q],it=!0):E.samples>0&&D.useMultisampledRTT(E)===!1?nt=L.get(E).__webglMultisampledFramebuffer:Array.isArray(ee)?nt=ee[ut]:nt=ee,ot.copy(E.viewport),Lt.copy(E.scissor),It=E.scissorTest}else ot.copy(At).multiplyScalar(ht).floor(),Lt.copy(Dt).multiplyScalar(ht).floor(),It=ne;if(ut!==0&&(nt=O),_.bindFramebuffer(k.FRAMEBUFFER,nt)&&_.drawBuffers(E,nt),_.viewport(ot),_.scissor(Lt),_.setScissorTest(It),it){let Gt=L.get(E.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_CUBE_MAP_POSITIVE_X+q,Gt.__webglTexture,ut)}else if(kt){let Gt=q;for(let Jt=0;Jt<E.textures.length;Jt++){let ee=L.get(E.textures[Jt]);k.framebufferTextureLayer(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0+Jt,ee.__webglTexture,ut,Gt)}}else if(E!==null&&ut!==0){let Gt=L.get(E.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,Gt.__webglTexture,ut)}Q=-1};function na(E){let q=L.get(E);return(q.__readFormat!==E.format||q.__readType!==E.type)&&(q.__readFormat=E.format,q.__readType=E.type,q.__formatReadable=T.textureFormatReadable(E.format),q.__typeReadable=T.textureTypeReadable(E.type)),q}this.readRenderTargetPixels=function(E,q,ut,nt,it,kt,$t,Gt=0){if(!(E&&E.isWebGLRenderTarget)){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Jt=L.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&$t!==void 0&&(Jt=Jt[$t]),Jt){_.bindFramebuffer(k.FRAMEBUFFER,Jt);try{let ee=E.textures[Gt],ce=ee.format,fe=ee.type;E.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+Gt);let Kt=na(ee);if(Kt.__formatReadable===!1){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Kt.__typeReadable===!1){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}q>=0&&q<=E.width-nt&&ut>=0&&ut<=E.height-it&&k.readPixels(q,ut,nt,it,gt.convert(ce),gt.convert(fe),kt)}finally{let ee=K!==null?L.get(K).__webglFramebuffer:null;_.bindFramebuffer(k.FRAMEBUFFER,ee)}}},this.readRenderTargetPixelsAsync=async function(E,q,ut,nt,it,kt,$t,Gt=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Jt=L.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&$t!==void 0&&(Jt=Jt[$t]),Jt)if(q>=0&&q<=E.width-nt&&ut>=0&&ut<=E.height-it){_.bindFramebuffer(k.FRAMEBUFFER,Jt);let ee=E.textures[Gt],ce=ee.format,fe=ee.type;E.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+Gt);let Kt=na(ee);if(Kt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Kt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ye=k.createBuffer();k.bindBuffer(k.PIXEL_PACK_BUFFER,ye),k.bufferData(k.PIXEL_PACK_BUFFER,kt.byteLength,k.STREAM_READ),k.readPixels(q,ut,nt,it,gt.convert(ce),gt.convert(fe),0),k.bindBuffer(k.PIXEL_PACK_BUFFER,null);let Xe=K!==null?L.get(K).__webglFramebuffer:null;_.bindFramebuffer(k.FRAMEBUFFER,Xe);let Re=k.fenceSync(k.SYNC_GPU_COMMANDS_COMPLETE,0);return k.flush(),await xg(k,Re,4),k.bindBuffer(k.PIXEL_PACK_BUFFER,ye),k.getBufferSubData(k.PIXEL_PACK_BUFFER,0,kt),k.bindBuffer(k.PIXEL_PACK_BUFFER,null),k.deleteBuffer(ye),k.deleteSync(Re),kt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,q=null,ut=0){let nt=Math.pow(2,-ut),it=Math.floor(E.image.width*nt),kt=Math.floor(E.image.height*nt),$t=q!==null?q.x:0,Gt=q!==null?q.y:0;D.setTexture2D(E,0),k.copyTexSubImage2D(k.TEXTURE_2D,ut,0,0,$t,Gt,it,kt),_.unbindTexture()},this.copyTextureToTexture=function(E,q,ut=null,nt=null,it=0,kt=0){let $t,Gt,Jt,ee,ce,fe,Kt,ye,Xe,Re=E.isCompressedTexture?E.mipmaps[kt]:E.image;if(ut!==null)$t=ut.max.x-ut.min.x,Gt=ut.max.y-ut.min.y,Jt=ut.isBox3?ut.max.z-ut.min.z:1,ee=ut.min.x,ce=ut.min.y,fe=ut.isBox3?ut.min.z:0;else{let Ge=Math.pow(2,-it);$t=Math.floor(Re.width*Ge),Gt=Math.floor(Re.height*Ge),E.isDataArrayTexture?Jt=Re.depth:E.isData3DTexture?Jt=Math.floor(Re.depth*Ge):Jt=1,ee=0,ce=0,fe=0}nt!==null?(Kt=nt.x,ye=nt.y,Xe=nt.z):(Kt=0,ye=0,Xe=0);let Ae=gt.convert(q.format),hn=gt.convert(q.type),Yt;q.isData3DTexture?(D.setTexture3D(q,0),Yt=k.TEXTURE_3D):q.isDataArrayTexture||q.isCompressedArrayTexture?(D.setTexture2DArray(q,0),Yt=k.TEXTURE_2D_ARRAY):(D.setTexture2D(q,0),Yt=k.TEXTURE_2D),_.activeTexture(k.TEXTURE0),_.pixelStorei(k.UNPACK_FLIP_Y_WEBGL,q.flipY),_.pixelStorei(k.UNPACK_PREMULTIPLY_ALPHA_WEBGL,q.premultiplyAlpha),_.pixelStorei(k.UNPACK_ALIGNMENT,q.unpackAlignment);let _n=_.getParameter(k.UNPACK_ROW_LENGTH),xe=_.getParameter(k.UNPACK_IMAGE_HEIGHT),kn=_.getParameter(k.UNPACK_SKIP_PIXELS),ci=_.getParameter(k.UNPACK_SKIP_ROWS),Xi=_.getParameter(k.UNPACK_SKIP_IMAGES);_.pixelStorei(k.UNPACK_ROW_LENGTH,Re.width),_.pixelStorei(k.UNPACK_IMAGE_HEIGHT,Re.height),_.pixelStorei(k.UNPACK_SKIP_PIXELS,ee),_.pixelStorei(k.UNPACK_SKIP_ROWS,ce),_.pixelStorei(k.UNPACK_SKIP_IMAGES,fe);let dr=E.isDataArrayTexture||E.isData3DTexture,we=q.isDataArrayTexture||q.isData3DTexture;if(E.isDepthTexture){let Ge=L.get(E),qi=L.get(q),Ee=L.get(Ge.__renderTarget),Yi=L.get(qi.__renderTarget);_.bindFramebuffer(k.READ_FRAMEBUFFER,Ee.__webglFramebuffer),_.bindFramebuffer(k.DRAW_FRAMEBUFFER,Yi.__webglFramebuffer);for(let fr=0;fr<Jt;fr++)dr&&(k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,L.get(E).__webglTexture,it,fe+fr),k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,L.get(q).__webglTexture,kt,Xe+fr)),k.blitFramebuffer(ee,ce,$t,Gt,Kt,ye,$t,Gt,k.DEPTH_BUFFER_BIT,k.NEAREST);_.bindFramebuffer(k.READ_FRAMEBUFFER,null),_.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else if(it!==0||E.isRenderTargetTexture||L.has(E)){let Ge=L.get(E),qi=L.get(q);_.bindFramebuffer(k.READ_FRAMEBUFFER,G),_.bindFramebuffer(k.DRAW_FRAMEBUFFER,Y);for(let Ee=0;Ee<Jt;Ee++)dr?k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,Ge.__webglTexture,it,fe+Ee):k.framebufferTexture2D(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,Ge.__webglTexture,it),we?k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,qi.__webglTexture,kt,Xe+Ee):k.framebufferTexture2D(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,qi.__webglTexture,kt),it!==0?k.blitFramebuffer(ee,ce,$t,Gt,Kt,ye,$t,Gt,k.COLOR_BUFFER_BIT,k.NEAREST):we?k.copyTexSubImage3D(Yt,kt,Kt,ye,Xe+Ee,ee,ce,$t,Gt):k.copyTexSubImage2D(Yt,kt,Kt,ye,ee,ce,$t,Gt);_.bindFramebuffer(k.READ_FRAMEBUFFER,null),_.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else we?E.isDataTexture||E.isData3DTexture?k.texSubImage3D(Yt,kt,Kt,ye,Xe,$t,Gt,Jt,Ae,hn,Re.data):q.isCompressedArrayTexture?k.compressedTexSubImage3D(Yt,kt,Kt,ye,Xe,$t,Gt,Jt,Ae,Re.data):k.texSubImage3D(Yt,kt,Kt,ye,Xe,$t,Gt,Jt,Ae,hn,Re):E.isDataTexture?k.texSubImage2D(k.TEXTURE_2D,kt,Kt,ye,$t,Gt,Ae,hn,Re.data):E.isCompressedTexture?k.compressedTexSubImage2D(k.TEXTURE_2D,kt,Kt,ye,Re.width,Re.height,Ae,Re.data):k.texSubImage2D(k.TEXTURE_2D,kt,Kt,ye,$t,Gt,Ae,hn,Re);_.pixelStorei(k.UNPACK_ROW_LENGTH,_n),_.pixelStorei(k.UNPACK_IMAGE_HEIGHT,xe),_.pixelStorei(k.UNPACK_SKIP_PIXELS,kn),_.pixelStorei(k.UNPACK_SKIP_ROWS,ci),_.pixelStorei(k.UNPACK_SKIP_IMAGES,Xi),kt===0&&q.generateMipmaps&&k.generateMipmap(Yt),_.unbindTexture()},this.initRenderTarget=function(E){L.get(E).__webglFramebuffer===void 0&&D.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?D.setTextureCube(E,0):E.isData3DTexture?D.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?D.setTexture2DArray(E,0):D.setTexture2D(E,0),_.unbindTexture()},this.resetState=function(){J=0,rt=0,K=null,_.reset(),yt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Cn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=he._getDrawingBufferColorSpace(t),e.unpackColorSpace=he._getUnpackColorSpace()}}});function Ho(s){return new $s({color:0,emissive:16777215,emissiveIntensity:s})}var id,rx=Le(()=>{Si();id=class extends Di{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let t=new pi;t.deleteAttribute("uv");let e=new Bi({side:nn}),n=new Bi,i=new js(16777215,900,28,2);i.position.set(.418,16.199,.3),this.add(i);let r=new ve(t,e);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let o=new Vs(t,n,6),a=new me;a.position.set(-10.906,2.009,1.846),a.rotation.set(0,-.195,0),a.scale.set(2.328,7.905,4.651),a.updateMatrix(),o.setMatrixAt(0,a.matrix),a.position.set(-5.607,-.754,-.758),a.rotation.set(0,.994,0),a.scale.set(1.97,1.534,3.955),a.updateMatrix(),o.setMatrixAt(1,a.matrix),a.position.set(6.167,.857,7.803),a.rotation.set(0,.561,0),a.scale.set(3.927,6.285,3.687),a.updateMatrix(),o.setMatrixAt(2,a.matrix),a.position.set(-2.017,.018,6.124),a.rotation.set(0,.333,0),a.scale.set(2.002,4.566,2.064),a.updateMatrix(),o.setMatrixAt(3,a.matrix),a.position.set(2.291,-.756,-2.621),a.rotation.set(0,-.286,0),a.scale.set(1.546,1.552,1.496),a.updateMatrix(),o.setMatrixAt(4,a.matrix),a.position.set(-2.193,-.369,-5.547),a.rotation.set(0,.516,0),a.scale.set(3.875,3.487,2.986),a.updateMatrix(),o.setMatrixAt(5,a.matrix),this.add(o);let l=new ve(t,Ho(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);let c=new ve(t,Ho(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let h=new ve(t,Ho(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);let d=new ve(t,Ho(43));d.position.set(-.462,8.89,14.52),d.scale.set(4.38,5.441,.088),this.add(d);let u=new ve(t,Ho(20));u.position.set(3.235,11.486,-12.541),u.scale.set(2.5,2,.1),this.add(u);let f=new ve(t,Ho(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){let t=new Set;this.traverse(e=>{e.isMesh&&(t.add(e.geometry),t.add(e.material))});for(let e of t)e.dispose()}}});var Wo,Lp=Le(()=>{Wo={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`}});var Bn,T1,Dp,A1,gs,Xo=Le(()=>{Si();Bn=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},T1=new xi(-1,1,1,-1,0,1),Dp=class extends se{constructor(){super(),this.setAttribute("position",new Xt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Xt([0,2,0,0,2,0],2))}},A1=new Dp,gs=class{constructor(t){this._mesh=new ve(A1,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,T1)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}}});var sd,ox=Le(()=>{Si();Xo();sd=class extends Bn{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Pe?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=yi.clone(t.uniforms),this.material=new Pe({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new gs(this.material)}render(t,e,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}});var Rc,rd,ax=Le(()=>{Xo();Rc=class extends Bn{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,n){let i=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),r.buffers.stencil.setFunc(i.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(i.EQUAL,1,4294967295),r.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),r.buffers.stencil.setLocked(!0)}},rd=class extends Bn{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}}});var od,lx=Le(()=>{Si();Lp();ox();ax();od=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let n=t.getSize(new Mt);this._width=n.width,this._height=n.height,e=new Ne(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:sn}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new sd(Wo),this.copyPass.material.blending=Fn,this.timer=new tr}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),n=!1;for(let i=0,r=this.passes.length;i<r;i++){let o=this.passes[i];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,n),o.needsSwap){if(n){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Rc!==void 0&&(o instanceof Rc?n=!0:o instanceof rd&&(n=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new Mt);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let n=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(n,i),this.renderTarget2.setSize(n,i);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,i)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}});var ad,cx=Le(()=>{Si();Xo();ad=class extends Bn{constructor(t,e,n=null,i=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=n,this.clearColor=i,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new zt}render(t,e,n){let i=t.autoClear;t.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=i}}});var hx,ux=Le(()=>{Si();hx={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new zt(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`}});var qo,dx=Le(()=>{Si();Xo();Lp();ux();qo=class s extends Bn{constructor(t,e=1,n,i){super(),this.strength=e,this.radius=n,this.threshold=i,this.resolution=t!==void 0?new Mt(t.x,t.y):new Mt(256,256),this.clearColor=new zt(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Ne(r,o,{type:sn,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let d=new Ne(r,o,{type:sn,depthBuffer:!1});d.texture.name="UnrealBloomPass.h"+h,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);let u=new Ne(r,o,{type:sn,depthBuffer:!1});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),o=Math.round(o/2)}let a=hx;this.highPassUniforms=yi.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Pe({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new Mt(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=yi.clone(Wo.uniforms),this.blendMaterial=new Pe({uniforms:this.copyUniforms,vertexShader:Wo.vertexShader,fragmentShader:Wo.fragmentShader,premultipliedAlpha:!0,blending:fs,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new zt,this._oldClearAlpha=1,this._basic=new Nn,this._fsQuad=new gs(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),i=Math.round(e/2);this.renderTargetBright.setSize(n,i);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,i),this.renderTargetsVertical[r].setSize(n,i),this.separableBlurMaterials[r].uniforms.invSize.value=new Mt(1/n,1/i),n=Math.round(n/2),i=Math.round(i/2)}render(t,e,n,i,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=s.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=s.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let e=[],n=t/3;for(let o=0;o<t;o++)e.push(.39894*Math.exp(-.5*o*o/(n*n))/n);let i=[],r=[];for(let o=1;o<t;o+=2){let a=e[o],l=o+1<t?e[o+1]:0,c=a+l;i.push((o*a+(o+1)*l)/c),r.push(c)}return new Pe({defines:{KERNEL_PAIRS:i.length},uniforms:{colorTexture:{value:null},invSize:{value:new Mt(.5,.5)},direction:{value:new Mt(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:i},gaussianWeights:{value:r}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(t){return new Pe({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};qo.BlurDirectionX=new Mt(1,0);qo.BlurDirectionY=new Mt(0,1)});var Pc,fx=Le(()=>{Pc={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`}});var ld,px=Le(()=>{Si();Xo();fx();ld=class extends Bn{constructor(){super(),this.isOutputPass=!0,this.uniforms=yi.clone(Pc.uniforms),this.material=new hs({name:Pc.name,uniforms:this.uniforms,vertexShader:Pc.vertexShader,fragmentShader:Pc.fragmentShader}),this._fsQuad=new gs(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},he.getTransfer(this._outputColorSpace)===_e&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===bo?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===wo?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===To?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ms?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Eo?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Co?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===Ao&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}});function Yo(s,t={}){let e=t.quality!=="low",n=new Cc({antialias:e,alpha:!1,powerPreference:"high-performance"}),i=e?2:1.25;n.setPixelRatio(Math.min(window.devicePixelRatio||1,i)),n.toneMapping=ms,n.toneMappingExposure=t.exposure??1,n.outputColorSpace=Ze,n.domElement.className="game-canvas",s.appendChild(n.domElement);let r=new Di,o=new Be(t.fov??40,1,t.near??.1,t.far??200),a=null;if(t.environment!==!1){a=new cr(n);let u=new id;r.environment=a.fromScene(u,.04).texture,r.environmentIntensity=t.envIntensity??.8,u.dispose?.()}let l=null,c=null;t.bloom&&e&&(l=new od(n),l.addPass(new ad(r,o)),c=new qo(new Mt(256,256),t.bloom.strength??.6,t.bloom.radius??.6,t.bloom.threshold??.6),l.addPass(c),l.addPass(new ld));let h={renderer:n,scene:r,camera:o,composer:l,bloomPass:c,width:1,height:1,onResize:null,render(){l?l.render():n.render(r,o)},dispose(){d(),r.traverse(u=>{if(u.geometry&&u.geometry.dispose(),u.material){let f=Array.isArray(u.material)?u.material:[u.material];for(let p of f){for(let x of Object.keys(p))p[x]&&p[x].isTexture&&p[x].dispose();p.dispose()}}}),r.background?.isTexture&&r.background.dispose(),r.environment?.dispose?.(),a?.dispose(),l?.dispose?.(),n.dispose(),n.forceContextLoss(),n.domElement.remove()}},d=Md(s,(u,f)=>{!u||!f||(h.width=u,h.height=f,n.setSize(u,f),l?.setSize(u,f),o.aspect=u/f,o.updateProjectionMatrix(),h.onResize?.(u,f))});return h}function cd(s,{w:t=4,h:e=512}={}){let n=document.createElement("canvas");n.width=t,n.height=e;let i=n.getContext("2d"),r=i.createLinearGradient(0,0,0,e);for(let[a,l]of s)r.addColorStop(a,l);i.fillStyle=r,i.fillRect(0,0,t,e);let o=new Ws(n);return o.colorSpace=Ze,o}function $o(s=128,t="rgba(255,255,255,1)",e="rgba(255,255,255,0.25)"){let n=document.createElement("canvas");n.width=n.height=s;let i=n.getContext("2d"),r=i.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,t),r.addColorStop(.35,e),r.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=r,i.fillRect(0,0,s,s);let o=new Ws(n);return o.colorSpace=Ze,o}var bi,hd=Le(()=>{Si();rx();lx();cx();dx();px();hi();bi=class{constructor(t=300,{size:e=.12,gravity:n=0,drag:i=.4}={}){this.count=t,this.gravity=n,this.drag=i,this.pos=new Float32Array(t*3),this.vel=new Float32Array(t*3),this.col=new Float32Array(t*3),this.life=new Float32Array(t),this.maxLife=new Float32Array(t).fill(1),this.sz=new Float32Array(t),this.age=new Float32Array(t).fill(1),this.cursor=0;let r=new se;r.setAttribute("position",new pe(this.pos,3)),r.setAttribute("aColor",new pe(this.col,3)),r.setAttribute("aSize",new pe(this.sz,1)),r.setAttribute("aAge",new pe(this.age,1)),this.material=new Pe({transparent:!0,depthWrite:!1,blending:fs,uniforms:{uScale:{value:600},uBase:{value:e}},vertexShader:`
        attribute vec3 aColor; attribute float aSize; attribute float aAge;
        varying vec3 vColor; varying float vAlpha;
        uniform float uScale; uniform float uBase;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          float fade = smoothstep(0.0,0.12,aAge) * (1.0 - smoothstep(0.55,1.0,aAge));
          vAlpha = (aAge >= 1.0) ? 0.0 : fade;
          vColor = aColor;
          gl_PointSize = aSize * uBase * uScale / max(0.1, -mv.z) * (0.6 + 0.4*(1.0-aAge));
          gl_Position = projectionMatrix * mv;
        }`,fragmentShader:`
        varying vec3 vColor; varying float vAlpha;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float core = smoothstep(1.0, 0.0, r);
          float a = (core*core*0.9 + exp(-r*r*14.0)*0.7) * vAlpha;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor * a, a);
        }`}),this.points=new Gs(r,this.material),this.points.frustumCulled=!1,this.geo=r}spawn(t,e,n,i,r,o,a,l=1,c=2){let h=this.cursor;this.cursor=(this.cursor+1)%this.count;let d=h*3;this.pos[d]=t,this.pos[d+1]=e,this.pos[d+2]=n,this.vel[d]=i,this.vel[d+1]=r,this.vel[d+2]=o,this.col[d]=a.r,this.col[d+1]=a.g,this.col[d+2]=a.b,this.sz[h]=l,this.life[h]=c,this.maxLife[h]=c,this.age[h]=0}update(t,e=800,n=40){this.material.uniforms.uScale.value=e/(2*Math.tan(n*Math.PI/360));for(let i=0;i<this.count;i++){if(this.age[i]>=1)continue;this.life[i]-=t,this.age[i]=Math.min(1,1-this.life[i]/this.maxLife[i]);let r=i*3,o=Math.exp(-this.drag*t);this.vel[r]*=o,this.vel[r+1]=this.vel[r+1]*o+this.gravity*t,this.vel[r+2]*=o,this.pos[r]+=this.vel[r]*t,this.pos[r+1]+=this.vel[r+1]*t,this.pos[r+2]+=this.vel[r+2]*t}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAge.needsUpdate=!0,this.geo.attributes.aColor.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0}}});function mx(s,t=1e-4){t=Math.max(t,Number.EPSILON);let e={},n=s.getIndex(),i=s.getAttribute("position"),r=n?n.count:i.count,o=0,a=Object.keys(s.attributes),l={},c={},h=[],d=["getX","getY","getZ","getW"],u=["setX","setY","setZ","setW"];for(let M=0,w=a.length;M<w;M++){let y=a[M],S=s.attributes[y];l[y]=new S.constructor(new S.array.constructor(S.count*S.itemSize),S.itemSize,S.normalized);let b=s.morphAttributes[y];b&&(c[y]||(c[y]=[]),b.forEach((R,v)=>{let C=new R.array.constructor(R.count*R.itemSize);c[y][v]=new R.constructor(C,R.itemSize,R.normalized)}))}let f=t*.5,p=Math.log10(1/t),x=Math.pow(10,p),g=f*x;for(let M=0;M<r;M++){let w=n?n.getX(M):M,y="";for(let S=0,b=a.length;S<b;S++){let R=a[S],v=s.getAttribute(R),C=v.itemSize;for(let I=0;I<C;I++)y+=`${Math.trunc(v[d[I]](w)*x+g)},`}if(y in e)h.push(e[y]);else{for(let S=0,b=a.length;S<b;S++){let R=a[S],v=s.getAttribute(R),C=s.morphAttributes[R],I=v.itemSize,z=l[R],N=c[R];for(let O=0;O<I;O++){let G=d[O],Y=u[O];if(z[Y](o,v[G](w)),C)for(let J=0,rt=C.length;J<rt;J++)N[J][Y](o,C[J][G](w))}}e[y]=o,h.push(o),o++}}let m=s.clone();for(let M in s.attributes){let w=l[M];if(m.setAttribute(M,new w.constructor(w.array.slice(0,o*w.itemSize),w.itemSize,w.normalized)),M in c)for(let y=0;y<c[M].length;y++){let S=c[M][y];m.morphAttributes[M][y]=new S.constructor(S.array.slice(0,o*S.itemSize),S.itemSize,S.normalized)}}return m.setIndex(h),m}var gx=Le(()=>{});var _x={};vs(_x,{create:()=>E1});function E1(s){let{audio:t,bus:e,hud:n,root:i,settings:r,quality:o}=s,a=o!=="low",l=Yo(i,{fov:30,quality:o,exposure:.92,envIntensity:.9}),{scene:c,camera:h,renderer:d}=l,u=0,f=()=>xx[u];c.fog=new ft.Fog(f().fog,12,30);let p=new ft.Mesh(new ft.CircleGeometry(40,64),new ft.MeshStandardMaterial({color:f().floor,roughness:.92,metalness:0}));p.rotation.x=-Math.PI/2,c.add(p);let x=new ft.DirectionalLight(16773344,1.7);x.position.set(3.5,7,4),c.add(x);let g=new ft.DirectionalLight(13228287,1.8);g.position.set(-5,3.5,-4),c.add(g),c.add(new ft.HemisphereLight(16777215,15981055,.3));let m=$o(128,"rgba(0,0,0,0.95)","rgba(0,0,0,0.45)"),M=new ft.Mesh(new ft.PlaneGeometry(1,1),new ft.MeshBasicMaterial({map:m,transparent:!0,opacity:.5,depthWrite:!1,color:2756656}));M.rotation.x=-Math.PI/2,M.position.y=.004,c.add(M);function w(W=!1){let St=f();c.background?.dispose?.(),c.background=cd([[0,St.top],[.5,St.fog],[1,St.fog]]),c.fog.color.set(St.fog),p.material.color.set(St.floor),K.color.set(St.color),K.attenuationColor.set(St.color),K.emissive.set(St.color),K.sheenColor.set(new ft.Color(St.color).lerp(new ft.Color("#ffffff"),.5)),ot.color.set(new ft.Color(St.color).lerp(new ft.Color("#ffffff"),.7)),qt.set(St.color).lerp(new ft.Color("#ffffff"),.5),W&&Zt(new ft.Vector3(0,1.2,0),26,2.6)}let y=a?34:20,S=new ft.IcosahedronGeometry(1,y);S.deleteAttribute("uv"),S.deleteAttribute("normal"),S=mx(S,1e-4),S.computeVertexNormals();let b=S.attributes.position.count,R=S.attributes.position;R.setUsage(ft.DynamicDrawUsage);let v=Float32Array.from(R.array),C=R.array,I=new Float32Array(b*3),z=new Float32Array(b*3),N=new Float32Array(b),O=S.index.array,G=Array.from({length:b},()=>new Set);for(let W=0;W<O.length;W+=3){let St=O[W],Ft=O[W+1],te=O[W+2];G[St].add(Ft),G[St].add(te),G[Ft].add(St),G[Ft].add(te),G[te].add(St),G[te].add(Ft)}let Y=new Uint32Array(b+1),J=0;for(let W=0;W<b;W++)Y[W]=J,J+=G[W].size;Y[b]=J;let rt=new Uint32Array(J);for(let W=0;W<b;W++){let St=Y[W];for(let Ft of G[W])rt[St++]=Ft}G.length=0,S.boundingSphere=new ft.Sphere(new ft.Vector3,4),S.boundingBox=new ft.Box3(new ft.Vector3(-4,-4,-4),new ft.Vector3(4,4,4));let K=new ft.MeshPhysicalMaterial({color:f().color,roughness:.14,metalness:0,clearcoat:1,clearcoatRoughness:.06,sheen:.6,sheenRoughness:.4,sheenColor:new ft.Color("#ffffff"),transmission:a?.35:0,thickness:2.2,ior:1.36,attenuationColor:new ft.Color(f().color),attenuationDistance:.55,emissive:new ft.Color(f().color),emissiveIntensity:.1,envMapIntensity:1.25,transparent:!a,opacity:a?1:.93}),Q=new ft.Mesh(S,K);Q.frustumCulled=!1;let et=new ft.Vector3(1.2,.86,1.2);Q.scale.copy(et),Q.position.y=et.y,c.add(Q);let ot=new ft.MeshPhysicalMaterial({color:16777215,roughness:.05,metalness:0,clearcoat:1,envMapIntensity:1.6}),Lt=new ft.SphereGeometry(1,14,10),It=[];for(let W=0;W<(a?34:16);W++){let St=new ft.Vector3(H(-1,1),H(-.6,1),H(-1,1)).normalize(),Ft=H(.15,.78),te=new ft.Mesh(Lt,ot),de=Math.pow(H(.2,1),2)*.075+.016;te.scale.setScalar(de),te.position.copy(St).multiplyScalar(Ft),Q.add(te);let Te=0,Ue=1e9,Ve=St.clone();for(let Fe=0;Fe<b;Fe+=7){let on=(v[Fe*3]-Ve.x)**2+(v[Fe*3+1]-Ve.y)**2+(v[Fe*3+2]-Ve.z)**2;on<Ue&&(Ue=on,Te=Fe)}It.push({m:te,base:te.position.clone(),vi:Te,k:Ft*.9})}let Wt=new bi(a?90:40,{size:.09,gravity:0,drag:.1});c.add(Wt.points);let qt=new ft.Color("#ffffff"),Zt=(W,St,Ft)=>{for(let te=0;te<St;te++){let de=H(0,Math.PI*2),Te=H(.2,1);Wt.spawn(W.x+H(-.3,.3),W.y+H(-.2,.3),W.z+H(-.3,.3),Math.cos(de)*Ft*H(.2,1),Te*Ft*.8,Math.sin(de)*Ft*H(.2,1),qt,H(.5,1.5),H(.9,2))}},st=0;w();let ht={yaw:.35,pitch:.34,dist:8.6,ty:.85,tyYaw:0,tPitch:.34};function dt(W,St){let Ft=ht.yaw,te=ht.pitch;h.position.set(Math.sin(Ft)*Math.cos(te)*ht.dist,ht.ty+Math.sin(te)*ht.dist,Math.cos(Ft)*Math.cos(te)*ht.dist),h.lookAt(0,ht.ty-.05,0)}let Tt=58,At=34,Dt=5.2,ne=26,xt=150,wt=0,Ct=!0,Pt=0,at={on:!1,id:-1,n:new ft.Vector3,p0:new ft.Vector3,plane:new ft.Plane,t:0,target:new ft.Vector3,dent:0,stretch:0,moved:!1,dx:0,dy:0,dz:0,last:new ft.Vector3,pull:0},Ut={x:0,z:0,vx:0,vz:0,sy:0,vsy:0};for(let W=0;W<b;W++)z[W*3+1]=-1.6*Math.max(0,v[W*3+1]+.3);function pt(W){let St=at.on?at.dent:0,Ft=at.dx,te=at.dy,de=at.dz,Te=at.n.x,Ue=at.n.y,Ve=at.n.z,Fe=0,on=0,cn=0,xn=-wt*ne;for(let an=0;an<b;an++){let ue=an*3,Wi=Y[an],xs=Y[an+1],ur=1/(xs-Wi),_s=0,Ko=0,Qo=0;for(let ut=Wi;ut<xs;ut++){let nt=rt[ut]*3;_s+=I[nt],Ko+=I[nt+1],Qo+=I[nt+2]}let jo=I[ue],ta=I[ue+1],ea=I[ue+2],Fc=-Tt*jo+At*(_s*ur-jo)-Dt*z[ue]+xn*v[ue],na=-Tt*ta+At*(Ko*ur-ta)-Dt*z[ue+1]+xn*v[ue+1],E=-Tt*ea+At*(Qo*ur-ea)-Dt*z[ue+2]+xn*v[ue+2],q=N[an];if(q>0){let ut=(Ft-Te*St)*q,nt=(te-Ue*St)*q,it=(de-Ve*St)*q,kt=xt*q;Fc+=kt*(ut-jo),na+=kt*(nt-ta),E+=kt*(it-ea),on+=Math.abs(z[ue])+Math.abs(z[ue+1])+Math.abs(z[ue+2]),cn++}z[ue]+=Fc*W,z[ue+1]+=na*W,z[ue+2]+=E*W}let zn=0;for(let an=0;an<b;an++){let ue=an*3;I[ue]+=z[ue]*W,I[ue+1]+=z[ue+1]*W,I[ue+2]+=z[ue+2]*W;let Wi=-1-v[ue+1];I[ue+1]<Wi&&(I[ue+1]=Wi,z[ue+1]<0&&(z[ue+1]*=-.05)),Fe+=I[ue]*v[ue]+I[ue+1]*v[ue+1]+I[ue+2]*v[ue+2],zn+=Math.abs(z[ue])+Math.abs(z[ue+1])+Math.abs(z[ue+2])}return wt=Fe/b,Pt=cn?on/cn:0,zn/b}function Et(){for(let W=0;W<b*3;W++)C[W]=v[W]+I[W];R.needsUpdate=!0,S.computeVertexNormals();for(let W of It){let St=W.vi*3;W.m.position.set(W.base.x+I[St]*W.k,W.base.y+I[St+1]*W.k,W.base.z+I[St+2]*W.k)}}let Ot=new ft.Raycaster,k=new ft.Vector2,jt=new ft.Vector3,$=()=>i.getBoundingClientRect();function T(W,St){k.set(W/l.width*2-1,-(St/l.height)*2+1),Ot.setFromCamera(k,h)}function _(W){T(W.x,W.y),Q.updateMatrixWorld(!0);let St=Ot.intersectObject(Q,!1)[0];if(!St)return!1;let te=Q.worldToLocal(St.point.clone()).clone().normalize();at.on=!0,at.id=W.id,at.n.copy(te),at.p0.copy(St.point),at.t=0,at.dent=0,at.moved=!1,at.stretch=0,at.dx=at.dy=at.dz=0,h.getWorldDirection(jt),at.plane.setFromNormalAndCoplanarPoint(jt,St.point);let de=.52;for(let Te=0;Te<b;Te++){let Ue=Te*3,Ve=Ht(v[Ue]*te.x+v[Ue+1]*te.y+v[Ue+2]*te.z,-1,1),Fe=Math.acos(Ve),on=Math.exp(-((Fe/de)**2));N[Te]=on>.015?on:0}return Ct=!0,!0}function A(W,St){if(at.t+=W,T(St.x,St.y),Ot.ray.intersectPlane(at.plane,jt)){at.target.copy(jt);let de=jt.x-at.p0.x,Te=jt.y-at.p0.y,Ue=jt.z-at.p0.z,Ve=de/et.x,Fe=Te/et.y,on=Ue/et.z,cn=Math.hypot(Ve,Fe,on),xn=2.6;cn>xn&&(Ve*=xn/cn,Fe*=xn/cn,on*=xn/cn),at.dx=Ve,at.dy=Fe,at.dz=on,at.stretch=Math.min(cn,xn),cn>.12&&(at.moved=!0)}let Ft=1-Math.exp(-at.t*9),te=$i(.35,1.1,at.stretch);at.dent=.34*Ft*(1-te*.85)}function L(){if(!at.on)return;let W=at.stretch;at.on=!1,N.fill(0),Rt(W);let St=at.p0.clone().add(new ft.Vector3(at.dx*et.x,at.dy*et.y,at.dz*et.z));W>.5&&Zt(St,Math.round(W*10),1.4+W)}let D=null,F=null,V=Gn(i,{down(W){t.unlock?.(),F=W,!at.on&&_(W)?(mt(W),t.haptic?.(14)):D={id:W.id,x:W.x,y:W.y}},move(W){F=W,D&&D.id===W.id&&(ht.yaw-=(W.x-D.x)*.006,ht.pitch=Ht(ht.pitch+(W.y-D.y)*.005,.06,1.15),D.x=W.x,D.y=W.y)},up(W){at.on&&at.id===W.id&&L(),D&&D.id===W.id&&(D=null)}}),B=W=>{W.preventDefault(),ht.dist=Ht(ht.dist*(1+W.deltaY*.001),5.5,13)};i.addEventListener("wheel",B,{passive:!1});let X=null,tt=null,vt=null,_t=.05;t.ready&&(X=t.loop(e,{kind:"pink",filter:"bandpass",freq:700,q:5,gain:0,send:.2}),tt=t.loop(e,{kind:"white",filter:"bandpass",freq:2200,q:2.5,gain:0,send:.15}),vt=new Tn(t,e,{chords:[[53,60,64,69],[50,57,62,65],[55,62,67,71],[52,59,64,67]],gain:r.ambience?_t:0,cutoff:1300,period:17,wave:"triangle"}));let bt=W=>vt?.setLevel(W.detail?_t:0);window.addEventListener("hush:ambience",bt);let j=W=>Ht((W/l.width-.5)*1.5,-.85,.85);function mt(W){if(!t.ready)return;let St=j(W.x),Ft=H(.85,1.2);t.burst(e,{kind:"pink",dur:.2,attack:.004,gain:.55,type:"lowpass",freq:1700*Ft,freqEnd:240,q:2.2,pan:St,send:.15}),t.tone(e,{freq:240*Ft,freqEnd:82,dur:.15,gain:.34,pan:St,send:.12}),t.burst(e,{kind:"white",dur:.014,attack:4e-4,gain:.26,type:"bandpass",freq:2600*Ft,q:4,pan:St,send:.1}),t.bubble(e,{freq:H(280,520),gain:.14,pan:St,dur:.12,rise:1.5,delay:.03})}function Rt(W){if(!t.ready)return;let St=F?j(F.x):0,Ft=Ht(W/1.5,0,1);t.burst(e,{kind:"pink",dur:.14,gain:.3+.2*Ft,type:"bandpass",freq:900+800*Ft,freqEnd:300,q:3,pan:St,send:.2}),t.tone(e,{freq:160+260*Ft,freqEnd:70,dur:.18,gain:.3+.15*Ft,pan:St,send:.2}),t.bubble(e,{freq:H(260,480)*(1+Ft*.6),gain:.2,pan:St,dur:.2,rise:1.9});let te=3+Math.round(Ft*5);for(let de=0;de<te;de++)t.burst(e,{kind:"white",dur:.006,attack:3e-4,gain:H(.05,.16),type:"bandpass",freq:H(1400,4200),q:H(2,6),pan:St+H(-.2,.2),send:.15,delay:.01+de*H(.012,.04)})}let P=0,ct=0;function Z(W,St,Ft){if(!t.ready)return;let te=F&&at.on?j(F.x):0;for(X.set({gain:.38*Math.pow(St,1.15),freq:380+1300*St+500*Ft,q:3+6*Ft,pan:te},.03),tt.set({gain:.1*Math.pow(St,1.6)*(.4+Ft),freq:1700+1900*Ft,pan:te},.03),P+=W*(3+24*St);P>1;)P-=Math.random()*1.8,t.bubble(e,{freq:H(240,1e3),gain:H(.04,.12)*(.5+St),pan:te+H(-.3,.3),dur:H(.06,.14),rise:H(1.3,2),send:.3});if(Ft>.55&&at.on)for(ct+=W*(10+70*(Ft-.5))*St;ct>1;)ct-=Math.random()*1.5,t.burst(e,{kind:"white",dur:H(.003,.009),gain:H(.05,.14),type:"bandpass",freq:H(1600,5200),q:H(2,5),pan:te+H(-.2,.2),send:.12})}n.swatches({colors:xx.map(W=>W.color),value:u,onChange:W=>{u=W,w(!0)}}),n.button({label:"Shake",title:"Give it a jiggle",onClick:()=>{for(let W=0;W<b;W++)z[W*3+1]+=H(2.2,4)*Math.max(.2,v[W*3+1]+.5),z[W*3]+=H(-1,1),z[W*3+2]+=H(-1,1);Ct=!0,t.ready&&(t.bubble(e,{freq:300,gain:.25,dur:.2}),t.burst(e,{kind:"pink",dur:.3,gain:.35,type:"lowpass",freq:1200,freqEnd:200,q:2}))}}),n.setHint("Press, pull and stretch the slime. Drag the background to look around.");let gt=0,yt=0,lt=new ft.Vector3,Nt=Vn((W,St)=>{at.on&&F&&A(W,F);let Ft=0;if(Ct||at.on){let xn=Math.min(4,Math.max(1,Math.ceil(W/.008))),zn=W/xn;for(let an=0;an<xn;an++)Ft=pt(zn);Et(),!at.on&&Ft<8e-4&&Math.abs(wt)<4e-4&&(Ct=!1)}let te=at.on?at.dent/.34:0,de=-.07*te-(at.on?.05*Math.min(1,at.stretch):0);Ut.vsy+=((de-Ut.sy)*110-Ut.vsy*9)*W,Ut.sy+=Ut.vsy*W;let Te=at.on?at.dx*.1:0,Ue=at.on?at.dz*.1:0;Ut.vx+=((Te-Ut.x)*90-Ut.vx*8)*W,Ut.vz+=((Ue-Ut.z)*90-Ut.vz*8)*W,Ut.x+=Ut.vx*W,Ut.z+=Ut.vz*W;let Ve=Math.sin(St*1.4)*.004;Q.scale.set(et.x*(1-Ut.sy*.45+Ve),et.y*(1+Ut.sy+Ve*.5),et.z*(1-Ut.sy*.45+Ve)),Q.position.set(Ut.x,et.y*(1+Ut.sy)*1,Ut.z);let Fe=2.7*(1-Ut.sy*.45)*(1+wt*-.2);M.scale.set(Fe*1.15,Fe*1.15,1),M.material.opacity=.42+.1*te;let on=0;at.on&&(on=at.target.distanceTo(lt)/Math.max(W,.001),lt.copy(at.target));let cn=at.on?Ht(on*.16+Pt*.08,0,1):Ht(Ft*.5,0,.35);gt+=(cn-gt)*(1-Math.exp(-(cn>gt?18:6)*W)),yt+=((at.on?at.stretch:0)-yt)*(1-Math.exp(-10*W)),Z(W,gt,yt),st-=W,st<=0&&(st=H(.12,.35),Wt.spawn(H(-3.5,3.5),H(.1,.6),H(-3,2),H(-.05,.05),H(.08,.22),H(-.05,.05),qt,H(.4,1.1),H(5,9))),Wt.update(W,l.height,30),dt(W,St),l.render()});return{destroy(){Nt.stop(),V.dispose(),i.removeEventListener("wheel",B),X?.stop(.1),tt?.stop(.1),vt?.stop(.6),window.removeEventListener("hush:ambience",bt),m.dispose(),Lt.dispose(),l.dispose()}}}var xx,vx=Le(()=>{hd();gx();hi();ys();xx=[{name:"Bubblegum",color:"#ff4fa8",top:"#ffd6ec",fog:"#eaa6cc",floor:"#efb4d3"},{name:"Mint",color:"#1fd6a0",top:"#d4fff0",fog:"#9fe3cb",floor:"#aeead4"},{name:"Lavender",color:"#8e6bff",top:"#e6dcff",fog:"#bfaff0",floor:"#c9bcf3"},{name:"Peach",color:"#ff8a45",top:"#ffe6d2",fog:"#f5b99a",floor:"#f8c6ab"},{name:"Ocean",color:"#2aa8ff",top:"#d6f0ff",fog:"#9fcdea",floor:"#addaf0"},{name:"Butter",color:"#ffc61f",top:"#fff3c4",fog:"#f1d98e",floor:"#f5e1a2"}]});var Mx={};vs(Mx,{create:()=>I1});function P1(){let s=document.createElement("canvas");s.width=s.height=256;let t=s.getContext("2d"),e=t.createRadialGradient(128,128,6,128,128,128);e.addColorStop(0,"#6fcf7a"),e.addColorStop(.7,"#3ea85a"),e.addColorStop(1,"#1f7a45"),t.fillStyle=e,t.fillRect(0,0,256,256),t.strokeStyle="rgba(210,255,200,0.35)",t.lineWidth=1.5;for(let i=0;i<22;i++){let r=i/22*Math.PI*2;t.beginPath(),t.moveTo(128,128),t.lineTo(128+Math.cos(r)*126,128+Math.sin(r)*126),t.stroke()}t.strokeStyle="rgba(0,40,20,0.25)",t.lineWidth=3,t.beginPath(),t.arc(128,128,126,0,Math.PI*2),t.stroke();let n=new ft.CanvasTexture(s);return n.colorSpace=ft.SRGBColorSpace,n}function I1(s){let{audio:t,bus:e,hud:n,root:i,settings:r,quality:o}=s,a=o!=="low",l=a?176:120,c=Yo(i,{fov:38,quality:o,exposure:1,envIntensity:.35}),{scene:h,camera:d}=c,u=new ft.Color("#050f16");h.background=u,h.fog=null;let f=new ft.Vector3(.18,.62,-.76).normalize();h.add(new ft.HemisphereLight(7314624,662048,.9));let p=new ft.DirectionalLight(14674431,2.2);p.position.copy(f).multiplyScalar(12),h.add(p);let x=new Float32Array(l*l),g=new Float32Array(l*l),m=new Float32Array(l*l);for(let j=0;j<l;j++)for(let mt=0;mt<l;mt++){let Rt=Math.min(mt,j,l-1-mt,l-1-j);m[j*l+mt]=.9915*(Rt<14?.86+.14*(Rt/14):1)}let M=new Uint16Array(l*l),w=new ft.DataTexture(M,l,l,ft.RedFormat,ft.HalfFloatType);w.minFilter=ft.LinearFilter,w.magFilter=ft.LinearFilter,w.wrapS=w.wrapT=ft.ClampToEdgeWrapping,w.needsUpdate=!0;let y=(j,mt)=>[(j/ud+.5)*l,(.5-mt/ud)*l];function S(j,mt){let[Rt,P]=y(j,mt),ct=Ht(Math.floor(Rt),1,l-3),Z=Ht(Math.floor(P),1,l-3),gt=Ht(Rt-ct,0,1),yt=Ht(P-Z,0,1),lt=x[Z*l+ct],Nt=x[Z*l+ct+1],W=x[(Z+1)*l+ct],St=x[(Z+1)*l+ct+1];return He(He(lt,Nt,gt),He(W,St,gt),yt)}function b(j,mt,Rt,P=3.2){let[ct,Z]=y(j,mt),gt=P;for(let yt=Math.max(2,Math.floor(Z-gt));yt<=Math.min(l-3,Math.ceil(Z+gt));yt++)for(let lt=Math.max(2,Math.floor(ct-gt));lt<=Math.min(l-3,Math.ceil(ct+gt));lt++){let Nt=Math.hypot(lt-ct,yt-Z)/gt;if(Nt>=1)continue;let W=Math.cos(Nt*Math.PI*.5);x[yt*l+lt]-=Rt*W*W}}function R(){for(let mt=1;mt<l-1;mt++){let Rt=mt*l+1;for(let P=1;P<l-1;P++,Rt++)g[Rt]=((x[Rt-1]+x[Rt+1]+x[Rt-l]+x[Rt+l])*.5-g[Rt])*m[Rt]}let j=x;x=g,g=j}function v(){for(let j=0;j<x.length;j++)M[j]=ft.DataUtils.toHalfFloat(Ht(x[j],-2,2));w.needsUpdate=!0}let C={uH:{value:w},uTexel:{value:1/l},uTime:{value:0},uFog:{value:u},uMoon:{value:f}},I=new ft.Mesh(new ft.PlaneGeometry(40,40),new ft.ShaderMaterial({uniforms:C,vertexShader:yx.replace("vUv = uv;","vUv = (modelMatrix * vec4(position,1.0)).xz / 14.0 * vec2(1.0,-1.0) + 0.5;"),fragmentShader:R1,toneMapped:!1}));I.rotation.x=-Math.PI/2,I.position.y=-1,h.add(I);let z=new ft.Mesh(new ft.PlaneGeometry(40,40),new ft.ShaderMaterial({uniforms:C,vertexShader:yx.replace("vUv = uv;","vUv = (modelMatrix * vec4(position,1.0)).xz / 14.0 * vec2(1.0,-1.0) + 0.5;"),fragmentShader:C1,transparent:!0,depthWrite:!1,toneMapped:!1}));z.rotation.x=-Math.PI/2,z.renderOrder=2,h.add(z);let N=P1(),O=new ft.CircleGeometry(.5,40,.35,Math.PI*2-.5);O.rotateX(-Math.PI/2);let G=new ft.MeshStandardMaterial({map:N,roughness:.55,metalness:0,side:ft.DoubleSide}),Y=[],J=new ft.MeshStandardMaterial({color:16762078,roughness:.5,emissive:16744368,emissiveIntensity:.28}),rt=new ft.MeshStandardMaterial({color:16770801,roughness:.45,emissive:16754376,emissiveIntensity:.4}),K=new ft.SphereGeometry(1,12,8);function Q(){let j=new ft.Group,mt=(P,ct,Z,gt,yt)=>{for(let lt=0;lt<P;lt++){let Nt=lt/P*Math.PI*2+H(-.1,.1),W=new ft.Group,St=new ft.Mesh(K,gt);St.scale.set(.085,Z,.028),St.position.set(0,Z*.92,0),W.add(St),W.rotation.set(0,Nt,0),W.rotateX(ct),W.position.y=yt,j.add(W)}};mt(9,1.25,.17,J,.015),mt(7,.75,.16,rt,.03),mt(5,.28,.13,rt,.045);let Rt=new ft.Mesh(new ft.SphereGeometry(.045,10,8),new ft.MeshStandardMaterial({color:16769674,emissive:16763213,emissiveIntensity:.9}));return Rt.position.y=.07,j.add(Rt),j}let et=a?9:6,ot=0,Lt=0;for(;ot<et&&Lt++<200;){let j=H(0,Math.PI*2),mt=H(1.8,5),Rt=Math.cos(j)*mt,P=Math.sin(j)*mt*.8,ct=H(.9,1.7);if(Y.some(lt=>Math.hypot(lt.hx-Rt,lt.hz-P)<(lt.s+ct)*.62))continue;let Z=new ft.Mesh(O,G);Z.scale.setScalar(ct),Z.rotation.y=H(0,6.28);let gt=new ft.Group;gt.add(Z);let yt=ot%3===1;if(yt){let lt=Q();lt.scale.setScalar(ct*.95),lt.rotation.y=H(0,6),gt.add(lt)}h.add(gt),Y.push({g:gt,hx:Rt,hz:P,x:Rt,z:P,vx:0,vz:0,s:ct,rot:H(0,6.28),spin:H(-.04,.04),lotus:yt}),ot++}let It=a?4:2,Wt=[[16738847,16774374,16726815],[16777215,16742954,16765088],[16751918,16774374,16757611],[16769984,16734762,16777215]],qt=new ft.SphereGeometry(1,14,10),Zt=new ft.Shape;Zt.moveTo(0,0),Zt.quadraticCurveTo(.18,.05,.34,.2),Zt.quadraticCurveTo(.26,0,.34,-.2),Zt.quadraticCurveTo(.18,-.05,0,0);let st=new ft.ShapeGeometry(Zt);st.rotateX(-Math.PI/2);let ht=[];for(let j=0;j<It;j++){let mt=Wt[j%Wt.length],Rt=[],P=new ft.Group,ct=8;for(let lt=0;lt<ct;lt++){let Nt=lt/(ct-1),W=.17*Math.sin(Math.PI*Math.min(1,.2+Nt*.9))+.035,St=new ft.MeshStandardMaterial({color:mt[(lt<3?0:lt%3===0?1:lt%2)%3],roughness:.45,metalness:.05,emissive:1705984,emissiveIntensity:.4}),Ft=new ft.Mesh(qt,St);Ft.scale.set(W*1.5,W*.8,W),P.add(Ft),Rt.push({m:Ft,t:Nt})}let Z=new ft.MeshStandardMaterial({color:mt[2],roughness:.6,transparent:!0,opacity:.8,side:ft.DoubleSide}),gt=new ft.Mesh(st,Z);gt.scale.setScalar(1.15),P.add(gt);let yt=[-1,1].map(lt=>{let Nt=new ft.Mesh(st,Z);return Nt.scale.setScalar(.55),P.add(Nt),{f:Nt,sd:lt}});h.add(P),ht.push({group:P,segs:Rt,tail:gt,fins:yt,a:H(2,4),b:H(1.4,3),f1:H(.16,.26),f2:H(.18,.3),p1:H(0,6.28),p2:H(0,6.28),speed:H(.85,1.15),boost:0})}let dt=(j,mt)=>[j.a*Math.sin(j.f1*mt*j.speed+j.p1)+Math.sin(mt*.05+j.p2)*.8,j.b*Math.cos(j.f2*mt*j.speed+j.p2)+.4],Tt=new bi(a?60:24,{size:.12,drag:.05});h.add(Tt.points);let At=new ft.Color("#d7ff7a"),Dt=new bi(120,{size:.085,gravity:-9,drag:.4});h.add(Dt.points);let ne=new ft.Color("#bfeaff"),xt=0,wt=new ft.Raycaster,Ct=new ft.Vector2,Pt=new ft.Plane(new ft.Vector3(0,1,0),0),at=new ft.Vector3,Ut=(j,mt)=>(Ct.set(j/c.width*2-1,-(mt/c.height)*2+1),wt.setFromCamera(Ct,d),wt.ray.intersectPlane(Pt,at)?at:null),pt=null,Et=null,Ot=null,k=.045;t.ready&&(pt=t.loop(e,{kind:"brown",filter:"lowpass",freq:650,q:.6,gain:0,send:.35}),Et=t.loop(e,{kind:"brown",filter:"lowpass",freq:260,q:.5,gain:.05,send:.4}),Ot=new Tn(t,e,{chords:[[57,64,69,72],[55,62,67,71],[53,60,65,69],[52,59,64,67]],gain:r.ambience?k:0,cutoff:1e3,period:19}));let jt=j=>Ot?.setLevel(j.detail?k:0);window.addEventListener("hush:ambience",jt);let $=j=>Ht(j/(ud*.4),-.9,.9);function T(j,mt,Rt=1,P=!1){if(!t.ready)return;let ct=Math.round(Ht((j/ud+.5)*9,0,9))+(Rt<.5?5:0),Z=mr(qp(ct,60)),gt=$(j),yt=(P?.5:1)*Ht(Rt,.25,1.1);t.bubble(e,{freq:Z*1.2,gain:.26*yt,pan:gt,send:.55,dur:.38,rise:1.7}),t.tone(e,{freq:Z*2.003,dur:1.1,gain:.05*yt,pan:gt,send:.7,attack:.004}),t.tone(e,{freq:Z*3.01,dur:.6,gain:.018*yt,pan:gt,send:.7,attack:.004}),t.tone(e,{freq:Z*.5,freqEnd:Z*.9,sweepTime:.09,dur:.16,gain:.12*yt,pan:gt,send:.3}),t.burst(e,{kind:"white",dur:.07,attack:.002,gain:.1*yt,type:"bandpass",freq:1500+Rt*800,q:.9,pan:gt,send:.3})}function _(j,mt,Rt=1){b(j,mt,.55*Rt,3.6+Rt*1.2);let P=Math.round(8+8*Rt);for(let ct=0;ct<P;ct++){let Z=H(0,6.28),gt=H(.3,1.1)*(.6+Rt*.5);Dt.spawn(j,.02,mt,Math.cos(Z)*gt,H(2.2,4.2)*(.7+Rt*.4),Math.sin(Z)*gt,ne,H(.5,1.1),H(.45,.8))}T(j,mt,Rt);for(let ct of ht)ct.boost=1}let A=null,L="off",D=Gn(i,{down(j){t.unlock?.();let mt=Ut(j.x,j.y);mt&&(_(mt.x,mt.z,H(.85,1.1)),t.haptic?.(10),A={id:j.id,x:mt.x,z:mt.z,acc:0,lastDrip:0})},move(j){if(!A||A.id!==j.id)return;let mt=Ut(j.x,j.y);if(!mt)return;let Rt=Math.hypot(mt.x-A.x,mt.z-A.z);A.speed=j.speed;let P=Math.max(1,Math.ceil(Rt/.25));for(let ct=1;ct<=P;ct++)b(He(A.x,mt.x,ct/P),He(A.z,mt.z,ct/P),.07+Math.min(.1,Rt*.1),2.4);A.acc+=Rt,A.acc>.9&&(A.acc=0,T(mt.x,mt.z,.3,!0)),A.x=mt.x,A.z=mt.z},up(j){A&&A.id===j.id&&(A=null)}});n.segmented({label:"Rain",options:[{id:"off",label:"Off"},{id:"light",label:"Light"},{id:"heavy",label:"Heavy"}],value:L,onChange:j=>{L=j}}),n.setHint("Tap the water to drop a pebble. Drag a finger through it. Every drop plays a note.");let F=0,V=0,B=H(1,3),X=0,tt={x:0,y:0},vt={x:0,y:0};i.addEventListener("pointermove",j=>{let mt=i.getBoundingClientRect();vt.x=((j.clientX-mt.left)/mt.width-.5)*2,vt.y=((j.clientY-mt.top)/mt.height-.5)*2});function _t(){if(!t.ready)return;let j=H(-.9,.9),mt=H(4200,5e3),Rt=Math.random()<.5?3:4;for(let P=0;P<Rt;P++)t.tone(e,{freq:mt,freqEnd:mt*1.03,dur:.028,attack:.004,gain:.011,pan:j,send:.35,type:"sine",delay:P*.062}),t.tone(e,{freq:mt*.5,dur:.028,attack:.004,gain:.006,pan:j,send:.35,type:"sine",delay:P*.062})}let bt=Vn((j,mt)=>{C.uTime.value=mt,F+=j;let Rt=0;for(;F>=1/60&&Rt<3;)R(),F-=1/60,Rt++;if(F>.1&&(F=0),L!=="off"&&(V-=j,V<=0)){V=L==="light"?H(.25,.8):H(.04,.2);let P=H(0,6.28),ct=Math.sqrt(Math.random())*5.2,Z=Math.cos(P)*ct,gt=Math.sin(P)*ct*.8,yt=H(.18,.45);b(Z,gt,.2+yt*.5,2.4),T(Z,gt,yt,!0),Math.random()<.4&&Dt.spawn(Z,.02,gt,H(-.3,.3),H(1,2),H(-.3,.3),ne,.5,.4)}if(t.ready){let P=A?Ht((A.speed||0)/700,0,1):0;pt.set({gain:.16*P,freq:450+700*P,pan:A?$(A.x):0},.06),A&&(A.speed=(A.speed||0)*.9),X+=j,Et.set({gain:.045+.025*Math.sin(X*.4)*Math.sin(X*.17),freq:230+80*Math.sin(X*.3)},.5),B-=j,B<=0&&(_t(),B=H(1.4,4.5))}v();for(let P of Y){let Z=(S(P.x+.18,P.z)-S(P.x-.18,P.z))/.36,gt=(S(P.x,P.z+.18)-S(P.x,P.z-.18))/(2*.18);P.vx+=(-Z*5+(P.hx-P.x)*.7)*j,P.vz+=(-gt*5+(P.hz-P.z)*.7)*j,P.vx*=Math.pow(.35,j),P.vz*=Math.pow(.35,j),P.x+=P.vx*j,P.z+=P.vz*j,P.rot+=(P.spin+P.vx*.2)*j;let yt=S(P.x,P.z);P.g.position.set(P.x,.035+yt*.4,P.z),P.g.rotation.set(gt*.9,P.rot,-Z*.9)}for(let P of ht){P.boost=Math.max(0,P.boost-j*.3);let ct=0;P.segs.forEach((yt,lt)=>{let Nt=mt-lt*.2,[W,St]=dt(P,Nt),[Ft,te]=dt(P,Nt-.05),de=W-Ft,Te=St-te,Ue=Math.hypot(de,Te)||1;de/=Ue,Te/=Ue;let Ve=Math.sin(mt*(2.4+P.boost*2)-lt*.8)*.045*(.2+yt.t);yt.m.position.set(W-Te*Ve,-.42+Math.sin(mt*.7+lt)*.01,St+de*Ve),yt.m.rotation.y=Math.atan2(-Te,de)});let Z=P.segs[P.segs.length-1].m,gt=P.segs[P.segs.length-2].m;ct=Math.atan2(Z.position.z-gt.position.z,Z.position.x-gt.position.x),P.tail.position.copy(gt.position),P.tail.position.x+=Math.cos(ct)*.03,P.tail.position.z+=Math.sin(ct)*.03,P.tail.rotation.y=-ct+Math.sin(mt*5+P.p1)*.35,P.fins.forEach(({f:yt,sd:lt})=>{let Nt=P.segs[2].m,W=P.segs[3].m.position,St=Math.atan2(W.z-Nt.position.z,W.x-Nt.position.x);yt.position.copy(Nt.position),yt.position.x+=-Math.sin(St)*.11*lt,yt.position.z+=Math.cos(St)*.11*lt,yt.rotation.y=-St-lt*(.75+Math.sin(mt*3+lt)*.25)})}xt-=j,xt<=0&&(xt=H(.15,.5),Tt.spawn(H(-5,5),H(.4,1.8),H(-4,3),H(-.12,.12),H(-.04,.08),H(-.12,.12),At,H(.6,1.4),H(5,9))),Tt.update(j,c.height,38),Dt.update(j,c.height,38);for(let P=0;P<Dt.count;P++)Dt.age[P]<1&&Dt.pos[P*3+1]<0&&(Dt.age[P]=1);tt.x=He(tt.x,vt.x*.5,1-Math.exp(-2*j)),tt.y=He(tt.y,vt.y*.3,1-Math.exp(-2*j)),d.position.set(tt.x,8.4-tt.y*.6,7.4),d.lookAt(tt.x*.2,0,.3),c.render()});return{destroy(){bt.stop(),D.dispose(),pt?.stop(.1),Et?.stop(.3),Ot?.stop(.6),window.removeEventListener("hush:ambience",jt),w.dispose(),N.dispose(),c.dispose()}}}var ud,yx,C1,R1,Sx=Le(()=>{hd();hi();ys();ud=14,yx=`
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position,1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,C1=`
precision highp float;
varying vec2 vUv; varying vec3 vWorld;
uniform sampler2D uH; uniform float uTexel; uniform float uTime; uniform vec3 uFog; uniform vec3 uMoon;
float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
vec3 sky(vec3 d){
  float t = clamp(d.y,0.0,1.0);
  vec3 c = mix(vec3(0.020,0.075,0.120), vec3(0.002,0.008,0.030), pow(t,0.45));
  float m = max(dot(d, uMoon), 0.0);
  c += vec3(1.0,0.92,0.75) * (smoothstep(0.9993,0.9998,m)*2.2 + pow(m,160.0)*0.25 + pow(m,10.0)*0.05);
  vec3 sp = floor(d*220.0);
  float st = step(0.9975, hash(sp)) * smoothstep(0.02,0.3,d.y);
  c += vec3(0.8,0.9,1.0) * st * (0.4 + 0.6*hash(sp+7.0));
  return c;
}
void main(){
  float e = uTexel;
  float hl = texture2D(uH, vUv - vec2(e,0.0)).r;
  float hr = texture2D(uH, vUv + vec2(e,0.0)).r;
  float hd = texture2D(uH, vUv - vec2(0.0,e)).r;
  float hu = texture2D(uH, vUv + vec2(0.0,e)).r;
  float K = 2.4;
  vec3 N = normalize(vec3(-(hr-hl)*K, 1.0, (hu-hd)*K));
  // a whisper of ambient wind ripple
  vec2 w = vWorld.xz;
  N.xz += 0.012*vec2(sin(w.x*3.1+uTime*0.9)+sin(w.y*4.3-uTime*0.7), cos(w.y*3.7+uTime*0.8)+sin(w.x*5.1+uTime*0.6));
  N = normalize(N);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  float cosv = max(dot(N,V),0.0);
  float fres = 0.04 + 0.96*pow(1.0-cosv, 4.0);
  fres = clamp(fres*1.9, 0.0, 1.0);
  vec3 refl = sky(R);
  vec3 tint = vec3(0.004,0.040,0.055);
  vec3 col = mix(tint, refl, fres);
  // moon glitter on the ripples
  float g = pow(max(dot(R, uMoon),0.0), 2200.0) * 5.0;
  col += vec3(1.0,0.93,0.78) * g;
  float alpha = mix(0.22, 1.0, fres);
  alpha = max(alpha, clamp(g, 0.0, 1.0));
  // fade into the dark at the pond's edge
  float r = length(vWorld.xz);
  float edge = smoothstep(4.6, 6.8, r);
  col = mix(col, uFog, edge);
  alpha = max(alpha, edge);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`,R1=`
precision highp float;
varying vec2 vUv; varying vec3 vWorld;
uniform sampler2D uH; uniform float uTexel; uniform float uTime; uniform vec3 uFog;
vec2 h22(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float caustic(vec2 uv, float t){
  vec2 p = mod(uv*6.28318, 6.28318) - 250.0;
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n=0;n<4;n++){
    float tt = t*(1.0 - (3.5/float(n+1)));
    i = p + vec2(cos(tt-i.x)+sin(tt+i.y), sin(tt-i.y)+cos(tt+i.x));
    c += 1.0/length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
void main(){
  float e = uTexel;
  float hl = texture2D(uH, vUv - vec2(e,0.0)).r;
  float hr = texture2D(uH, vUv + vec2(e,0.0)).r;
  float hd = texture2D(uH, vUv - vec2(0.0,e)).r;
  float hu = texture2D(uH, vUv + vec2(0.0,e)).r;
  vec2 grad = vec2(hr-hl, hu-hd);
  vec2 p = vWorld.xz*1.1 + grad*3.2;
  vec2 ip = floor(p); vec2 fp = fract(p);
  float f1 = 9.0, f2 = 9.0; vec2 id = vec2(0.0);
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){
    vec2 g = vec2(float(i),float(j));
    vec2 o = h22(ip+g);
    float d = length(g + o*0.85 + 0.075 - fp);
    if (d < f1){ f2 = f1; f1 = d; id = ip+g; } else if (d < f2){ f2 = d; }
  }
  float rnd = h21(id);
  vec3 stone = mix(vec3(0.10,0.17,0.19), vec3(0.30,0.28,0.22), rnd);
  stone = mix(stone, vec3(0.16,0.26,0.27), step(0.7,h21(id+3.0)));
  float rim = smoothstep(0.0, 0.2, f2-f1);
  float dome = 1.0 - f1*1.1;
  vec3 col = stone * (0.3 + 0.7*dome) * mix(0.5, 1.0, rim);
  float c = caustic(vWorld.xz*0.16 + grad*0.55, uTime*0.45);
  col *= vec3(0.42,0.66,0.74);
  col += vec3(0.10,0.34,0.38) * c * 1.5;
  float r = length(vWorld.xz);
  col = mix(col, uFog, smoothstep(3.0, 7.0, r));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`});var bx={};vs(bx,{create:()=>D1});function D1(s){let{audio:t,bus:e,hud:n,root:i,settings:r,quality:o}=s,a=o!=="low",l=Yo(i,{fov:38,quality:o,exposure:1.05,envIntensity:.55,bloom:{strength:.85,radius:.8,threshold:.62}}),{scene:c,camera:h}=l;c.background=cd([[0,"#04051a"],[.45,"#161040"],[1,"#43205f"]]),c.add(new ft.HemisphereLight(9082623,2494538,.4));let d=new ft.DirectionalLight(14016255,1.8);d.position.set(-5,6,7),c.add(d);let u=new ft.PointLight(16757976,18,14,2);u.position.set(3,1,4),c.add(u);let f=new ft.BufferGeometry,p=new Float32Array(900*3);for(let pt=0;pt<900;pt++){let Et=H(0,Math.PI*2),Ot=H(-.1,1),k=Math.sqrt(1-Ot*Ot);p[pt*3]=Math.cos(Et)*k*70,p[pt*3+1]=Ot*70,p[pt*3+2]=Math.sin(Et)*k*70-20}f.setAttribute("position",new ft.BufferAttribute(p,3));let x=new ft.Points(f,new ft.PointsMaterial({color:14673663,size:.45,sizeAttenuation:!0,transparent:!0,opacity:.85,fog:!1}));c.add(x);let g=$o(256,"rgba(255,244,214,1)","rgba(255,230,190,0.35)"),m=new ft.Sprite(new ft.SpriteMaterial({map:g,color:16771520,transparent:!0,opacity:.7,blending:ft.AdditiveBlending,depthWrite:!1}));m.position.set(-19,13,-44),m.scale.setScalar(30),c.add(m);let M=new ft.Mesh(new ft.CircleGeometry(1.7,48),new ft.MeshBasicMaterial({color:15326400,toneMapped:!1}));M.position.copy(m.position),c.add(M);let w=$o(128,"rgba(255,255,255,0.5)","rgba(255,255,255,0.15)"),y=[];for(let pt=0;pt<6;pt++){let Et=new ft.Sprite(new ft.SpriteMaterial({map:w,color:pr([5913242,3100584,9058954]),transparent:!0,opacity:H(.1,.2),depthWrite:!1,blending:ft.AdditiveBlending}));Et.position.set(H(-10,10),H(-1,5),H(-16,-6)),Et.scale.setScalar(H(10,18)),c.add(Et),y.push({m:Et,sp:H(.05,.14),ph:H(0,6)})}let S=new bi(a?260:110,{size:.16,gravity:0,drag:.55});c.add(S.points);let b=new bi(a?70:30,{size:.1,drag:.05});c.add(b.points);let R=new ft.Color("#c9b6ff"),v=0,C=new ft.MeshStandardMaterial({color:6965814,roughness:.7,metalness:.05}),I=new ft.MeshBasicMaterial({color:13620991,transparent:!0,opacity:.55}),z=$o(128,"rgba(255,255,255,1)","rgba(255,255,255,0.35)"),N=null,O=[],G="",Y=9.6,J=[];function rt(){N&&(c.remove(N),N.traverse(_=>{_.geometry?.dispose?.(),_.material&&_.material.dispose&&_.material!==C&&_.material!==I&&_.material.dispose()})),N=new ft.Group,c.add(N),O=[];let pt=l.width/Math.max(1,l.height),Et=pt<.85?5:pt<1.25?7:9;G=String(Et),Y=pt<.85?11.5:pt<1.25?10.5:9.6;let Ot=Y*Math.tan(38*Math.PI/360)*pt*.86,k=Math.min(3.6,Ot),jt=Et===9?Np:Et===7?Np.slice(1,8):Np.slice(2,7),$=Et===9?Up:Et===7?Up.slice(1,8):Up.slice(2,7),T=new ft.Mesh(new ft.CylinderGeometry(.075,.075,k*2+1.2,16),C);T.rotation.z=Math.PI/2,T.position.y=Fp,N.add(T);for(let _ of[-1,1]){let A=new ft.Mesh(new ft.CylinderGeometry(.012,.012,6,6),I);A.position.set(_*(k+.5),Fp+3,0),N.add(A)}for(let _=0;_<Et;_++){let A=Et===1?.5:_/(Et-1),L=He(-k,k,A),D=He(2,1.15,A)*(Et<9?.95:1),F=He(.65,.95,_%3/2)+.1,V=.17-A*.025,B=new ft.Color().setHSL($[_]/360,.95,.56),X=[new ft.Vector2(1e-4,0),new ft.Vector2(V*.62,0),new ft.Vector2(V,-.12),new ft.Vector2(V,-D+.42),new ft.Vector2(1e-4,-D)],tt=new ft.LatheGeometry(X,6),vt=new ft.MeshPhysicalMaterial({color:B,roughness:.06,metalness:0,flatShading:!0,transmission:a?.5:0,thickness:.8,ior:1.5,iridescence:1,iridescenceIOR:1.35,clearcoat:1,envMapIntensity:1,emissive:B,emissiveIntensity:.06,transparent:!a,opacity:a?1:.88}),_t=new ft.Group;_t.position.set(L,Fp-.06,0);let bt=new ft.Mesh(new ft.CylinderGeometry(.008,.008,F,5),I);bt.position.y=-F/2;let j=new ft.Mesh(tt,vt);j.position.y=-F;let mt=new ft.Sprite(new ft.SpriteMaterial({map:z,color:B,transparent:!0,opacity:0,blending:ft.AdditiveBlending,depthWrite:!1}));mt.position.y=-F-D*.5,mt.scale.set(1.2,D*1.6,1),_t.add(bt,j,mt),N.add(_t),O.push({i:_,x:L,group:_t,crystal:j,halo:mt,mat:vt,color:B,len:D,thread:F,rad:V,freq:mr(jt[_]),ax:0,vx:0,az:0,vz:0,w0:2.45-A*.35+H(-.04,.04),glow:0,lastHit:0,delay:0,pendingKick:0})}}l.onResize=()=>{String(K())!==G&&rt()};let K=()=>{let pt=l.width/Math.max(1,l.height);return pt<.85?5:pt<1.25?7:9};rt();let Q=[],et=null,ot=null,Lt=.05;t.ready&&(et=t.loop(e,{kind:"pink",filter:"bandpass",freq:520,q:.8,gain:.015,send:.5}),ot=new Tn(t,e,{chords:[[62,69,74,78],[59,66,71,74],[57,64,69,73],[60,67,72,76]],gain:r.ambience?Lt:0,cutoff:1500,period:18,wave:"triangle"}));let It=pt=>ot?.setLevel(pt.detail?Lt:0);window.addEventListener("hush:ambience",It);function Wt(pt,Et,Ot=!1){let k=performance.now();pt.glow=Math.max(pt.glow,Ht(Et*1.1,.35,1)),pt.group.updateMatrixWorld();let jt=new ft.Vector3(0,-pt.thread-pt.len*H(.3,.9),0).applyMatrix4(pt.group.matrixWorld),$=Math.round((Ot?4:8)+Et*16),T=pt.color.clone().lerp(new ft.Color("#ffffff"),.4);for(let L=0;L<$;L++){let D=H(0,6.28);S.spawn(jt.x+H(-.12,.12),jt.y+H(-.4,.4),jt.z+H(-.12,.12),Math.cos(D)*H(.1,.7),H(.2,1.1),Math.sin(D)*H(.1,.5),T,H(.4,1.2),H(1.2,2.8))}if(!t.ready)return;for(;Q.length&&k-Q[0]>1500;)Q.shift();if(Q.length>(a?16:9))return;Q.push(k);let _=Ht(pt.x/4,-.9,.9),A=O.indexOf(pt);t.bell(e,{freq:pt.freq,gain:(Ot?.1:.2)*(.35+Et*.9),pan:_,send:.5,decay:5.8-A/Math.max(1,O.length-1)*2.2,vel:Ht(Et,.2,1)}),t.haptic?.(6)}function qt(pt,Et,Ot=0){pt.vx=Ht(pt.vx+Et,-7,7),pt.vz=Ht(pt.vz+Ot,-4,4)}let Zt=new ft.Vector3,st=new ft.Vector3,ht=()=>l.height/(2*Y*Math.tan(38*Math.PI/360));function dt(pt){pt.group.updateMatrixWorld(),Zt.set(0,-pt.thread,0).applyMatrix4(pt.group.matrixWorld).project(h),st.set(0,-pt.thread-pt.len,0).applyMatrix4(pt.group.matrixWorld).project(h);let Et=l.width,Ot=l.height;return[(Zt.x*.5+.5)*Et,(-Zt.y*.5+.5)*Ot,(st.x*.5+.5)*Et,(-st.y*.5+.5)*Ot]}function Tt(pt,Et=!1){let Ot=ht(),k=pt.vx/Ot,jt=performance.now();if(Et||pt.speed>60)for(let T of O){let[_,A,L,D]=dt(T),F=T.rad*Ot+(pt.type==="touch"?20:9);if(L1(pt.px,pt.py,pt.x,pt.y,_,A,L,D)<=F&&jt-T.lastHit>150){T.lastHit=jt;let B=Et?Math.random()<.5?-1:1:Math.sign(k)||1,X=Et?2.4:Ht(Math.abs(k)*.5,.5,6);qt(T,B*X,H(-.4,.4)),Wt(T,Ht(Et?.7:.25+Math.abs(k)/7,.25,1))}}}let At=Gn(i,{hover:!0,down(pt){t.unlock?.(),Tt(pt,!0)},move(pt){Tt(pt,!1)}}),Dt="gentle",ne=3;function xt(pt=1){let Et=Math.random()<.5?-1:1;O.forEach((Ot,k)=>{Ot.delay=(Et>0?k:O.length-1-k)*.09+H(0,.08),Ot.pendingKick=Et*pt*H(.7,1.5)}),t.ready&&(t.burst(e,{kind:"pink",dur:2.4,attack:.9,gain:.12*pt,type:"bandpass",freq:260,freqEnd:900,q:.9,curve:"lin",pan:-Et*.4,send:.5}),t.burst(e,{kind:"white",dur:2,attack:.9,gain:.025*pt,type:"highpass",freq:3e3,curve:"lin",send:.4,pan:Et*.3}))}n.segmented({label:"Breeze",options:[{id:"off",label:"Still"},{id:"gentle",label:"Gentle"},{id:"windy",label:"Windy"}],value:Dt,onChange:pt=>{Dt=pt,ne=pt==="off"?99:1.2}}),n.button({label:"Gust",title:"A puff of wind",onClick:()=>{t.unlock?.(),xt(1.2)}}),n.setHint("Brush your pointer through the crystals. Faster sweeps ring louder.");let wt=new ft.Vector3(0,2.15,0),Ct={x:0,y:0};i.addEventListener("pointermove",pt=>{let Et=i.getBoundingClientRect();Ct.x=((pt.clientX-Et.left)/Et.width-.5)*2,Ct.y=((pt.clientY-Et.top)/Et.height-.5)*2});let Pt={x:0,y:0},at=0,Ut=Vn((pt,Et)=>{Dt!=="off"&&(ne-=pt,ne<=0&&(xt(Dt==="gentle"?H(.25,.6):H(.8,1.6)),ne=Dt==="gentle"?H(7,13):H(2.5,5.5))),at+=pt;let Ot=Dt==="off"?0:Dt==="gentle"?.03:.07;et?.set({gain:Dt==="off"?.006:.012+Ot*.5*(.6+.4*Math.sin(at*.4)),freq:380+220*Math.sin(at*.23)},.4);let k=2,jt=pt/k;for(let $=0;$<k;$++){for(let T of O){T.pendingKick&&(T.delay-=jt,T.delay<=0&&(qt(T,T.pendingKick*.9,H(-.2,.2)),Math.abs(T.pendingKick)>.5&&Math.random()<.8&&Wt(T,.2+Math.random()*.2,!0),T.pendingKick=0));let _=Ot*(Math.sin(Et*.7+T.i*.9)+Math.sin(Et*1.3+T.i*2.1)*.6);T.vx+=(-T.w0*T.w0*Math.sin(T.ax)-.3*T.vx+_)*jt,T.vz+=(-T.w0*T.w0*Math.sin(T.az)-.3*T.vz+_*.3)*jt,T.ax+=T.vx*jt,T.az+=T.vz*jt}for(let T=0;T<O.length-1;T++){let _=O[T],A=O[T+1],L=A.x+(A.thread+A.len*.55)*Math.sin(A.ax)-(_.x+(_.thread+_.len*.55)*Math.sin(_.ax)),D=(_.rad+A.rad)*1.15;if(L<D){let F=_.vx-A.vx;if(F>0){let B=F*.5*1.8;_.vx-=B,A.vx+=B;let X=performance.now();if(Math.abs(B)>.35){let tt=Ht(Math.abs(B)/3,.15,.8);X-_.lastHit>90&&(_.lastHit=X,Wt(_,tt,!0)),X-A.lastHit>90&&(A.lastHit=X,Wt(A,tt,!0))}}let V=(D-L)*.5/(_.thread+_.len*.55);_.ax-=V,A.ax+=V}}}for(let $ of O){$.group.rotation.z=$.ax,$.group.rotation.x=$.az,$.glow*=Math.exp(-pt/1.6);let T=$.glow;$.mat.emissiveIntensity=.06+T*1.6,$.halo.material.opacity=T*.75,$.halo.scale.set(1.1+T*1.4,$.len*(1.4+T*.5),1)}v-=pt,v<=0&&(v=H(.1,.35),b.spawn(H(-5,5),H(-.5,4.5),H(-2,3),H(-.05,.05),H(.05,.18),H(-.05,.05),R,H(.5,1.3),H(6,10))),b.update(pt,l.height,38),S.update(pt,l.height,38);for(let $ of y)$.m.position.x+=Math.sin(Et*$.sp+$.ph)*pt*.25;x.rotation.y=Et*.002,m.material.opacity=.62+Math.sin(Et*.3)*.06,Pt.x=He(Pt.x,Ct.x*.55+Math.sin(Et*.16)*.25,1-Math.exp(-1.6*pt)),Pt.y=He(Pt.y,Ct.y*.25+Math.sin(Et*.12)*.1,1-Math.exp(-1.6*pt)),h.position.set(Pt.x,2.15-Pt.y,Y),h.lookAt(wt),l.render()});return{destroy(){Ut.stop(),At.dispose(),et?.stop(.2),ot?.stop(.6),window.removeEventListener("hush:ambience",It),z.dispose(),w.dispose(),g.dispose(),l.dispose()}}}var Np,Up,Fp,L1,wx=Le(()=>{hd();hi();ys();Np=[62,64,67,69,72,74,76,79,81],Up=[330,20,48,150,185,215,255,285,315],Fp=3.7,L1=(s,t,e,n,i,r,o,a)=>{let l=(p,x,g,m,M,w)=>{let y=M-g,S=w-m,b=y*y+S*S,R=b?Ht(((p-g)*y+(x-m)*S)/b,0,1):0;return Math.hypot(p-(g+y*R),x-(m+S*R))},c=(p,x,g,m,M,w)=>(m-x)*(M-g)-(g-p)*(w-m),h=c(s,t,e,n,i,r),d=c(s,t,e,n,o,a),u=c(i,r,o,a,s,t),f=c(i,r,o,a,e,n);return h*d<0&&u*f<0?0:Math.min(l(s,t,i,r,o,a),l(e,n,i,r,o,a),l(i,r,s,t,e,n),l(o,a,s,t,e,n))}});ys();var Zo=(s,t)=>`<svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${t.replaceAll("$id",s)}</svg>`,N1=(()=>{let s="",t=["#ff9ec8","#ffc2a8","#c3a6ff","#9fd3ff"];for(let e=0;e<5;e++)for(let n=0;n<11;n++){let i=14+n*28+e%2*14,r=14+e*28,o=(e*7+n*3)%5===0;s+=o?`<circle cx="${i}" cy="${r}" r="11" fill="rgba(60,20,90,.12)"/><circle cx="${i}" cy="${r}" r="11" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`:`<circle cx="${i}" cy="${r}" r="12" fill="url(#$id-b${(e+n)%4})"/><ellipse cx="${i-4}" cy="${r-5}" rx="3.6" ry="2.2" fill="#fff" opacity=".85" transform="rotate(-30 ${i-4} ${r-5})"/>`}return Zo("bub",`<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fc0"/><stop offset="1" stop-color="#8c6bff"/></linearGradient>
  ${t.map((e,n)=>`<radialGradient id="$id-b${n}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="${e}" stop-opacity=".7"/></radialGradient>`).join("")}</defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>${s}`)})(),U1=(()=>{let s="";for(let t=0;t<9;t++){let e=28+t*13;s+=`<path d="M-10 ${e} C 60 ${e-18}, 120 ${e+18}, 190 ${e} S 280 ${e-14}, 320 ${e+4}" fill="none" stroke="rgba(120,84,40,.38)" stroke-width="3.2"/><path d="M-10 ${e+4} C 60 ${e-14}, 120 ${e+22}, 190 ${e+4} S 280 ${e-10}, 320 ${e+8}" fill="none" stroke="rgba(255,244,214,.55)" stroke-width="2"/>`}return Zo("sand",`<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9d3a5"/><stop offset="1" stop-color="#c9a870"/></linearGradient>
  <radialGradient id="$id-r" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8d8a87"/><stop offset="1" stop-color="#2f2d33"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>${s}
  <ellipse cx="214" cy="84" rx="58" ry="26" fill="none" stroke="rgba(120,84,40,.3)" stroke-width="3"/>
  <ellipse cx="214" cy="84" rx="42" ry="19" fill="none" stroke="rgba(120,84,40,.3)" stroke-width="3"/>
  <ellipse cx="214" cy="90" rx="30" ry="10" fill="rgba(60,40,10,.35)"/>
  <path d="M188 84 q4-24 28-24 q26 2 26 22 q0 14-26 16 q-28 0-28-14z" fill="url(#$id-r)"/>
  <ellipse cx="208" cy="72" rx="9" ry="4" fill="#fff" opacity=".28"/>`)})(),F1=Zo("rain",`<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171d3f"/><stop offset="1" stop-color="#2a1740"/></linearGradient>
  <filter id="$id-bl"><feGaussianBlur stdDeviation="6"/></filter>
  <radialGradient id="$id-d" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".8" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>
  <g filter="url(#$id-bl)">${[[40,40,22,"#ffb347"],[95,95,30,"#ff5fa8"],[150,45,18,"#7ad7ff"],[215,100,28,"#ffd27a"],[260,40,24,"#b48cff"],[60,120,16,"#7affc9"],[180,20,14,"#fff"]].map(([t,e,n,i])=>`<circle cx="${t}" cy="${e}" r="${n}" fill="${i}" opacity=".75"/>`).join("")}</g>
  <rect width="300" height="150" fill="#b8c8e8" opacity=".18"/>
  ${[[70,60,9],[130,100,12],[200,55,8],[245,90,13],[100,28,6],[35,105,7]].map(([t,e,n])=>`<g><circle cx="${t}" cy="${e}" r="${n}" fill="url(#$id-d)"/><ellipse cx="${t-n*.3}" cy="${e-n*.4}" rx="${n*.28}" ry="${n*.18}" fill="#fff" opacity=".85"/></g>`).join("")}
  <path d="M130 112 q0 22 0 34" stroke="rgba(255,255,255,.2)" stroke-width="3" stroke-linecap="round"/>`),O1=Zo("slime",`<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8fff0"/><stop offset="1" stop-color="#b9a7ff"/></linearGradient>
  <radialGradient id="$id-s" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#ffe3f4"/><stop offset=".45" stop-color="#ff8fc8"/><stop offset="1" stop-color="#c2408f"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>
  <ellipse cx="150" cy="128" rx="82" ry="12" fill="rgba(60,20,90,.28)"/>
  <path d="M70 118 C 52 76, 96 30, 150 34 C 206 30, 252 78, 230 118 C 206 132, 96 132, 70 118z" fill="url(#$id-s)"/>
  <ellipse cx="116" cy="62" rx="22" ry="11" fill="#fff" opacity=".7" transform="rotate(-24 116 62)"/>
  <circle cx="186" cy="92" r="6" fill="#fff" opacity=".35"/><circle cx="172" cy="100" r="3" fill="#fff" opacity=".4"/><circle cx="104" cy="98" r="4" fill="#fff" opacity=".3"/>
  <ellipse cx="190" cy="108" rx="26" ry="8" fill="#fff" opacity=".13"/>`),B1=(()=>{let s="";for(let t=1;t<=5;t++)s+=`<ellipse cx="170" cy="82" rx="${t*26}" ry="${t*9.5}" fill="none" stroke="rgba(190,255,250,${.62-t*.1})" stroke-width="${2.6-t*.28}"/>`;return Zo("pond",`<defs><radialGradient id="$id-bg" cx=".55" cy=".5" r=".9"><stop offset="0" stop-color="#2f8f9b"/><stop offset="1" stop-color="#0a2a3a"/></radialGradient>
  <radialGradient id="$id-m" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/><ellipse cx="60" cy="24" rx="46" ry="16" fill="url(#$id-m)"/>${s}
  <path d="M60 104 a30 12 0 1 0 58 -4 l-26 8z" fill="#4fae6b"/><path d="M60 104 a30 12 0 1 0 58 -4" fill="none" stroke="#2c7a49" stroke-width="2"/>
  <g transform="translate(240 112)"><ellipse cx="0" cy="4" rx="22" ry="8" fill="#3c9a5a"/>${[-26,-13,0,13,26].map(t=>`<ellipse cx="0" cy="-5" rx="5" ry="11" fill="#ffc6e0" transform="rotate(${t})"/>`).join("")}<circle cy="-2" r="4" fill="#ffe28a"/></g>
  <path d="M168 60 q10 -6 18 0 q-6 8 -18 0z" fill="#ff9a4d" opacity=".85"/>`)})(),z1=(()=>{let s=["#ff9ec8","#ffc59a","#fff2a8","#9fffd9","#9fd3ff","#c3a6ff","#ff9ec8"],t=s.map((n,i)=>{let r=40+i*37,o=46+i*17%4*14;return`<line x1="${r}" y1="34" x2="${r}" y2="50" stroke="rgba(255,255,255,.5)" stroke-width="1"/>
    <circle cx="${r}" cy="${50+o/2}" r="${o/2+8}" fill="url(#$id-g${i})" opacity=".55"/>
    <path d="M${r} 50 l7 7 v${o-14} l-7 7 l-7 -7 v-${o-14}z" fill="${n}" opacity=".92"/><path d="M${r} 50 l-7 7 v${o-14} l7 7z" fill="#fff" opacity=".28"/>`}).join(""),e=Array.from({length:30},(n,i)=>`<circle cx="${i*97%300}" cy="${i*53%90}" r="${.6+i%3*.4}" fill="#fff" opacity="${.35+i%4*.15}"/>`).join("");return Zo("chimes",`<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1034"/><stop offset="1" stop-color="#3a1d5c"/></linearGradient>
  ${s.map((n,i)=>`<radialGradient id="$id-g${i}"><stop offset="0" stop-color="${n}" stop-opacity=".7"/><stop offset="1" stop-color="${n}" stop-opacity="0"/></radialGradient>`).join("")}
  <radialGradient id="$id-moon"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fff4d6"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>${e}<circle cx="252" cy="26" r="26" fill="url(#$id-moon)" opacity=".8"/>
  <rect x="22" y="28" width="256" height="7" rx="3.5" fill="#6b4a3a"/>${t}`)})(),dd=[{id:"bubbles",title:"Bubble Wrap",tagline:"Crisp, satisfying pops. Tap, or sweep across the sheet.",kind:"2D",accent:"#ff8fc0",art:N1,load:()=>Promise.resolve().then(()=>(jp(),Qp))},{id:"sand",title:"Zen Sand",tagline:"Rake slow lines through warm sand. Place a stone.",kind:"2D",accent:"#e8c98f",art:U1,load:()=>Promise.resolve().then(()=>(sm(),im))},{id:"rain",title:"Rainy Window",tagline:"Wipe the fog off cold glass and watch the city blur.",kind:"2D",accent:"#7aa8ff",art:F1,load:()=>Promise.resolve().then(()=>(lm(),am))},{id:"slime",title:"Slime Squish",tagline:"Press, stretch and squelch a glossy 3D blob.",kind:"3D",accent:"#ff7fc0",art:O1,load:()=>Promise.resolve().then(()=>(vx(),_x))},{id:"pond",title:"Moonlit Pond",tagline:"Drop pebbles into still water. Ripples sing back.",kind:"3D",accent:"#4fd1c5",art:B1,load:()=>Promise.resolve().then(()=>(Sx(),Mx))},{id:"chimes",title:"Crystal Chimes",tagline:"Brush through glowing glass bells in the night air.",kind:"3D",accent:"#c3a6ff",art:z1,load:()=>Promise.resolve().then(()=>(wx(),bx))}];hi();var ge=s=>document.querySelector(s),Ax=Bc(),k1={volume:.8,muted:!1,haptics:!0,ambience:!0,quality:"auto"},Ex={};try{Ex=JSON.parse(Ax.getItem("hush:settings")||"{}")}catch{}var Ie={...k1,...Ex},Uc=()=>Ax.setItem("hush:settings",JSON.stringify(Ie)),V1=()=>Ie.quality==="auto"?Yp():Ie.quality,rn=new zc(Ie);window.__hush={audio:rn,settings:Ie};var G1={splash:ge("#splash"),hub:ge("#hub"),stage:ge("#stage")},hr=null;function vd(s){if(hr!==s){hr=s;for(let[t,e]of Object.entries(G1))t===s?(e.hidden=!1,requestAnimationFrame(()=>requestAnimationFrame(()=>e.classList.add("show")))):e.hidden||(e.classList.remove("show"),setTimeout(()=>{hr!==t&&(e.hidden=!0)},650))}}var H1='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6l-5 4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.500 8.500 0 0 1 0 12"/></svg>',W1='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6l-5 4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';function Vp(){for(let s of[ge("#btn-mute"),ge("#btn-mute-hub")])s.innerHTML=Ie.muted?W1:H1,s.setAttribute("aria-label",Ie.muted?"Unmute":"Mute")}function Cx(){Ie.muted=!Ie.muted,Uc(),rn.applyVolume(),Vp()}ge("#btn-mute").addEventListener("click",Cx);ge("#btn-mute-hub").addEventListener("click",Cx);Vp();var Rx=ge("#grid");dd.forEach((s,t)=>{let e=document.createElement("button");e.className="card",e.type="button",e.dataset.kind=s.kind,e.style.setProperty("--i",t),e.style.setProperty("--accent",s.accent),e.innerHTML=`<div class="art">${s.art}<span class="badge">${s.kind}</span></div><div class="meta"><h3>${s.title}</h3><p>${s.tagline}</p></div>`,e.addEventListener("click",()=>{rn.burst(pd??yd(),{dur:.05,gain:.12,freq:3200,q:1.5}),location.hash=s.id}),Rx.appendChild(e)});document.querySelectorAll(".chip").forEach(s=>{s.addEventListener("click",()=>{document.querySelectorAll(".chip").forEach(e=>e.classList.toggle("active",e===s));let t=s.dataset.filter;Rx.querySelectorAll(".card").forEach((e,n)=>{let i=t==="all"||e.dataset.kind===t;e.hidden=!i,i&&(e.style.animation="none",e.offsetWidth,e.style.animation="",e.style.setProperty("--i",n%6))})})});var pd=null,xd=null;function yd(){return pd||(pd=rn.createBus({gain:1})),pd}var X1=[[50,57,62,64,69],[48,55,60,64,67],[53,57,60,64,69],[45,52,57,60,64]];function Gp(){!rn.ready||xd||!Ie.ambience||(xd=new Tn(rn,yd(),{chords:X1,gain:.085,cutoff:1400,period:16}))}function Px(){xd?.stop(1.2),xd=null}var Lc=ge("#hud"),Ic=ge("#hud-hint"),fd=ge("#hud-tools"),Op=0,Tx=0;function Jo(){Lc.classList.remove("idle"),clearTimeout(Tx),Tx=setTimeout(()=>{!Lc.matches(":hover")&&!Lc.contains(document.activeElement)?Lc.classList.add("idle"):Jo()},3600)}ge("#game-root").addEventListener("pointerdown",Jo,!0);ge("#game-root").addEventListener("pointermove",s=>{(s.pointerType!=="mouse"||Math.abs(s.movementX)+Math.abs(s.movementY)>6)&&Jo()},!0);Lc.addEventListener("pointermove",Jo);window.addEventListener("keydown",Jo);function q1(){return{setHint(t,e=7e3){clearTimeout(Op),Ic.textContent=t,Ic.classList.toggle("show",!!t),t&&e&&(Op=setTimeout(()=>Ic.classList.remove("show"),e))},setStat(t){ge("#hud-stat").textContent=t??""},segmented({label:t,options:e,value:n,onChange:i}){let r=document.createElement("div");if(r.className="seg",r.setAttribute("role","group"),t){let l=document.createElement("span");l.className="seg-label",l.textContent=t,r.appendChild(l)}let o=new Map,a=l=>o.forEach((c,h)=>{c.classList.toggle("on",h===l),c.setAttribute("aria-pressed",h===l)});for(let l of e){let c=document.createElement("button");c.type="button",c.textContent=l.label,c.addEventListener("click",()=>{a(l.id),i(l.id)}),o.set(l.id,c),r.appendChild(c)}return a(n),fd.appendChild(r),{el:r,set:a}},button({label:t,onClick:e,title:n}){let i=document.createElement("button");return i.type="button",i.className="tool-btn",i.textContent=t,n&&(i.title=n),i.addEventListener("click",e),fd.appendChild(i),i},swatches({colors:t,value:e=0,onChange:n}){let i=document.createElement("div");i.className="swatches";let r=t.map((a,l)=>{let c=document.createElement("button");return c.type="button",c.style.background=a,c.style.color=a,c.setAttribute("aria-label",`Color ${l+1}`),c.addEventListener("click",()=>{o(l),n(l)}),i.appendChild(c),c}),o=a=>r.forEach((l,c)=>l.classList.toggle("on",c===a));return o(e),fd.appendChild(i),{el:i,set:o}},clear(){fd.innerHTML="",Ic.classList.remove("show"),Ic.textContent="",ge("#hud-stat").textContent="",clearTimeout(Op)}}}var Dc=q1(),md=null,gd=0;async function Ix(s){let t=dd.find(l=>l.id===s);if(!t)return Hp();let e=++gd;await Lx(),Px(),await rn.unlock(),ge("#hud-title").textContent=t.title,Dc.clear();let n=ge("#loading");n.hidden=!1,vd("stage"),Jo();let i;try{i=await t.load()}catch(l){console.error(l),n.hidden=!0,Dc.setHint("Could not load this game.",4e3);return}if(e!==gd)return;let r=ge("#game-root"),o=rn.ready?rn.createBus({gain:1}):null,a={audio:rn,bus:o,settings:Ie,root:r,hud:Dc,quality:V1(),meta:t};try{let l=await i.create(a);if(e!==gd){l?.destroy?.(),o?.dispose();return}md={instance:l,bus:o,meta:t}}catch(l){console.error(l),Dc.setHint("This game needs WebGL or Canvas support that your browser is missing.",8e3)}n.hidden=!0}async function Lx(){if(!md)return;let{instance:s,bus:t}=md;md=null;try{s?.destroy?.()}catch(e){console.error(e)}t?.dispose(.15),ge("#game-root").innerHTML="",Dc.clear()}function Hp(){gd++,Lx(),vd("hub"),Gp()}function Y1(){if(hr==="splash"||hr===null)return;let s=location.hash.replace("#","");s?Ix(s):Hp()}window.addEventListener("hashchange",Y1);ge("#btn-back").addEventListener("click",()=>{location.hash?history.length>1?history.back():location.hash="":Hp()});window.addEventListener("keydown",s=>{s.key==="Escape"&&(ge("#settings").hidden?hr==="stage"&&ge("#btn-back").click():Wp())});ge("#btn-full").addEventListener("click",()=>{let s=document.documentElement;document.fullscreenElement?document.exitFullscreen?.():(s.requestFullscreen||s.webkitRequestFullscreen)?.call(s).catch?.(()=>{})});document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen||(ge("#btn-full").hidden=!0);var _d=ge("#settings"),Nc=ge("#set-volume"),Bp=ge("#set-ambience"),zp=ge("#set-haptics"),kp=ge("#set-quality");function $1(){Nc.value=Ie.volume,Bp.checked=Ie.ambience,zp.checked=Ie.haptics,kp.value=Ie.quality,_d.hidden=!1,Nc.focus()}function Wp(){_d.hidden=!0,ge("#btn-settings").focus()}ge("#btn-settings").addEventListener("click",$1);ge("#settings-close").addEventListener("click",Wp);_d.addEventListener("pointerdown",s=>{s.target===_d&&Wp()});Nc.addEventListener("input",()=>{Ie.volume=Ht(parseFloat(Nc.value),0,1),Ie.volume>0&&Ie.muted&&(Ie.muted=!1,Vp()),rn.applyVolume(),Uc()});Nc.addEventListener("change",()=>{rn.ready&&rn.bell(yd(),{freq:784,gain:.12,decay:1.4,vel:.5})});Bp.addEventListener("change",()=>{Ie.ambience=Bp.checked,Uc(),Ie.ambience?hr==="hub"&&Gp():Px(),window.dispatchEvent(new CustomEvent("hush:ambience",{detail:Ie.ambience}))});zp.addEventListener("change",()=>{Ie.haptics=zp.checked,Uc()});kp.addEventListener("change",()=>{Ie.quality=kp.value,Uc()});document.addEventListener("visibilitychange",()=>{document.hidden?rn.suspend():rn.resume()});ge("#begin").addEventListener("click",async()=>{await rn.unlock();let s=location.hash.replace("#","");s&&dd.some(t=>t.id===s)?Ix(s):(vd("hub"),Gp()),rn.ready&&rn.bell(yd(),{freq:523.25,gain:.14,decay:2.2,vel:.5})});vd("splash");ge("#begin").focus({preventScroll:!0});})();
