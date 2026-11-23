/* ParcelReady site behavior: motion layer, catalog rendering, filters.
   Everything degrades gracefully: if a CDN fails, content still shows. */
/* Store API base: empty means same origin (pre-launch). At Worker deploy
   this becomes the Worker's origin, e.g. https://parcelready-store.<acct>.workers.dev */
var PR_API = "";

(function () {
  "use strict";

  /* ---------- reveals (GSAP if present, else IntersectionObserver) ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    reveals.forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
    var pin = document.querySelector(".hero-art img");
    if (pin) {
      gsap.from(pin, { y: -70, opacity: 0, duration: 1.1, ease: "bounce.out", delay: 0.15 });
    }
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("shown"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("shown"); });
  }

  /* ---------- smooth scroll (Lenis if present) ---------- */
  if (window.Lenis) {
    var lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ---------- sample data explorer ---------- */
  document.querySelectorAll("[data-explorer]").forEach(function (mount) {
    var url = mount.getAttribute("data-explorer");
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      var mode = "all", query = "";
      mount.innerHTML =
        '<div class="explorer-bar">' +
        '<input type="search" class="explorer-search" placeholder="Search the sample: a city, a business, a flag" aria-label="Search the sample rows">' +
        (data.kind === "trade" ?
        '<div class="explorer-chips">' +
        '<button class="chip on" data-m="all">All rows</button>' +
        '<button class="chip" data-m="email">Has verified email</button>' +
        '<button class="chip" data-m="form">Has contact form</button>' +
        '<button class="chip" data-m="noemail">No published email</button>' +
        "</div>" : "") +
        "</div>" +
        '<div class="table-scroll"><table class="data-table"><thead><tr>' +
        data.columns.map(function (c) { return "<th>" + c + "</th>"; }).join("") +
        '</tr></thead><tbody></tbody></table></div>' +
        '<p class="explorer-count"></p>';
      var tbody = mount.querySelector("tbody");
      var count = mount.querySelector(".explorer-count");
      function show(v) { return v === "" ? '<span class="blank-cell">blank</span>' : v; }
      function render() {
        var rows = data.rows.filter(function (r) {
          if (mode === "email" && !r["Published email"]) return false;
          if (mode === "form" && r["Contact form present"] !== "Yes") return false;
          if (mode === "noemail" && r["Published email"]) return false;
          if (query) {
            var hay = data.columns.map(function (c) { return r[c]; }).join(" ").toLowerCase();
            if (hay.indexOf(query) === -1) return false;
          }
          return true;
        });
        tbody.innerHTML = rows.map(function (r) {
          return "<tr>" + data.columns.map(function (c) { return "<td>" + show(r[c]) + "</td>"; }).join("") + "</tr>";
        }).join("") || '<tr><td colspan="' + data.columns.length + '">No rows match. That is the data being honest, not a filter bug.</td></tr>';
        count.textContent = "Preview: showing " + rows.length + " of " + (data.sample_total || data.rows.length) + " rows from a " +
          (data.sample_percent || 10) + "% draw of the full file (" + Number(data.full_total).toLocaleString() + " records)" +
          (data.delivered_total ? " · the delivered free sample is " + data.delivered_total + " rows, by email below" : "");
      }
      mount.querySelector(".explorer-search").addEventListener("input", function (e) {
        query = e.target.value.trim().toLowerCase(); render();
      });
      var chipsEl = mount.querySelector(".explorer-chips");
      if (chipsEl) chipsEl.addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        mode = b.dataset.m;
        mount.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("on", c === b); });
        render();
      });
      render();
    }).catch(function () {
      mount.innerHTML = '<p class="fineprint">The live sample table could not load here. The free sample file itself is on the store, linked above.</p>';
    });
  });
  /* ---------- catalog rendering ---------- */
  var grid = document.getElementById("card-grid");
  if (!grid || !window.CATALOG) return;

  var packs = window.CATALOG.packs;
  var state = { state: "all", category: "all" };
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function fmtDate(iso) { var p = iso.split("-"); return MONTHS[parseInt(p[1], 10) - 1] + " " + parseInt(p[2], 10) + ", " + p[0]; }
  function stateName(code) {
    var hit = (window.CATALOG.states || []).filter(function (x) { return x.code === code; });
    return hit.length ? hit[0].name : code;
  }

  function money(p) { return p === 0 ? "Free" : "$" + p; }

  function card(p) {
    var page = "packs/" + p.id + ".html";
    if (window.location.pathname.indexOf("catalog") === -1 && document.body.dataset.root === "packs") {
      page = p.id + ".html";
    }
    var cover = (document.body.dataset.root === "packs" ? "../" : "") + p.cover;
    return '<article class="card">' +
      '<a href="' + page + '"><img src="' + cover + '" alt="' + p.title + ' data preview cover" loading="lazy"></a>' +
      '<div class="card-body">' +
      '<p class="meta">' + stateName(p.state) + " · " + p.category + "</p>" +
      "<h3>" + p.title + "</h3>" +
      '<p class="tagline">' + p.tagline + "</p>" +
      '<p class="asof">Data as of ' + fmtDate(p.data_as_of) + "<br>" + p.refresh_schedule + "</p>" +
      '<div class="rowline"><span class="rows">' + p.rows_label + '</span>' +
      '<span class="price">' + money(p.price) + " <small>" + p.price_note + "</small></span></div>" +
      '<div class="card-links"><a href="' + page + '">See what is inside</a>' +
      '<a href="' + p.sample_url + '" target="_blank" rel="noopener">Free sample</a></div>' +
      "</div></article>";
  }

  function render() {
    var shown = packs.filter(function (p) {
      return (state.state === "all" || p.state === state.state) &&
             (state.category === "all" || p.category === state.category);
    });
    grid.innerHTML = shown.length ? shown.map(card).join("") :
      '<p class="empty-note">No live pack in that combination yet. It is on the build list below, and sample requests move it up.</p>';
  }

  function chipRow(elId, values, key) {
    var el = document.getElementById(elId);
    if (!el) return;
    var all = ["all"].concat(values);
    el.innerHTML = all.map(function (v) {
      var label = v === "all" ? "All" : (key === "state" ? stateName(v) : v);
      return '<button class="chip' + (state[key] === v ? " on" : "") + '" data-v="' + v + '">' + label + "</button>";
    }).join("");
    el.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      state[key] = b.dataset.v;
      el.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("on", c.dataset.v === state[key]); });
      render();
    });
  }

  function uniq(key) {
    var seen = [], out = [];
    packs.forEach(function (p) { if (seen.indexOf(p[key]) === -1) { seen.push(p[key]); out.push(p[key]); } });
    return out;
  }

  chipRow("f-state", (window.CATALOG.states || []).filter(function (st) {
    return packs.some(function (p) { return p.state === st.code; });
  }).map(function (st) { return st.code; }), "state");
  chipRow("f-category", window.CATALOG.categories || uniq("category"), "category");
  render();

  /* ---------- state tiles (catalog page) ---------- */
  var tiles = document.getElementById("state-tiles");
  if (tiles && window.CATALOG.states) {
    tiles.innerHTML = window.CATALOG.states.map(function (st) {
      var n = packs.filter(function (p) { return p.state === st.code; }).length;
      var soon = (window.CATALOG.coming_soon || []).some(function (cs) { return (cs.states || []).indexOf(st.code) !== -1; });
      var label = n ? n + (n === 1 ? " pack live" : " packs live") : (soon ? "In production" : "Request a sample");
      var cls = n ? "status-pill status-live" : "status-pill" + (soon ? "" : " dim");
      return '<a class="state-tile" href="states/' + st.slug + '/index.html"><span class="state-name">' + st.name + '</span><span class="' + cls + '">' + label + "</span></a>";
    }).join("");
  }

  /* ---------- build sequence matrix ---------- */
  var matrix = document.getElementById("matrix-body");
  if (matrix) {
    var liveRows = packs.filter(function (p) { return p.price > 0 || p.id === "free-sample-pack"; }).map(function (p) {
      return "<tr><td>" + p.trade + "</td><td>" + p.metro + '</td><td><span class="status-pill status-live">Live now</span></td></tr>';
    });
    var soonRows = (window.CATALOG.coming_soon || []).map(function (c) {
      return "<tr><td>" + c.trade + "</td><td>" + c.metro + '</td><td><span class="status-pill">' + c.status + "</span></td></tr>";
    });
    matrix.innerHTML = liveRows.join("") + soonRows.join("");
  }

})();

/* ---------- store: sample capture + checkout ---------- */
(function () {
  function note(form, msg) {
    var el = form.querySelector(".capture-status");
    if (el) el.textContent = msg;
  }
  document.querySelectorAll("form[data-capture]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(form).entries());
      data.source_page = window.location.pathname;
      note(form, "Sending...");
      fetch(PR_API + "/api/sample", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
        .then(function () { note(form, "Sent. Check your inbox for the sample file."); form.reset(); })
        .catch(function () { note(form, "Sample delivery opens with the store launch. Email hello@parcelreadydata.com and we will send it today."); });
    });
  });
  document.querySelectorAll("[data-checkout]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.disabled = true;
      fetch(PR_API + "/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: btn.dataset.checkout }),
      }).then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
        .then(function (d) { window.location = d.url; })
        .catch(function () { btn.disabled = false; alert("Checkout opens with the store launch. Email hello@parcelreadydata.com and we will take care of you today."); });
    });
  });
})();

/* ---------- scope pricing (catalog page) ---------- */
(function () {
  var stSel = document.getElementById("scope-state");
  var catSel = document.getElementById("scope-category");
  if (!stSel || !window.CATALOG) return;
  var C = window.CATALOG;
  stSel.innerHTML = C.states.map(function (s) { return '<option value="' + s.code + '">' + s.name + "</option>"; }).join("");
  catSel.innerHTML = C.categories.map(function (c) { return "<option>" + c + "</option>"; }).join("");
  var out = document.getElementById("scope-result");
  function money(n) { return n === 0 ? "Free" : "$" + n; }
  function run() {
    var code = stSel.value, cat = catSel.value;
    var sName = stSel.options[stSel.selectedIndex].text;
    var live = C.packs.filter(function (p) { return p.state === code && p.category === cat; });
    if (live.length) {
      out.innerHTML = live.map(function (p) {
        var mem = p.membership ? " · membership " + money(p.membership.price) + " per " + p.membership.per : "";
        return "<strong>" + p.title + ":</strong> " + money(p.price) + " one time" + mem +
          ' · <a href="packs/' + p.id + '.html">See the pack</a>';
      }).join("<br>");
      return;
    }
    var soon = (C.coming_soon || []).filter(function (cs) {
      return (cs.states || []).indexOf(code) !== -1 &&
        (cs.trade === cat || (cat === "Real Estate" && /Absentee|Landlords/.test(cs.trade)) ||
         (cat === "Roofing" && /Roofing/.test(cs.trade)));
    });
    if (soon.length) {
      out.innerHTML = soon.map(function (cs) {
        var lp = cs.launch_price ? " · launch price " + money(cs.launch_price) + " per the pricing architecture" : "";
        return "<strong>" + cs.trade + " (" + cs.metro + "):</strong> in production" + lp +
          ' · <a href="sample.html?state=' + sName + "&trade=" + cat + '">Request the free sample</a>';
      }).join("<br>");
      return;
    }
    out.innerHTML = "<strong>" + sName + " " + cat + ":</strong> not built yet. Lines price from the published pricing architecture " +
      "($49 to $149 by line and metro) with the exact price printed on the pack page at launch · " +
      '<a href="sample.html?state=' + sName + "&trade=" + cat + '">Request a sample and move it up the order</a>';
  }
  stSel.addEventListener("change", run);
  catSel.addEventListener("change", run);
  stSel.value = "TX"; catSel.value = "HVAC"; run();
})();
