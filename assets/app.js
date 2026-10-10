(function () {
  var root = document.documentElement;

  // 화면 모드
  try {
    var saved = localStorage.getItem("theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) {}
  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var cur = root.getAttribute("data-theme");
      if (!cur) cur = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var next = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // 모바일 메뉴
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // 검색
  var searchBtn = document.getElementById("searchBtn");
  var box = document.getElementById("search");
  var q = document.getElementById("q");
  var out = document.getElementById("results");
  var data = null;
  function load() {
    if (data) return Promise.resolve(data);
    return fetch("/assets/search.json").then(function (r) { return r.json(); }).then(function (d) { data = d; return d; });
  }
  function render(list) {
    out.innerHTML = "";
    list.slice(0, 8).forEach(function (p) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = p.u;
      a.textContent = p.t;
      var s = document.createElement("small");
      s.textContent = p.c;
      a.appendChild(s);
      li.appendChild(a);
      out.appendChild(li);
    });
    if (!list.length && q.value.trim()) {
      var li2 = document.createElement("li");
      li2.style.padding = "10px 12px";
      li2.textContent = "검색 결과가 없어요.";
      out.appendChild(li2);
    }
  }
  if (searchBtn && box && q) {
    searchBtn.addEventListener("click", function () {
      box.hidden = !box.hidden;
      if (!box.hidden) { q.focus(); load(); }
    });
    q.addEventListener("input", function () {
      var term = q.value.trim().toLowerCase();
      if (!term) { out.innerHTML = ""; return; }
      load().then(function (d) {
        render(d.filter(function (p) { return (p.t + " " + p.d + " " + p.c).toLowerCase().indexOf(term) > -1; }));
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !box.hidden) { box.hidden = true; searchBtn.focus(); }
    });
  }

  // 인터랙티브 CBT 기출문제 정답 및 해설 토글 기능
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".exam-option-btn");
    if (!btn) return;
    var item = btn.closest(".exam-item");
    if (!item) return;
    
    var correctIdx = parseInt(item.getAttribute("data-answer"), 10);
    var choiceIdx = parseInt(btn.getAttribute("data-index"), 10);
    var btns = item.querySelectorAll(".exam-option-btn");
    var expBox = item.querySelector(".exam-explanation-box");

    btns.forEach(function (b) {
      b.classList.remove("correct", "wrong");
      var idx = parseInt(b.getAttribute("data-index"), 10);
      if (idx === correctIdx) {
        b.classList.add("correct");
      }
    });

    if (choiceIdx !== correctIdx) {
      btn.classList.add("wrong");
    }

    if (expBox) {
      expBox.hidden = false;
    }
  });
})();
