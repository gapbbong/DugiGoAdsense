// 정적 사이트 빌더: node build.js  →  public/ 폴더 생성
const fs = require("fs");
const path = require("path");

const SITE = {
  name: "두기고",
  tagline: "자격증, 같이 붙자",
  // 실제 도메인이 정해지면 SITE_URL 환경변수로 넣으세요. 예) SITE_URL=https://dugigo.example node build.js
  url: (process.env.SITE_URL || "https://www.creat1324.com").replace(/\/$/, ""),
  email: process.env.SITE_EMAIL || "gapbbong@gmail.com",
  adsenseClient: process.env.ADSENSE_CLIENT || "ca-pub-4428080843496647", // 사이트 소유 확인과 ads.txt에 쓰인다
  appUrl: process.env.APP_URL || "", // 두기고 문제풀이 앱 주소가 있으면 입력
  updated: "2026-10-08",
};

const CATS = [
  {
    slug: "stories",
    name: "공부 이야기",
    short: "이야기",
    emoji: "🎓",
    color: "#f59e0b",
    desc: "자격증을 준비하는 학생들의 공부 과정을 이야기로 풀었어요. 한 번에 붙은 이야기도, 떨어진 이야기도 있어요.",
    note: "이 카테고리의 글은 두기고가 만든 가상의 학습 사례입니다. 실제 인물의 후기가 아니며, 이름과 점수는 설정입니다. 시험 정보와 공부 방법은 실제 시험 구성에 맞춰 썼습니다.",
    posts: require("./content/stories.js"),
  },
  {
    slug: "previews",
    name: "시험 미리보기",
    short: "미리보기",
    emoji: "🔎",
    color: "#4f46e5",
    desc: "종목별 시험 구성과 단원, 준비 순서를 한눈에. 접수 전에 읽어보세요.",
    note: "",
    posts: require("./content/previews.js"),
  },
  {
    slug: "tips",
    name: "공부 꿀팁",
    short: "꿀팁",
    emoji: "💡",
    color: "#10b981",
    desc: "기출 푸는 법, 암기법, 시험 당일 체크리스트까지. 바로 써먹는 공부 방법.",
    note: "",
    posts: require("./content/tips.js"),
  },
];

const OUT = path.join(__dirname, "public");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- 글 본문 렌더 ----------
const EXAM_SAMPLES = require("./content/exam_samples.js");

function renderBody(src) {
  const blocks = src.trim().split(/\n\s*\n/);
  let html = "";
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    if (lines.length === 1 && lines[0].startsWith("## ")) {
      html += `<h2>${esc(lines[0].slice(3))}</h2>\n`;
    } else if (lines.every((l) => l.startsWith("- "))) {
      html += "<ul>" + lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join("") + "</ul>\n";
    } else if (lines[0].startsWith("> ")) {
      const quoteText = lines.map((l) => esc(l.replace(/^>\s?/, ""))).join("<br>");
      html += `<blockquote><p>${quoteText}</p></blockquote>\n`;
    } else {
      html += `<p>${lines.map(esc).join("<br>")}</p>\n`;
    }
  }
  return html;
}

function renderVisualCard(p) {
  const icons = {
    stories: "🎓",
    previews: "📋",
    tips: "💡"
  };
  const subtitles = {
    stories: "가상 사례로 보는 공부 과정과 시행착오",
    previews: "국가기술자격 출제기준 기반 핵심 분석 & 대표 기출",
    tips: "단기간 합격률을 끌어올리는 현실적인 학습 가이드"
  };
  const icon = icons[p.cat.slug] || "📘";
  const sub = subtitles[p.cat.slug] || p.desc;

  return `
  <div class="post-visual">
    <div class="post-visual-icon">${icon}</div>
    <div class="post-visual-info">
      <h3>${esc(p.title)}</h3>
      <p>${esc(sub)}</p>
    </div>
  </div>`;
}

// ---------- 도표와 기출 데이터 상자 ----------
const FIG = require("./content/figures.js");
const STATS = require("./content/data_stats.json").subjects;
const NOTES = require("./content/data_notes.js");
const fmtN = (n) => n.toLocaleString("ko-KR");

function gradeTableHtml() {
  return `<table class="grade"><thead><tr><th>구분</th><th>점수</th><th>급수</th></tr></thead><tbody>
<tr><td rowspan="3">심화</td><td>80점 이상</td><td>1급</td></tr><tr><td>70~79점</td><td>2급</td></tr><tr><td>60~69점</td><td>3급</td></tr>
<tr><td rowspan="3">기본</td><td>80점 이상</td><td>4급</td></tr><tr><td>70~79점</td><td>5급</td></tr><tr><td>60~69점</td><td>6급</td></tr></tbody></table>`;
}
function renderFigure(f) {
  const inner = f.html === "gradeTable" ? gradeTableHtml() : FIG[f.fn](...(f.args || []));
  return `<figure class="fig">${inner}<figcaption>${esc(f.caption)}</figcaption></figure>`;
}
const METHOD_NOTE = "집계 방법: 두기고에 수록된 문제의 문장이 같으면 같은 문제로 세었어요. 보기나 숫자가 바뀐 문제, 그림에만 내용이 있는 문제는 따로 세지 못해서 실제 반복은 이보다 많을 수 있어요. 수록 회차는 두기고가 가진 기출만 센 것이라 전체 시험 횟수와 다를 수 있어요.";

function dataSection(slug) {
  const n = NOTES[slug], s = STATS[slug];
  if (!n || !s) return "";
  const chips = [];
  if (n.chips.includes("unique")) {
    const approx = slug === "preview-automation-technician";
    chips.push([approx ? "약 " + fmtN(Math.round(s.unique / 10) * 10) : fmtN(s.unique), "서로 다른 기출 문제"]);
  }
  if (n.chips.includes("rounds")) chips.push([`${s.rounds}회차`, s.years && s.years[0] !== s.years[1] ? `수록 회차 (${s.years[0]}~${s.years[1]})` : "수록 회차"]);
  if (n.chips.includes("repeat")) chips.push([`${s.repeatedShare}%`, "두 회차 이상 반복된 문제"]);
  let h = `<section class="data-box" aria-label="두기고 기출 데이터"><h2>두기고 기출 데이터로 본 ${esc(s.folder)}</h2>`;
  if (chips.length) h += `<ul class="chips">${chips.map(([v, l]) => `<li><b>${esc(v)}</b><span>${esc(l)}</span></li>`).join("")}</ul>`;
  h += `<p>${esc(n.note)}</p>`;
  if (n.bars) {
    const items = s.units.map((u) => ({ label: u.name.replace(/^\d+과목_/, ""), value: u.unique }));
    h += `<figure class="fig">${FIG.barChart(items, s.folder + " 단원별 수록 문제 수")}<figcaption>두기고에 수록된 서로 다른 문제를 단원별로 센 값이에요. 시험에 나오는 비중이 아니라 수록된 문제 수라서, 단원마다 연습할 수 있는 양을 가늠하는 용도로 보세요.</figcaption></figure>`;
  }
  if (n.top && s.top && s.top.length) {
    h += `<h3>여러 회차에 다시 나온 문제</h3><table class="top"><thead><tr><th>나온 회차</th><th>문제 (앞부분)</th></tr></thead><tbody>${s.top
      .slice(0, 5)
      .map((t) => `<tr><td>${t.rounds}회차</td><td>${esc(t.text.split("*").join("").trim())}${t.text.length >= 38 ? "…" : ""}</td></tr>`)
      .join("")}</tbody></table>`;
  }
  h += `<p class="method">${esc(METHOD_NOTE)}</p></section>`;
  return h;
}
function compareSection(slug) {
  if (slug !== "why-past-exams-first") return "";
  const rows = [
    ["preview-electric-technician", "전기기능사"],
    ["preview-electric-construction", "전기공사산업기사"],
    ["preview-automation-industrial", "자동화설비산업기사"],
    ["preview-electric-engineer", "전기기사"],
    ["preview-elevator", "승강기기능사"],
  ].map(([k, l]) => ({ label: l, value: STATS[k].repeatedShare })).sort((a, b) => b.value - a.value);
  return `<section class="data-box" aria-label="종목별 기출 반복 비율"><h2>두기고 기출 데이터로 비교해 본 반복 비율</h2>
<p>기출을 먼저 풀라는 말이 모든 시험에 똑같이 맞는 건 아니에요. 두기고에 수록된 기출에서 같은 문장의 문제가 두 회차 이상 나온 비율을 종목마다 세어 봤어요. 가장 높은 전기기능사는 ${rows[0].value}%, 가장 낮은 승강기기능사는 ${rows[rows.length - 1].value}%였어요.</p>
<figure class="fig">${FIG.barChart(rows, "종목별 기출 반복 비율 비교", (v) => v + "%")}<figcaption>두 회차 이상 같은 문장으로 다시 나온 문제의 비율(두기고 수록 기출 기준)</figcaption></figure>
<p>반복이 많은 시험은 기출을 풀수록 같은 문제를 다시 만날 확률이 높아요. 반복이 적은 시험은 기출을 외우는 용도가 아니라 어떤 개념을 묻는지 익히는 용도로 써야 해요.</p>
<p class="method">${esc(METHOD_NOTE)}</p></section>`;
}
function renderPostBody(p) {
  const blocks = p.body.trim().split(/\n\s*\n/);
  const first = blocks.shift();
  const figs = ((NOTES[p.slug] || {}).figures || []).map(renderFigure).join("");
  return renderBody(first) + figs + (blocks.length ? renderBody(blocks.join("\n\n")) : "") + dataSection(p.slug) + compareSection(p.slug);
}

function renderExamSamples(slug) {
  const samples = EXAM_SAMPLES[slug];
  if (!samples || !samples.length) return "";

  let out = `
  <section class="exam-section" aria-label="대표 기출문제와 심층 해설">
    <div class="exam-section-header">
      <span class="exam-badge">CBT 실전 기출</span>
      <h2>핵심 대표 문항 &amp; 상세 해설 분석</h2>
    </div>
    <p class="muted" style="margin: 0 0 18px; font-size: 14.5px;">기출에서 자주 나오는 유형을 골라 정리한 대표 문항이에요. 보기와 표현은 실제 시험과 조금 다를 수 있어요. 보기를 눌러 정답과 해설을 확인해보세요.</p>
  `;

  samples.forEach((item, qIdx) => {
    out += `
    <div class="exam-item" data-answer="${item.answer}">
      <div class="exam-item-meta">
        <span>문항 0${qIdx + 1}</span>
        <span>${esc(item.unit)}</span>
      </div>
      <div class="exam-question">${esc(item.question)}</div>
      <ul class="exam-options">
    `;

    item.options.forEach((opt, optIdx) => {
      const num = optIdx + 1;
      out += `
        <li>
          <button type="button" class="exam-option-btn" data-index="${num}">
            <span class="exam-opt-num">${["①", "②", "③", "④"][optIdx] || num}</span>
            <span>${esc(opt)}</span>
          </button>
        </li>
      `;
    });

    out += `
      </ul>
      <div class="exam-explanation-box" hidden>
        <div class="exam-exp-title">
          <span>💡 정답: ${item.answer}번</span>
        </div>
        <p style="margin:0;">${esc(item.explanation)}</p>
      </div>
    </div>
    `;
  });

  out += `</section>\n`;
  return out;
}
const readMin = (src) => Math.max(1, Math.round(src.replace(/\s/g, "").length / 450));
const fmtDate = (d) => d.replace(/-/g, ".");

// ---------- 데이터 정리 ----------
// 추가 본문은 각 글의 마지막 문단(맺음말) 바로 앞에 끼워 넣는다
const EXTRAS = [require("./content/extra.js"), require("./content/extra2.js")];
function withExtra(p) {
  const adds = EXTRAS.map((e) => e[p.slug]).filter(Boolean);
  if (!adds.length) return p.body;
  const blocks = p.body.trim().split(/\n\s*\n/);
  const last = blocks.pop();
  return [...blocks, ...adds.map((a) => a.trim()), last].join("\n\n");
}

const all = [];
for (const c of CATS) {
  for (const p of c.posts) all.push({ ...p, body: withExtra(p), cat: c, url: `/posts/${p.slug}.html` });
}
// 발행일: 하루에 한 편씩, 마지막 글이 SITE.updated(오늘)가 되도록 거꾸로 배정
all.sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
const lastDay = new Date(SITE.updated + "T00:00:00Z");
all.forEach((p, i) => {
  const d = new Date(lastDay);
  d.setUTCDate(d.getUTCDate() - (all.length - 1 - i));
  p.date = d.toISOString().slice(0, 10);
  p.min = readMin(p.body);
});
all.reverse(); // 최신순
const slugs = new Set();
for (const p of all) {
  if (slugs.has(p.slug)) throw new Error("slug 중복: " + p.slug);
  slugs.add(p.slug);
}

// ---------- 공통 레이아웃 ----------
const adsenseTag = SITE.adsenseClient
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(SITE.adsenseClient)}" crossorigin="anonymous"></script>`
  : "<!-- AdSense 승인 후: 환경변수 ADSENSE_CLIENT 를 넣고 다시 build 하면 이 자리에 광고 스크립트가 들어갑니다 -->";

function layout({ title, desc, path: p, body, type = "website", jsonld = "", active = "" }) {
  const full = title === SITE.name ? `${SITE.name} | ${SITE.tagline}` : `${title} | ${SITE.name}`;
  const nav = [
    ["/", "홈", "home"],
    ...CATS.map((c) => [`/category/${c.slug}/`, c.name, c.slug]),
    ["/about.html", "소개", "about"],
  ];
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE.url}${p}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE.url}${p}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:locale" content="ko_KR">
<meta name="theme-color" content="#1b2340">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
${adsenseTag}
${jsonld}
</head>
<body>
<a class="skip" href="#main">본문 바로가기</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="${SITE.name} 홈"><span class="logo">두</span><span class="brand-name">${SITE.name}<small>${SITE.tagline}</small></span></a>
    <nav class="nav" id="nav" aria-label="주 메뉴">
      ${nav.map(([h, t, k]) => `<a href="${h}"${k === active ? ' aria-current="page"' : ""}>${t}</a>`).join("")}
    </nav>
    <div class="tools">
      <button class="icon-btn" id="searchBtn" aria-label="글 검색">🔍</button>
      <button class="icon-btn" id="themeBtn" aria-label="화면 모드 바꾸기">🌓</button>
      <button class="icon-btn menu" id="menuBtn" aria-label="메뉴 열기" aria-expanded="false">☰</button>
    </div>
  </div>
</header>
<div class="search" id="search" hidden>
  <div class="wrap">
    <input id="q" type="search" placeholder="예: 전기기능사, 암기, 컴활" aria-label="검색어" autocomplete="off">
    <ul id="results" class="results"></ul>
  </div>
</div>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap foot">
    <div>
      <p class="foot-brand"><span class="logo sm">두</span> ${SITE.name}</p>
      <p class="muted">특성화고·일반고 학생이 자격증을 준비할 때 필요한 정보를 모았어요.<br>시험 일정과 기준은 바뀔 수 있으니 접수 전에 큐넷 등 공식 공고를 꼭 확인하세요.</p>
    </div>
    <div>
      <p class="foot-h">카테고리</p>
      ${CATS.map((c) => `<a href="/category/${c.slug}/">${c.name}</a>`).join("")}
    </div>
    <div>
      <p class="foot-h">안내</p>
      <a href="/about.html">사이트 소개</a>
      <a href="/contact.html">문의하기</a>
      <a href="/privacy.html">개인정보처리방침</a>
      <a href="/terms.html">이용약관</a>
    </div>
  </div>
  <div class="wrap copy">© ${new Date().getFullYear()} ${SITE.name}. 이 사이트는 한국산업인력공단, 대한상공회의소 등 시행기관과 무관한 비공식 학습 정보 사이트입니다.</div>
</footer>
<script src="/assets/app.js" defer></script>
</body>
</html>`;
}

function card(p) {
  return `<a class="card" href="${p.url}" style="--c:${p.cat.color}">
  <span class="tag">${p.cat.emoji} ${p.cat.short}</span>
  <h3>${esc(p.title)}</h3>
  <p>${esc(p.desc)}</p>
  <span class="meta">${fmtDate(p.date)} · ${p.min}분 읽기</span>
</a>`;
}

function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content, "utf8");
}

// ---------- 초기화 ----------
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
fs.cpSync(path.join(__dirname, "assets"), path.join(OUT, "assets"), { recursive: true });

// ---------- 홈 ----------
{
  const latest = all.slice(0, 6);
  const body = `
<section class="hero">
  <div class="wrap hero-in">
    <p class="eyebrow">CBT 기출로 준비하는 자격증 · 한국사</p>
    <h1>자격증, <span class="hl">같이</span> 붙자.</h1>
    <p class="lead">전기·정보처리·컴활·한국사까지. 공부 사례 이야기, 시험 미리보기, 바로 쓰는 공부 팁을 한곳에 모았어요.</p>
    <div class="hero-cta">
      <a class="btn primary" href="/category/stories/">공부 이야기 보기</a>
      <a class="btn" href="/category/previews/">시험 미리보기</a>
    </div>
    <ul class="stats" aria-label="사이트 현황">
      <li><b>${all.length}</b><span>개의 글</span></li>
      <li><b>${CATS.length}</b><span>개 카테고리</span></li>
      <li><b>12</b><span>개 종목 다룸</span></li>
    </ul>
  </div>
</section>
<section class="wrap block">
  <h2 class="sec">어떤 글이 필요해요?</h2>
  <div class="cats">
    ${CATS.map(
      (c) => `<a class="cat" href="/category/${c.slug}/" style="--c:${c.color}">
      <span class="cat-emoji">${c.emoji}</span>
      <h3>${c.name}</h3>
      <p>${esc(c.desc)}</p>
      <span class="more">${c.posts.length}개 글 보기 →</span>
    </a>`
    ).join("")}
  </div>
</section>
<section class="wrap block">
  <h2 class="sec">새로 올라온 글</h2>
  <div class="grid">${latest.map(card).join("")}</div>
</section>
<section class="wrap block">
  <div class="callout">
    <h2>처음이라면 이 순서로 읽어보세요</h2>
    <ol>
      <li><a href="/posts/why-past-exams-first.html">자격증은 왜 기출부터 풀어야 할까</a></li>
      <li><a href="/posts/which-certificate-first.html">자격증 뭐부터 따야 할까: 진로별 추천 순서</a></li>
      <li><a href="/posts/first-cbt-guide.html">CBT 시험 처음이라면 알아둘 것</a></li>
    </ol>
  </div>
</section>`;
  write("index.html", layout({ title: SITE.name, desc: "특성화고·일반고 학생을 위한 자격증 정보. 공부 이야기, 시험 미리보기, 공부 꿀팁을 모았어요.", path: "/", body, active: "home" }));
}

// ---------- 카테고리 ----------
for (const c of CATS) {
  const list = all.filter((p) => p.cat === c);
  const body = `
<section class="page-head" style="--c:${c.color}">
  <div class="wrap">
    <p class="crumb"><a href="/">홈</a> › ${c.name}</p>
    <h1>${c.emoji} ${c.name}</h1>
    <p class="lead">${esc(c.desc)}</p>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}
  </div>
</section>
<section class="wrap block"><div class="grid">${list.map(card).join("")}</div></section>`;
  write(`category/${c.slug}/index.html`, layout({ title: c.name, desc: c.desc, path: `/category/${c.slug}/`, body, active: c.slug }));
}

// ---------- 글 ----------
for (const p of all) {
  const same = all.filter((x) => x.cat === p.cat && x.slug !== p.slug);
  const idx = same.findIndex((x) => x.date < p.date);
  const start = idx < 0 ? 0 : idx;
  const related = [...same.slice(start, start + 2), ...all.filter((x) => x.cat !== p.cat).slice(0, 1)].slice(0, 3);
  const pos = all.findIndex((x) => x.slug === p.slug);
  const prev = all[pos + 1], next = all[pos - 1];
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.desc,
    datePublished: p.date,
    dateModified: p.date,
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: `${SITE.url}${p.url}`,
    inLanguage: "ko",
  })}</script>`;
  const body = `
<article class="post" style="--c:${p.cat.color}">
  <header class="post-head">
    <div class="wrap narrow">
      <p class="crumb"><a href="/">홈</a> › <a href="/category/${p.cat.slug}/">${p.cat.name}</a></p>
      <h1>${esc(p.title)}</h1>
      <p class="byline">${esc(p.by)} · ${fmtDate(p.date)} · ${p.min}분 읽기</p>
    </div>
  </header>
  <div class="wrap narrow prose">
    ${renderVisualCard(p)}
    ${p.cat.note ? `<p class="note">${esc(p.cat.note)}</p>` : ""}
    ${renderPostBody(p)}
    ${renderExamSamples(p.slug)}
    <p class="disclaimer">시험 일정, 응시 자격, 합격 기준은 해마다 바뀔 수 있어요. 접수 전에 큐넷(Q-Net) 또는 시행기관의 공식 공고를 꼭 확인하세요.</p>
  </div>
</article>
<section class="wrap narrow block">
  <nav class="pager" aria-label="이전 다음 글">
    ${prev ? `<a href="${prev.url}"><small>← 이전 글</small>${esc(prev.title)}</a>` : "<span></span>"}
    ${next ? `<a class="r" href="${next.url}"><small>다음 글 →</small>${esc(next.title)}</a>` : "<span></span>"}
  </nav>
</section>
<section class="wrap block">
  <h2 class="sec">같이 읽으면 좋은 글</h2>
  <div class="grid">${related.map(card).join("")}</div>
</section>`;
  write(`posts/${p.slug}.html`, layout({ title: p.title, desc: p.desc, path: p.url, body, type: "article", jsonld, active: p.cat.slug }));
}

// ---------- 안내 페이지 ----------
function simple(file, title, desc, inner, active = "") {
  const body = `
<section class="page-head plain"><div class="wrap"><p class="crumb"><a href="/">홈</a> › ${esc(title)}</p><h1>${esc(title)}</h1></div></section>
<div class="wrap narrow prose block">${inner}</div>`;
  write(file, layout({ title, desc, path: "/" + file, body, active }));
}

simple("about.html", "두기고 소개", "두기고가 어떤 사이트이고, 글을 어떻게 만드는지 소개합니다.", `
<p>두기고는 자격증을 준비하는 학생을 위한 정보 사이트예요. 특성화고와 일반고 학생이 학교를 다니면서 자격증을 따려면 뭘 해야 하는지, 그걸 쉽게 풀어서 적어요.</p>
<h2>어떤 글을 쓰나요</h2>
<ul>
<li>공부 이야기: 가상의 학습 사례로 보는 공부 과정과 실패담</li>
<li>시험 미리보기: 종목별 구성과 준비 순서</li>
<li>공부 꿀팁: 기출 푸는 법, 암기법, 시험 당일 체크리스트</li>
</ul>
<h2>다루는 종목</h2>
<p>전기기능사, 전기기사, 전기공사산업기사, 승강기기능사, 정보처리기능사, 정보처리산업기사, 컴퓨터활용능력 2급, 한국사능력검정시험, 자동화설비(생산자동화)기능사, 자동화설비산업기사, 시각디자인산업기사, 3D프린터운용기능사 등 학생들이 많이 준비하는 시험을 다뤄요.</p>
<h2>글 쓰는 원칙</h2>
<ul>
<li>어려운 말은 쉽게 풀어서 써요.</li>
<li>시험 일정이나 기준처럼 바뀌는 정보는 단정하지 않고, 공식 공고를 확인하라고 안내해요.</li>
<li>공부 이야기는 두기고가 만든 가상의 사례예요. 실제 인물의 후기가 아니라는 점을 카테고리와 글마다 밝혀요. 실제 학생의 후기를 받으면 따로 표시해서 실을 거예요.</li>
<li>합격을 보장하거나 합격률을 약속하는 표현은 쓰지 않아요.</li>
</ul>
<h2>운영 정보</h2>
<p>두기고는 한국산업인력공단, 대한상공회의소, 국사편찬위원회 등 시험 시행기관과 관련이 없는 비공식 사이트예요. 마지막 업데이트: ${fmtDate(SITE.updated)}</p>
<p>잘못된 내용을 발견했다면 <a href="/contact.html">문의하기</a>로 알려주세요. 확인 후 고칠게요.</p>
`, "about");

simple("contact.html", "문의하기", "글 오류 제보, 제휴, 기타 문의 안내.", `
<p>궁금한 점이나 고쳐야 할 내용이 있으면 이메일로 알려주세요.</p>
<p><strong>이메일</strong>: <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></p>
<h2>이런 문의를 받아요</h2>
<ul>
<li>글 내용 오류 제보 (정확한 글 제목과 틀린 부분을 알려주면 빨라요)</li>
<li>다루었으면 하는 종목이나 주제 제안</li>
<li>합격 경험담 공유 (직접 쓴 글을 보내주시면 검토 후 실을 수 있어요)</li>
<li>저작권, 개인정보 관련 요청</li>
</ul>
<p>답변은 영업일 기준 3~5일 안에 드리려고 노력해요.</p>
`);

simple("privacy.html", "개인정보처리방침", "두기고의 개인정보 및 쿠키 처리 방침.", `
<p>두기고(이하 "사이트")는 이용자의 개인정보를 소중하게 다루며, 관련 법령을 지키기 위해 노력합니다. 시행일: ${fmtDate(SITE.updated)}</p>
<h2>1. 수집하는 정보</h2>
<p>사이트는 회원가입 없이 이용할 수 있고, 이름이나 연락처 같은 개인정보를 직접 수집하지 않습니다. 문의 메일을 보내는 경우에 한해 보내신 이메일 주소와 문의 내용을 답변 목적으로만 사용하고, 처리가 끝나면 삭제합니다.</p>
<h2>2. 자동으로 수집되는 정보</h2>
<p>사이트를 이용하면 접속 기록(IP 주소, 브라우저 종류, 방문 페이지, 접속 시간)이 서버나 분석 도구에 자동으로 남을 수 있습니다. 이 정보는 사이트 운영과 서비스 개선을 위한 통계 용도로만 쓰입니다.</p>
<h2>3. 쿠키 사용</h2>
<p>쿠키는 웹사이트가 이용자의 브라우저에 저장하는 작은 파일입니다. 사이트는 화면 모드(밝게/어둡게) 같은 편의 기능을 위해 브라우저 저장소를 사용할 수 있습니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있고, 이 경우 일부 기능이 제한될 수 있습니다.</p>
<h2>4. 광고</h2>
<p>사이트는 Google AdSense 등 제3자 광고 서비스를 사용할 수 있습니다. 제3자 광고 업체(Google 포함)는 쿠키를 사용해 이용자가 이 사이트나 다른 사이트를 방문한 기록을 바탕으로 광고를 보여줄 수 있습니다.</p>
<ul>
<li>Google은 광고 쿠키를 사용해 이용자의 관심사에 맞는 광고를 게재할 수 있습니다.</li>
<li>이용자는 <a href="https://adssettings.google.com" rel="noopener" target="_blank">Google 광고 설정</a>에서 맞춤 광고를 끌 수 있습니다.</li>
<li>제3자 업체의 맞춤 광고 쿠키 사용 거부는 <a href="https://www.aboutads.info" rel="noopener" target="_blank">aboutads.info</a>에서도 설정할 수 있습니다.</li>
</ul>
<h2>5. 개인정보의 제3자 제공</h2>
<p>사이트는 이용자의 개인정보를 법령에 근거가 있는 경우를 제외하고 외부에 제공하지 않습니다.</p>
<h2>6. 만 14세 미만 아동</h2>
<p>사이트는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.</p>
<h2>7. 문의</h2>
<p>개인정보 관련 문의는 <a href="/contact.html">문의하기</a> 페이지의 이메일로 보내주세요.</p>
<h2>8. 방침 변경</h2>
<p>이 방침이 바뀌면 이 페이지에 새 시행일과 함께 공지합니다.</p>
`);

simple("terms.html", "이용약관", "두기고 이용 조건과 면책 안내.", `
<p>두기고를 이용하면 아래 내용에 동의한 것으로 봅니다. 시행일: ${fmtDate(SITE.updated)}</p>
<h2>1. 서비스 성격</h2>
<p>사이트는 자격증과 한국사 시험을 준비하는 학생을 위한 학습 정보를 제공합니다. 시험 시행기관과 관련이 없는 비공식 정보 사이트입니다.</p>
<h2>2. 정보의 정확성</h2>
<p>사이트는 정확한 정보를 싣기 위해 노력하지만, 시험 일정, 응시 자격, 출제 범위, 합격 기준은 시행기관 사정에 따라 바뀔 수 있습니다. 시험 접수 전에는 반드시 공식 공고를 확인해야 하며, 이를 확인하지 않아 생긴 손해에 대해 사이트는 책임지지 않습니다.</p>
<h2>3. 공부 이야기</h2>
<p>공부 이야기 카테고리의 글은 두기고가 만든 가상의 학습 사례이며 실제 인물의 후기가 아닙니다. 공부 방법과 경험은 사람마다 다르며, 같은 방법으로 같은 결과를 얻는다고 보장하지 않습니다.</p>
<h2>4. 저작권</h2>
<p>사이트의 글과 디자인은 두기고에 저작권이 있습니다. 개인적인 학습 목적의 이용은 자유롭지만, 허락 없이 복사해 다른 곳에 게시하거나 판매하는 것은 금지됩니다. 인용할 때는 출처를 밝혀주세요.</p>
<h2>5. 링크</h2>
<p>사이트에는 외부 사이트로 연결되는 링크가 있을 수 있습니다. 외부 사이트의 내용과 운영에 대해서는 책임지지 않습니다.</p>
<h2>6. 약관의 변경</h2>
<p>약관이 바뀌면 이 페이지에 공지합니다.</p>
`);

write("404.html", layout({
  title: "페이지를 찾을 수 없어요",
  desc: "찾으시는 페이지가 없습니다.",
  path: "/404.html",
  body: `<section class="wrap narrow block center"><p class="big404">404</p><h1>페이지를 찾을 수 없어요</h1><p class="lead">주소가 바뀌었거나 없어진 글이에요.</p><p><a class="btn primary" href="/">홈으로 가기</a></p></section>`,
}));

// ---------- 검색 / sitemap / robots ----------
write("assets/search.json", JSON.stringify(all.map((p) => ({ t: p.title, d: p.desc, u: p.url, c: p.cat.name }))));

const urls = ["/", ...CATS.map((c) => `/category/${c.slug}/`), ...all.map((p) => p.url), "/about.html", "/contact.html", "/privacy.html", "/terms.html"];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => {
    const post = all.find((p) => p.url === u);
    return `<url><loc>${SITE.url}${u}</loc><lastmod>${post ? post.date : SITE.updated}</lastmod></url>`;
  })
  .join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
if (SITE.adsenseClient) write("ads.txt", `google.com, ${SITE.adsenseClient.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`);

console.log(`빌드 완료: 글 ${all.length}편, 페이지 ${urls.length + 1}개 → public/`);
