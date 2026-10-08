// 정적 사이트 빌더: node build.js  →  public/ 폴더 생성
const fs = require("fs");
const path = require("path");

const SITE = {
  name: "두기고",
  tagline: "자격증, 같이 붙자",
  // 실제 도메인이 정해지면 SITE_URL 환경변수로 넣으세요. 예) SITE_URL=https://dugigo.example node build.js
  url: (process.env.SITE_URL || "https://example.com").replace(/\/$/, ""),
  email: process.env.SITE_EMAIL || "contact@example.com",
  adsenseClient: process.env.ADSENSE_CLIENT || "", // 예) ca-pub-0000000000000000 (승인 후 입력)
  appUrl: process.env.APP_URL || "", // 두기고 문제풀이 앱 주소가 있으면 입력
  updated: "2026-10-08",
};

const CATS = [
  {
    slug: "stories",
    name: "합격 스토리",
    short: "스토리",
    emoji: "🎓",
    color: "#f59e0b",
    desc: "먼저 붙은 선배들이 어떻게 공부했는지 들려주는 이야기. 실패담도 있어요.",
    note: "이 카테고리의 글은 두기고 학생들이 들려준 이야기를 바탕으로, 이름과 세부 내용을 바꿔 다시 쓴 각색 글입니다. 실제 인물의 실명 후기가 아닙니다.",
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
function renderBody(src) {
  const blocks = src.trim().split(/\n\s*\n/);
  let html = "";
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1 && lines[0].startsWith("## ")) {
      html += `<h2>${esc(lines[0].slice(3))}</h2>\n`;
    } else if (lines.every((l) => l.startsWith("- "))) {
      html += "<ul>" + lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join("") + "</ul>\n";
    } else {
      html += `<p>${lines.map(esc).join("<br>")}</p>\n`;
    }
  }
  return html;
}
const readMin = (src) => Math.max(1, Math.round(src.replace(/\s/g, "").length / 450));
const fmtDate = (d) => d.replace(/-/g, ".");

// ---------- 데이터 정리 ----------
// 추가 본문은 각 글의 마지막 문단(맺음말) 바로 앞에 끼워 넣는다
const EXTRA = require("./content/extra.js");
function withExtra(p) {
  const ex = EXTRA[p.slug];
  if (!ex) return p.body;
  const blocks = p.body.trim().split(/\n\s*\n/);
  const last = blocks.pop();
  return [...blocks, ex.trim(), last].join("\n\n");
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
    <p class="lead">전기·정보처리·컴활·한국사까지. 먼저 붙은 선배 이야기, 시험 미리보기, 바로 쓰는 공부 팁을 한곳에 모았어요.</p>
    <div class="hero-cta">
      <a class="btn primary" href="/category/stories/">합격 스토리 보기</a>
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
  write("index.html", layout({ title: SITE.name, desc: "특성화고·일반고 학생을 위한 자격증 정보. 합격 스토리, 시험 미리보기, 공부 꿀팁을 모았어요.", path: "/", body, active: "home" }));
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
    ${p.cat.note ? `<p class="note">${esc(p.cat.note)}</p>` : ""}
    ${renderBody(p.body)}
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
<li>합격 스토리: 먼저 붙은 선배들의 공부 방법과 실패담</li>
<li>시험 미리보기: 종목별 구성과 준비 순서</li>
<li>공부 꿀팁: 기출 푸는 법, 암기법, 시험 당일 체크리스트</li>
</ul>
<h2>다루는 종목</h2>
<p>전기기능사, 전기기사, 전기공사산업기사, 승강기기능사, 정보처리기능사, 정보처리산업기사, 컴퓨터활용능력 2급, 한국사능력검정시험, 자동화설비(생산자동화)기능사, 자동화설비산업기사, 시각디자인산업기사, 3D프린터운용기능사 등 학생들이 많이 준비하는 시험을 다뤄요.</p>
<h2>글 쓰는 원칙</h2>
<ul>
<li>어려운 말은 쉽게 풀어서 써요.</li>
<li>시험 일정이나 기준처럼 바뀌는 정보는 단정하지 않고, 공식 공고를 확인하라고 안내해요.</li>
<li>합격 스토리는 학생들이 들려준 이야기를 바탕으로 이름과 세부 내용을 바꿔 다시 쓴 각색 글이고, 각 글에 그 사실을 밝혀요.</li>
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
<h2>3. 합격 스토리</h2>
<p>합격 스토리 카테고리의 글은 이용자들이 들려준 이야기를 바탕으로 이름과 세부 내용을 바꿔 쓴 각색 글입니다. 공부 방법과 경험은 사람마다 다르며, 같은 방법으로 같은 결과를 얻는다고 보장하지 않습니다.</p>
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
