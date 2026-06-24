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
  function fillHTML(t) {
    var html = esc(t);
    // 1. Highlight list indicators: numbers (e.g. 1.) or dashes (e.g. -) at start of line
    html = html.replace(/(^|\n)(\s*\d+\.|\s*[-•*])/g, '$1<span class="hl-bullet">$2</span>');
    // 2. Highlight key labels/headers
    html = html.replace(/(Requirements:|Output ONLY the complete HTML file\.|Output ONLY the CSS\.|Output ONLY the complete app\.js\.)/g, '<span class="hl-kw">$1</span>');
    // 3. Highlight string literals (double quotes)
    html = html.replace(/"([^"\n]*?)"/g, '<span class="hl-str">"$1"</span>');
    // 4. Highlight placeholder slots
    html = html.replace(/\{\{(\w+)\}\}/g, function (_, k) {
      var v = (state.idea[k] || "").trim();
      return v ? '<span class="slot">' + esc(v) + '</span>' : '<span class="slot empty">[' + k + ']</span>';
    });
    return html;
  }
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
  function getStepSummary(st, done, on, tot) {
    if (done) {
      return '✨ All tasks complete!';
    }
    if (st.id === "plan") {
      var appName = (state.idea.appname || "").trim();
      if (appName) {
        return '✏️ Building: <strong>' + esc(appName) + '</strong>' + (state.idea.users ? ' for ' + esc(state.idea.users) : '');
      }
      return '📝 Brainstorm your app idea to begin';
    }
    if (st.type === "build") {
      return '🛠️ Code ' + esc(st.file || '') + ' · ' + on + '/' + tot + ' tasks done';
    }
    return '👉 ' + on + '/' + tot + ' tasks done';
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
      
      // Step head with level-select circular progress node
      var head = '<div class="step-head" data-i="' + i + '">' +
        '<div class="ring level-node' + (done ? ' done' : '') + '">' +
          ring(tot ? on / tot : 0) +
          '<div class="num">' + (i + 1) + '</div>' +
          '<div class="tick"><svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"/></svg></div>' +
        '</div>' +
        '<div class="step-titles">' +
          '<div class="step-n">LEVEL ' + (i + 1) + ' · <span class="step-prog-frac">' + on + '/' + tot + ' done</span>' + badge + '</div>' +
          '<div class="step-title">' + nounize(st.title) + '</div>' +
          '<div class="step-summary">' + getStepSummary(st, done, on, tot) + '</div>' +
        '</div>' +
        '<div class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>' +
      '</div>';

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

        // AI panel with terminal styling dots
        body += '<div class="tabpanel' + (ai ? " on" : "") + '" data-panel="ai">';
        if (st.prompt) {
          body += '<div class="promptcard">' +
            '<div class="promptbar">' +
              '<div class="terminal-dots"><span class="terminal-dot red"></span><span class="terminal-dot yellow"></span><span class="terminal-dot green"></span></div>' +
              '<span class="lbl">terminal - AI Prompt</span>' +
              '<button class="copybtn" data-copyprompt="' + esc(st.prompt) + '">Copy prompt</button>' +
            '</div>' +
            '<div class="prompt" data-tpl="' + esc(st.prompt) + '">' + fillHTML(st.prompt) + '</div>' +
          '</div>';
        }
        body += '</div>';

        // Code panel with terminal styling dots
        body += '<div class="tabpanel' + (!ai ? " on" : "") + '" data-panel="code">';
        body += '<p class="codeintro">No AI? No problem. Copy each block into the file shown, then save. Do every step and you\'ll have a working app.</p>';
        ops.forEach(function (op) {
          body += '<div class="codeblock">' +
            '<div class="codebar">' +
              '<div class="terminal-dots"><span class="terminal-dot red"></span><span class="terminal-dot yellow"></span><span class="terminal-dot green"></span></div>' +
              '<span class="fname">' + esc(op.label || op.file) + '</span>' +
              '<button class="copybtn" data-copycode="1">Copy code</button>' +
            '</div>' +
            '<pre class="code">' + esc(op.content.replace(/^\n+/, "")) + '</pre>' +
          '</div>';
        });
        body += '</div>';

        // embedded browser mockup wrapper for preview
        body += '<div class="preview">' +
          '<div class="pv-head">' +
            '<div class="pv-title">Expected result: <span class="what">' + nounize(st.expect || "") + '</span></div>' +
            '<button class="pv-refresh" data-pv="' + i + '">↻ Refresh</button>' +
          '</div>' +
          '<div class="browser-mockup">' +
            '<div class="browser-bar">' +
              '<div class="browser-dots"><span class="b-dot"></span><span class="b-dot"></span><span class="b-dot"></span></div>' +
              '<div class="browser-nav">' +
                '<span class="nav-arrow">&larr;</span>' +
                '<span class="nav-arrow">&rarr;</span>' +
              '</div>' +
              '<div class="browser-address">' +
                '<span class="lock-icon">🔒</span>' +
                '<span class="url">localhost:3000/' + esc(st.file || 'app') + '</span>' +
              '</div>' +
            '</div>' +
            '<iframe class="pv-frame" data-pvframe="' + i + '" sandbox="allow-scripts" referrerpolicy="no-referrer" title="Preview of step ' + (i + 1) + '"></iframe>' +
          '</div>' +
          '<div class="pv-note">This is the example build. Yours will look similar but use your own idea. Try clicking inside it!</div>' +
        '</div>';
      }

      // go further ideas
      if (st.id === "yours") {
        body += '<div class="callout think">' +
          '<div class="callout-icon">' +
            '<svg class="illustrated-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
              '<circle cx="32" cy="28" r="20" fill="rgba(245, 158, 11, 0.1)"/>' +
              '<path d="M32 8C20.95 8 12 16.95 12 28C12 34.68 15.24 40.61 20.25 44.29C23.09 46.37 24.85 49.56 25.13 53H38.87C39.15 49.56 40.91 46.37 43.75 44.29C48.76 40.61 52 34.68 52 28C52 16.95 43.05 8 32 8Z" stroke="#F59E0B" stroke-width="3" stroke-linejoin="round"/>' +
              '<path d="M28 28L32 20L36 28" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<path d="M26 53H38" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>' +
              '<path d="M28 58H36" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>' +
            '</svg>' +
          '</div>' +
          '<div class="callout-content">' +
            '<span class="callout-title">💡 Ideas to go further</span>' +
            '<ul class="gf">';
        PATHS[state.path].goFurther.forEach(function (g) { body += '<li>' + esc(g) + '</li>'; });
        body += '</ul>' +
          '</div>' +
        '</div>';
      }

      // reflections
      if (st.reflect) st.reflect.forEach(function (r) {
        var rk = st.id + ":" + r.k;
        body += '<div class="reflect"><label>' + esc(r.label) + '</label><textarea data-reflect="' + rk + '" placeholder="Type your answer…">' + esc(state.reflect[rk] || "") + '</textarea></div>';
      });

      // Redesigned soft friendly stuck alert callout
      if (st.type === "build") {
        body += '<div class="callout stuck">' +
          '<div class="callout-icon">' +
            '<svg class="illustrated-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
              '<circle cx="32" cy="32" r="24" fill="rgba(239, 68, 68, 0.08)" stroke="#F87171" stroke-width="3"/>' +
              '<circle cx="32" cy="32" r="12" fill="#FFFFFF" stroke="#F87171" stroke-width="3"/>' +
              '<path d="M32 8A24 24 0 0 1 48.97 15.03L40.49 23.51A12 12 0 0 0 32 20V8Z" fill="#F87171"/>' +
              '<path d="M56 32A24 24 0 0 1 48.97 48.97L40.49 40.49A12 12 0 0 0 44 32H56Z" fill="#F87171"/>' +
              '<path d="M32 56A24 24 0 0 1 15.03 48.97L23.51 40.49A12 12 0 0 0 32 44V56Z" fill="#F87171"/>' +
              '<path d="M8 32A24 24 0 0 1 15.03 15.03L23.51 23.51A12 12 0 0 0 20 32H8Z" fill="#F87171"/>' +
            '</svg>' +
          '</div>' +
          '<div class="callout-content">' +
            '<span class="callout-title">🆘 Stuck?</span>' +
            '<p class="callout-text">' + nounize(st.stuck || "") + '</p>' +
          '</div>' +
        '</div>';
      }
      
      if (st.type === "think") {
        body += '<div class="callout think">' +
          '<div class="callout-icon">' +
            '<svg class="illustrated-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
              '<circle cx="32" cy="28" r="20" fill="rgba(245, 158, 11, 0.1)"/>' +
              '<path d="M32 8C20.95 8 12 16.95 12 28C12 34.68 15.24 40.61 20.25 44.29C23.09 46.37 24.85 49.56 25.13 53H38.87C39.15 49.56 40.91 46.37 43.75 44.29C48.76 40.61 52 34.68 52 28C52 16.95 43.05 8 32 8Z" stroke="#F59E0B" stroke-width="3" stroke-linejoin="round"/>' +
              '<path d="M28 28L32 20L36 28" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<path d="M26 53H38" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>' +
              '<path d="M28 58H36" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>' +
            '</svg>' +
          '</div>' +
          '<div class="callout-content">' +
            '<span class="callout-title">💡 Product thinking</span>' +
            '<p class="callout-text">This is what turns code into a real product people want.</p>' +
          '</div>' +
        '</div>';
      }

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
        
        // Trigger WebGL glowing particle burst and morphing shapes delight effect
        if (window.triggerWebGLDelight) {
          window.triggerWebGLDelight(!before && after);
        }
        
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

    /* three material tiers: solid / translucent / metallic with emissive glow support */
    var M = [
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.88, roughness: 0.40, metalness: 0.10, emissive: new THREE.Color(0,0,0) }),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.55, roughness: 0.58, metalness: 0.00, emissive: new THREE.Color(0,0,0) }),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.76, roughness: 0.20, metalness: 0.45, emissive: new THREE.Color(0,0,0) }),
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
      var sy = s * (0.75 + Math.random() * 0.5);
      mesh.scale.set(s, sy, s);
      var bx = (Math.random() - 0.5) * 26;
      var by = (Math.random() - 0.5) * 13;
      var bz = (Math.random() - 0.5) * 7;
      mesh.position.set(bx, by, bz);
      mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      mesh.userData = {
        rx:    (Math.random() - 0.5) * 0.011,  /* current X spin */
        ry:    (Math.random() - 0.5) * 0.011,  /* current Y spin */
        baseRx: (Math.random() - 0.5) * 0.011, /* standard X spin */
        baseRy: (Math.random() - 0.5) * 0.011, /* standard Y spin */
        sp:    0.40 + Math.random() * 1.5,     /* drift speed */
        ph:    Math.random() * 6.28,            /* drift phase */
        amp:   0.5  + Math.random() * 1.2,     /* drift amplitude */
        scaleX: s,
        scaleY: sy,
        scaleZ: s,
        currentScaleMult: 1.0,
        targetScaleMult: 1.0,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        orbitSpeed: 0.15 + Math.random() * 0.25,
      };
      scene.add(mesh); blocks.push(mesh);
    }

    /* particle systems list */
    var activeParticleSystems = [];

    /* window hook for step completion reward delight */
    window.triggerWebGLDelight = function (isStepCompleted) {
      // 1. Morph materials to glow
      var colorHex = isStepCompleted ? (ACCENT[state.path] || "#10B981") : "#38BDF8";
      var glowColor = new THREE.Color(colorHex);
      M.forEach(function (m) {
        m.emissive.copy(glowColor).multiplyScalar(isStepCompleted ? 1.5 : 0.6);
      });

      // 2. Morph floating shapes scale & spin
      blocks.forEach(function (b) {
        b.userData.targetScaleMult = isStepCompleted ? 2.6 : 1.7;
        b.userData.rx = b.userData.baseRx * (isStepCompleted ? 9.0 : 4.5);
        b.userData.ry = b.userData.baseRy * (isStepCompleted ? 9.0 : 4.5);
      });

      // 3. Spawn a burst of glowing particles
      var pCount = isStepCompleted ? 90 : 45;
      var geom = new THREE.BufferGeometry();
      var positions = [];
      var velocities = [];

      for (var j = 0; j < pCount; j++) {
        // Start particles close to the center
        positions.push((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        var angle = Math.random() * Math.PI * 2;
        var speed = 3.5 + Math.random() * 8.5;
        var vz = (Math.random() - 0.5) * 6;
        velocities.push(Math.cos(angle) * speed, Math.sin(angle) * speed, vz);
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      var mat = new THREE.PointsMaterial({
        color: isStepCompleted ? 0x10B981 : 0x38BDF8,
        size: 0.28,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      var pSystem = new THREE.Points(geom, mat);
      pSystem.userData = {
        velocities: velocities,
        age: 0,
        maxAge: 70, // frame life
      };

      scene.add(pSystem);
      activeParticleSystems.push(pSystem);
    };

    /* hook used by applyAccent() to change color */
    window.__setHeroColor = function (hex) { targetC.set(hex); };

    /* resize — resize to full-screen viewport dimensions */
    var _W = 0, _H = 0;
    function resize() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (w === _W && h === _H) return;
      _W = w; _H = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    /* pointer + touch coordinates tracking */
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

    /* scroll — fade canvas absolute background smoothly as hero section leaves viewport */
    var fade = 1;
    window.addEventListener("scroll", function () {
      fade = Math.max(0, 1 - window.scrollY / 450);
      canvas.style.opacity = fade;
    }, { passive: true });

    /* RAF loop — proper pause when tab is hidden */
    var rafId = null;
    var cx = 0, cy = 0;     /* lerped camera position */
    var mx = 0, my = 0;     /* lerped mouse coordinate in 3D coordinates */
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

      // Decay materials emissive glow back to dark
      M.forEach(function (m) {
        m.emissive.lerp(new THREE.Color(0, 0, 0), 0.05);
      });

      // Lerp mouse coordinates in 3D scene space
      mx += (px * 13 - mx) * 0.05;
      my += (-py * 7 - my) * 0.05;

      /* drift + spin + cursor orbiting attraction — runs in background so state is active */
      blocks.forEach(function (b) {
        // Decay spin speed back to base speeds
        b.userData.rx += (b.userData.baseRx - b.userData.rx) * 0.04;
        b.userData.ry += (b.userData.baseRy - b.userData.ry) * 0.04;

        b.rotation.x += b.userData.rx;
        b.rotation.y += b.userData.ry;

        // Base drift position
        var bx = b.userData.baseX;
        var by = b.userData.baseY + Math.sin(t * b.userData.sp + b.userData.ph) * 0.28 * b.userData.amp;

        // Orbit around the mouse cursor when mouse is close
        var dx = bx - mx;
        var dy = by - my;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var influence = Math.max(0, 1 - dist / 12);

        var angle = t * b.userData.orbitSpeed + b.userData.ph;
        var orbitR = 1.0 + influence * 2.2;
        var ox = Math.cos(angle) * orbitR * influence;
        var oy = Math.sin(angle) * orbitR * influence;

        b.position.x = bx + ox;
        b.position.y = by + oy;

        // Lerp scale back to base scale dimensions
        b.userData.targetScaleMult += (1.0 - b.userData.targetScaleMult) * 0.05;
        b.userData.currentScaleMult += (b.userData.targetScaleMult - b.userData.currentScaleMult) * 0.12;

        b.scale.set(
          b.userData.scaleX * b.userData.currentScaleMult,
          b.userData.scaleY * b.userData.currentScaleMult,
          b.userData.scaleZ * b.userData.currentScaleMult
        );
      });

      /* particle systems update loop */
      for (var k = activeParticleSystems.length - 1; k >= 0; k--) {
        var ps = activeParticleSystems[k];
        var posArr = ps.geometry.attributes.position.array;
        var vels = ps.userData.velocities;
        for (var j = 0; j < posArr.length; j += 3) {
          posArr[j] += vels[j] * 0.016;
          posArr[j+1] += vels[j+1] * 0.016;
          posArr[j+2] += vels[j+2] * 0.016;
          vels[j] *= 0.97;
          vels[j+1] *= 0.97;
          vels[j+2] *= 0.97;
        }
        ps.geometry.attributes.position.needsUpdate = true;
        ps.userData.age++;
        ps.material.opacity = 1 - (ps.userData.age / ps.userData.maxAge);
        if (ps.userData.age >= ps.userData.maxAge) {
          scene.remove(ps);
          ps.geometry.dispose();
          ps.material.dispose();
          activeParticleSystems.splice(k, 1);
        }
      }

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

