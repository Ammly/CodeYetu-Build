(function () {
  "use strict";
  var C = window.CONTENT;
  var STEPS = C.steps, PATHS = C.paths;
  var SLOTS = ["appname", "users", "problem", "thing", "things", "fields"];

  // optional reference repo (clone-if-stuck safety net). Leave "" to hide.
  var REFERENCE_REPO_URL = "";

  /* ---------- safe storage (persists when hosted, memory in sandbox) ---------- */
  var mem = {};
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return (k in mem) ? mem[k] : null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
  };
  var KEY = "codeyetu-build-v2";

  /* ---------- state ---------- */
  var state = { path: "tracker", idea: {}, done: {}, reflect: {}, open: 0, mode: "ai" };
  (function load() {
    var raw = store.get(KEY);
    if (raw) { try { state = Object.assign(state, JSON.parse(raw)); } catch (e) {} }
    if (!state.idea || !Object.keys(state.idea).length) state.idea = Object.assign({}, PATHS[state.path].idea);
  })();
  function save() { store.set(KEY, JSON.stringify(state)); }

  /* ---------- helpers ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function esc(t) { return (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fillText(t) { return (t || "").replace(/\{\{(\w+)\}\}/g, function (_, k) { var v = (state.idea[k] || "").trim(); return v || ("[" + k + "]"); }); }
  function fillHTML(t) { return esc(t).replace(/\{\{(\w+)\}\}/g, function (_, k) { var v = (state.idea[k] || "").trim(); return v ? '<span class="slot">' + esc(v) + '</span>' : '<span class="slot empty">[' + k + ']</span>'; }); }
  function nounize(t) { return (t || "").replace(/\{\{(\w+)\}\}/g, function (_, k) { var v = (state.idea[k] || "").trim(); return v || k; }); }

  function pathCode(pkey) { var p = PATHS[pkey]; return (typeof p.code === "string") ? PATHS[p.code].code : p.code; }
  function pathSeed(pkey) { var p = PATHS[pkey]; return (typeof p.code === "string") ? PATHS[p.code].seed : p.seed; }

  /* ---------- cumulative reference files up to a step index ---------- */
  function filesUpTo(idx) {
    var files = { html: "", css: "", js: "" }, code = pathCode(state.path);
    for (var i = 0; i <= idx; i++) {
      var ops = code[STEPS[i].id]; if (!ops) continue;
      ops.forEach(function (op) {
        if (op.mode === "replace") files[op.file] = op.content;
        else files[op.file] += op.content;
      });
    }
    return files;
  }
  function previewDoc(files) {
    var html = files.html || "<!doctype html><html><head></head><body></body></html>";
    html = html.replace(/<link[^>]*style\.css[^>]*>/i, "").replace(/<script[^>]*app\.js[^>]*><\/script>/i, "");
    if (files.css) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, "<style>" + files.css + "</style></head>") : "<style>" + files.css + "</style>" + html;
    var tail = "";
    if (files.js) tail += "<script>" + files.js + "<\/script>";
    var seed = pathSeed(state.path);
    if (files.js && seed) tail += "<script>try{" + seed + "}catch(e){}<\/script>";
    if (tail) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, tail + "</body>") : html + tail;
    return html;
  }

  /* ---------- counts ---------- */
  function stepAt(i) { var ov = (PATHS[state.path].stepOverrides || {})[STEPS[i].id] || {}; return Object.assign({}, STEPS[i], ov); }
  function stepDone(st) { var t = st.tasks || []; for (var i = 0; i < t.length; i++) if (!state.done[st.id + ":" + i]) return false; return t.length > 0; }
  function stepOn(st) { var n = 0, t = st.tasks || []; for (var i = 0; i < t.length; i++) if (state.done[st.id + ":" + i]) n++; return n; }
  function totals() { var on = 0, all = 0; STEPS.forEach(function (s, i) { var st = stepAt(i); all += (st.tasks || []).length; on += stepOn(st); }); return { on: on, all: all }; }

  /* ---------- path picker ---------- */
  function renderPaths() {
    var c = $("#paths"); c.innerHTML = "";
    Object.keys(PATHS).forEach(function (key) {
      var p = PATHS[key], b = document.createElement("button");
      b.className = "path" + (state.path === key ? " sel" : "");
      b.innerHTML = '<div class="emoji">' + p.emoji + '</div><div class="pname">' + esc(p.name) + '</div><div class="pdesc">' + esc(p.desc) + '</div>';
      b.addEventListener("click", function () {
        var preset = PATHS[key].idea;
        SLOTS.forEach(function (s) {
          var cur = (state.idea[s] || "").trim();
          var isDefault = !cur || Object.keys(PATHS).some(function (pp) { return PATHS[pp].idea[s] === cur; });
          if (isDefault) state.idea[s] = preset[s];
        });
        state.path = key; save(); applyAccent(); renderPaths(); fillFields(); renderSteps();
      });
      c.appendChild(b);
    });
  }

  /* ---------- idea fields ---------- */
  function fillFields() { SLOTS.forEach(function (s) { var el = $("#f-" + s); if (el) el.value = state.idea[s] || ""; }); }
  function wireFields() {
    SLOTS.forEach(function (s) {
      var el = $("#f-" + s); if (!el) return;
      el.addEventListener("input", function () {
        state.idea[s] = el.value; save();
        document.querySelectorAll(".prompt[data-tpl]").forEach(function (pre) { pre.innerHTML = fillHTML(pre.getAttribute("data-tpl")); });
        document.querySelectorAll(".step").forEach(function (stEl, i) {
          var es = stepAt(i);
          var t = $(".step-title", stEl); if (t) t.firstChild && (t.firstChild.textContent = nounize(es.title));
          var intro = $(".intro-text", stEl); if (intro) intro.innerHTML = nounize(es.intro);
        });
      });
    });
  }

  /* ---------- ring svg ---------- */
  function ring(frac) {
    var r = 16, circ = 2 * Math.PI * r, off = circ * (1 - frac);
    return '<svg width="38" height="38" viewBox="0 0 38 38">' +
      '<circle class="bg" cx="19" cy="19" r="' + r + '" fill="none" stroke-width="3"/>' +
      '<circle class="fg" cx="19" cy="19" r="' + r + '" fill="none" stroke-width="3" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
  }

  /* ---------- steps ---------- */
  function renderSteps() {
    var host = $("#steps"); host.innerHTML = "";
    STEPS.forEach(function (base, i) {
      var st = stepAt(i);
      var done = stepDone(st), open = state.open === i, on = stepOn(st), tot = (st.tasks || []).length;
      var el = document.createElement("div");
      el.className = "step" + (done ? " done" : "") + (open ? " open" : "");

      var badge = st.checkpoint ? '<span class="badge">' + esc(st.checkpoint) + '</span>' : "";
      var head = '<div class="step-head" data-i="' + i + '">' +
        '<div class="ring">' + ring(tot ? on / tot : 0) +
          '<div class="num">' + on + '/' + tot + '</div>' +
          '<div class="tick"><svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"/></svg></div></div>' +
        '<div class="step-titles"><div class="step-n">STEP ' + (i + 1) + badge + '</div>' +
          '<div class="step-title">' + nounize(st.title) + '</div></div>' +
        '<div class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>';

      var body = '<div class="step-body"><div class="intro intro-text">' + nounize(st.intro) + '</div>';

      // tasks
      body += '<ul class="tasks">';
      (st.tasks || []).forEach(function (task, ti) {
        var onc = !!state.done[st.id + ":" + ti];
        body += '<li class="task' + (onc ? " on" : "") + '" data-task="' + st.id + ":" + ti + '">' +
          '<span class="box"><svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"/></svg></span>' +
          '<span class="txt">' + nounize(task) + '</span></li>';
      });
      body += '</ul>';

      if (st.type === "setup") body += setupHTML();

      // build steps: two ways to build, in tabs (AI prompt OR copy the code)
      if (st.type === "build") {
        var ai = state.mode !== "code", ops = pathCode(state.path)[st.id] || [];

        body += '<div class="tabs">' +
          '<button class="tab' + (ai ? " on" : "") + '" data-tab="ai">✨ Build with AI</button>' +
          '<button class="tab' + (!ai ? " on" : "") + '" data-tab="code">⌨️ Type the code</button></div>';

        // AI panel
        body += '<div class="tabpanel' + (ai ? " on" : "") + '" data-panel="ai">';
        if (st.prompt) body += '<div class="promptcard"><div class="promptbar"><span class="lbl">PASTE THIS TO YOUR AI</span>' +
          '<button class="copybtn" data-copyprompt="' + esc(st.prompt) + '">Copy prompt</button></div>' +
          '<div class="prompt" data-tpl="' + esc(st.prompt) + '">' + fillHTML(st.prompt) + '</div></div>';
        body += '</div>';

        // Code panel
        body += '<div class="tabpanel' + (!ai ? " on" : "") + '" data-panel="code">';
        body += '<p class="codeintro">No AI? No problem. Copy each block into the file shown, then save. Do every step and you\'ll have a working app.</p>';
        ops.forEach(function (op) {
          body += '<div class="codeblock"><div class="codebar"><span class="fname">' + esc(op.label || op.file) + '</span>' +
            '<button class="copybtn" data-copycode="1">Copy code</button></div>' +
            '<pre class="code">' + esc(op.content.replace(/^\n+/, "")) + '</pre></div>';
        });
        body += '</div>';

        // shared live preview (the expected result)
        body += '<div class="preview"><div class="pv-head"><div class="pv-title">Expected result: <span class="what">' + nounize(st.expect || "") + '</span></div>' +
          '<button class="pv-refresh" data-pv="' + i + '">↻ Refresh</button></div>' +
          '<iframe class="pv-frame" data-pvframe="' + i + '" sandbox="allow-scripts" referrerpolicy="no-referrer" title="Preview of step ' + (i + 1) + '"></iframe>' +
          '<div class="pv-note">This is the example build. Yours will look similar but use your own idea. Try clicking inside it!</div></div>';
      }

      // go further ideas
      if (st.id === "yours") {
        body += '<div class="callout think"><b>🚀 Ideas to go further</b><ul class="gf">';
        PATHS[state.path].goFurther.forEach(function (g) { body += '<li>' + esc(g) + '</li>'; });
        body += '</ul></div>';
      }

      // reflections
      if (st.reflect) st.reflect.forEach(function (r) {
        var rk = st.id + ":" + r.k;
        body += '<div class="reflect"><label>' + esc(r.label) + '</label><textarea data-reflect="' + rk + '" placeholder="Type your answer…">' + esc(state.reflect[rk] || "") + '</textarea></div>';
      });

      if (st.type === "build") body += '<div class="callout stuck"><b>🆘 Stuck?</b><br>' + nounize(st.stuck || "") + '</div>';
      if (st.type === "think") body += '<div class="callout think"><b>💡 Product thinking</b><br>This is what turns code into a real product people want.</div>';

      body += '</div>';
      el.innerHTML = head + body;
      host.appendChild(el);
    });
    wireSteps();
    paintPreviews();
    updateProgress();
  }

  function setupHTML() {
    var clone = REFERENCE_REPO_URL ? '<li>Badly stuck? Clone a working version: <code class="inline">' + esc(REFERENCE_REPO_URL) + '</code></li>' : '';
    return '<ol class="steps-mini">' +
      '<li>Open your editor (<code class="inline">VS Code</code> with Copilot or Claude).</li>' +
      '<li>New folder → create <code class="inline">index.html</code>, <code class="inline">style.css</code>, <code class="inline">app.js</code>.</li>' +
      '<li>Install <b>Live Server</b>, right-click index.html → <b>Open with Live Server</b>.</li>' +
      '<li>Sign in to your AI assistant.</li>' + clone + '</ol>';
  }

  function paintPreviews() {
    var i = state.open; if (i < 0 || !STEPS[i] || STEPS[i].type !== "build") return;
    var fr = document.querySelector('[data-pvframe="' + i + '"]'); if (!fr) return;
    fr.srcdoc = previewDoc(filesUpTo(i));
  }

  /* animate progress ring fg arc from empty → current fill */
  function animateRing(idx) {
    var fgs = (idx >= 0)
      ? (function () { var els = document.querySelectorAll(".step"); return els[idx] ? [els[idx].querySelector(".ring .fg")] : []; }())
      : document.querySelectorAll(".ring .fg");
    Array.prototype.forEach.call(fgs, function (fg) {
      if (!fg) return;
      var arr    = parseFloat(fg.getAttribute("stroke-dasharray")  || 100);
      var target = fg.getAttribute("stroke-dashoffset") || "0";
      fg.style.transition        = "none";
      fg.style.strokeDashoffset  = arr;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fg.style.transition       = "stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)";
          fg.style.strokeDashoffset = target;
        });
      });
    });
  }

  function wireSteps() {
    document.querySelectorAll(".step-head").forEach(function (h) {
      h.addEventListener("click", function () {
        var i = +h.getAttribute("data-i");
        /* animate collapse before re-render when closing the open step */
        if (state.open === i) {
          var stepEl = h.closest(".step");
          var body   = stepEl && stepEl.querySelector(".step-body");
          if (body) {
            body.style.animation = "stepCollapse .2s ease forwards";
            var chev = stepEl.querySelector(".chev");
            if (chev) chev.style.animation = "chevClose .2s ease forwards";
            setTimeout(function () { state.open = -1; save(); renderSteps(); }, 185);
            return;
          }
        }
        state.open = (state.open === i ? -1 : i); save(); renderSteps();
      });
    });
    document.querySelectorAll(".task").forEach(function (li) {
      li.addEventListener("click", function () {
        var k = li.getAttribute("data-task"), sid = k.split(":")[0];
        var sidx = -1; STEPS.forEach(function (s, ix) { if (s.id === sid) sidx = ix; });
        var st = sidx >= 0 ? stepAt(sidx) : null;
        var before = st ? stepDone(st) : false;
        var rect = li.getBoundingClientRect();
        state.done[k] = !state.done[k]; save();
        var after = st ? stepDone(st) : false;
        var allAfter = STEPS.every(function (s, ix) { return stepDone(stepAt(ix)); });
        renderSteps();
        animateRing(sidx);
        if (!before && after) {
          /* ring pop on step completion */
          var stepEls = document.querySelectorAll(".step");
          if (sidx >= 0 && stepEls[sidx]) {
            var rEl = stepEls[sidx].querySelector(".ring");
            if (rEl) { rEl.classList.remove("justdone"); void rEl.offsetWidth; rEl.classList.add("justdone"); }
          }
          if (allAfter) bigConfetti(); else smallConfetti(rect);
        }
      });
    });
    document.querySelectorAll(".tab").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        state.mode = b.getAttribute("data-tab"); save();
        document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("on", t.getAttribute("data-tab") === state.mode); });
        document.querySelectorAll(".tabpanel").forEach(function (p) { p.classList.toggle("on", p.getAttribute("data-panel") === state.mode); });
      });
    });
    document.querySelectorAll("[data-copyprompt]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); doCopy(b, fillText(b.getAttribute("data-copyprompt"))); });
    });
    document.querySelectorAll("[data-copycode]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); var pre = b.closest(".codeblock").querySelector(".code"); doCopy(b, pre.textContent); });
    });
    document.querySelectorAll(".pv-refresh").forEach(function (b) {
      b.addEventListener("click", function () { var i = +b.getAttribute("data-pv"); var fr = document.querySelector('[data-pvframe="' + i + '"]'); if (fr) fr.srcdoc = previewDoc(filesUpTo(i)); });
    });
    document.querySelectorAll("textarea[data-reflect]").forEach(function (t) {
      t.addEventListener("input", function () { state.reflect[t.getAttribute("data-reflect")] = t.value; save(); });
    });
  }

  function doCopy(btn, text) {
    var label = btn.textContent, done = function () { btn.textContent = "✓ Copied!"; btn.classList.add("copied"); setTimeout(function () { btn.textContent = label; btn.classList.remove("copied"); }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); done(); }
  }

  function updateProgress() {
    var t = totals(), pct = t.all ? Math.round(t.on / t.all * 100) : 0;
    $("#progbar").style.width = pct + "%";
    $("#proglabel").textContent = pct + "%";
    var lvl = pct >= 100 ? "Shipped! 🚀" : pct >= 75 ? "Almost there" : pct >= 50 ? "Looking like an app" : pct >= 25 ? "Taking shape" : pct > 0 ? "Warming up" : "Let's go";
    var le = $("#level"); if (le) le.textContent = lvl;
    var allDone = STEPS.every(function (s, i) { return stepDone(stepAt(i)); });
    $("#celebrate").classList.toggle("show", allDone);
  }

  /* ---------- reset ---------- */
  $("#reset").addEventListener("click", function () {
    if (confirm("Reset all progress and answers? This can't be undone.")) {
      store.del(KEY);
      state = { path: "tracker", idea: Object.assign({}, PATHS.tracker.idea), done: {}, reflect: {}, open: 0, mode: "ai" };
      save(); renderPaths(); fillFields(); renderSteps();
    }
  });

  /* ---------- accent + delight ---------- */
  var ACCENT = { tracker: "#00A651", shop: "#C47D00", custom: "#7C3AED" };
  function applyAccent() {
    document.body.dataset.accent = state.path;
    if (window.__setHeroColor) window.__setHeroColor(ACCENT[state.path] || ACCENT.tracker);
  }
  function smallConfetti(rect) {
    if (!window.confetti) return;
    var x = (rect.left + rect.width / 2) / window.innerWidth, y = (rect.top + rect.height / 2) / window.innerHeight;
    window.confetti({ particleCount: 45, spread: 55, startVelocity: 28, origin: { x: x, y: y }, colors: [ACCENT[state.path], "#ffffff", "#ffd479"], disableForReducedMotion: true });
  }
  function bigConfetti() {
    if (!window.confetti) return;
    var end = Date.now() + 900, c = [ACCENT[state.path], "#ffffff", "#ffd479", "#00A651"];
    (function frame() {
      window.confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors: c, disableForReducedMotion: true });
      window.confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors: c, disableForReducedMotion: true });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  /* ---------- Three.js hero — building blocks (guarded, light, optional) ---------- */
  function initHero() {
    var canvas = document.getElementById("bg");
    if (!canvas || !window.THREE) return;

    /* hard guards — must be first */
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    if (reduce || (navigator.hardwareConcurrency || 4) <= 2) return;

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false }); }
    catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    /* scene */
    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 14;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    var key  = new THREE.DirectionalLight(0xffffff, 0.90); key.position.set(6, 10, 12); scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.22); fill.position.set(-5, -3, 5);  scene.add(fill);

    /* colour state — chases accent changes via lerp every frame */
    var baseHex = ACCENT[state.path] || "#00A651";
    var targetC = new THREE.Color(baseHex);
    var curC    = new THREE.Color(baseHex);

    /* three material tiers: solid / translucent / metallic */
    var M = [
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.88, roughness: 0.40, metalness: 0.10 }),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.55, roughness: 0.58, metalness: 0.00 }),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.76, roughness: 0.20, metalness: 0.45 }),
    ];
    M.forEach(function (m) { m.color.copy(curC); });

    /* geometry library: cube · H-brick · V-brick · diamond · pyramid */
    var G = [
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.BoxGeometry(1.9, 0.55, 0.55),
      new THREE.BoxGeometry(0.55, 1.9, 0.55),
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.TetrahedronGeometry(0.72, 0),
    ];

    /* spawn 22 blocks */
    var blocks = [];
    for (var i = 0; i < 22; i++) {
      var mesh = new THREE.Mesh(G[i % G.length], M[i % M.length]);
      var s = 0.40 + Math.random() * 1.55;
      mesh.scale.set(s, s * (0.75 + Math.random() * 0.5), s);
      var by = (Math.random() - 0.5) * 13;
      mesh.position.set((Math.random() - 0.5) * 26, by, (Math.random() - 0.5) * 7);
      mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      mesh.userData = {
        rx:    (Math.random() - 0.5) * 0.011,  /* per-frame rotation X */
        ry:    (Math.random() - 0.5) * 0.011,  /* per-frame rotation Y */
        sp:    0.40 + Math.random() * 1.5,     /* drift speed */
        ph:    Math.random() * 6.28,            /* drift phase */
        amp:   0.5  + Math.random() * 1.2,     /* drift amplitude */
        baseY: by,                              /* stable vertical anchor */
      };
      scene.add(mesh); blocks.push(mesh);
    }

    /* hook used by applyAccent() to change colour */
    window.__setHeroColor = function (hex) { targetC.set(hex); };

    /* resize — ResizeObserver when available, resize event as fallback */
    var _W = 0, _H = 0;
    function resize() {
      var w = (canvas.parentElement || canvas).clientWidth || 600;
      var h = canvas.clientHeight || 300;
      if (w === _W && h === _H) return;
      _W = w; _H = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    }
    resize();
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(canvas.parentElement || canvas); }
    else { window.addEventListener("resize", resize); }

    /* pointer + touch parallax */
    var px = 0, py = 0;
    window.addEventListener("mousemove", function (e) {
      px = (e.clientX / window.innerWidth  - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    window.addEventListener("touchmove", function (e) {
      if (e.touches.length) {
        px = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
        py = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }
    }, { passive: true });

    /* scroll — fade canvas as hero leaves viewport */
    var fade = 1;
    window.addEventListener("scroll", function () {
      fade = Math.max(0, 1 - window.scrollY / 300);
      canvas.style.opacity = fade;
    }, { passive: true });

    /* RAF loop — proper pause when tab is hidden */
    var rafId = null;
    var cx = 0, cy = 0;    /* lerped camera x/y */
    var t0 = Date.now();

    function stopLoop()  { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
    function startLoop() { if (!rafId) { rafId = requestAnimationFrame(loop); } }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopLoop(); else startLoop();
    });

    function loop() {
      rafId = requestAnimationFrame(loop);
      var t = (Date.now() - t0) * 0.001;

      /* colour lerp — always runs so colour is ready when hero scrolls back */
      curC.lerp(targetC, 0.025);
      M[0].color.copy(curC);
      M[1].color.copy(curC).multiplyScalar(0.78);
      M[2].color.copy(curC).multiplyScalar(1.20);
      M[2].color.r = Math.min(1, M[2].color.r);
      M[2].color.g = Math.min(1, M[2].color.g);
      M[2].color.b = Math.min(1, M[2].color.b);

      /* drift + spin — always runs so position is live when hero reappears */
      blocks.forEach(function (b) {
        b.rotation.x += b.userData.rx;
        b.rotation.y += b.userData.ry;
        b.position.y = b.userData.baseY + Math.sin(t * b.userData.sp + b.userData.ph) * 0.28 * b.userData.amp;
      });

      /* camera lazily tracks pointer */
      cx += (px * 2.6 - cx) * 0.04;
      cy += (-py * 1.6 - cy) * 0.04;
      camera.position.x = cx;
      camera.position.y = cy;
      camera.lookAt(0, 0, 0);

      /* skip GPU render when hero is scrolled away */
      if (fade <= 0.01) return;
      renderer.render(scene, camera);
    }

    startLoop();
  }

  /* ---------- init ---------- */
  applyAccent(); renderPaths(); fillFields(); wireFields(); renderSteps();
  requestAnimationFrame(function () { animateRing(-1); });
  initHero();
  /* scroll shadow on sticky header — pure visual, no state */
  (function(){var h=document.querySelector('header.top');if(!h)return;window.addEventListener('scroll',function(){h.classList.toggle('scrolled',window.scrollY>4);},{passive:true});})();
})();

