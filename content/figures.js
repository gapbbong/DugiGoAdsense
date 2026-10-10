// 글에 넣는 도표와 그림(SVG). 색은 CSS 변수와 클래스로 지정해 라이트/다크 모두에서 보인다.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 긴 이름을 두 줄로 나눈다
function wrap(label, max = 8) {
  const s = String(label);
  if (s.length <= max) return [s];
  const mid = Math.floor(s.length / 2);
  let cut = -1;
  for (let d = 0; d <= mid; d++) {
    if (s[mid - d] === " ") { cut = mid - d; break; }
    if (s[mid + d] === " ") { cut = mid + d; break; }
  }
  if (cut < 0) cut = Math.ceil(s.length / 2);
  return [s.slice(0, cut).trim(), s.slice(cut).trim()];
}
const svg = (w, h, label, inner) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const T = (x, y, t, cls = "f-text", anchor = "start") =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(t)}</text>`;

// 가로 막대 (단원별 수록 문항 수 등). format 으로 값 표기를 바꿀 수 있다.
function barChart(items, label, format) {
  const fmt = format || ((v) => v.toLocaleString("ko-KR"));
  const W = 640, barX = 214, barMax = 330, rowH = 36, top = 6;
  const max = Math.max(...items.map((i) => i.value));
  const H = top * 2 + items.length * rowH;
  let g = "";
  items.forEach((it, i) => {
    const y = top + i * rowH;
    const w = Math.max(3, Math.round((it.value / max) * barMax));
    const inside = it.value / max > 0.85;
    g += T(0, y + 22, it.label, "f-text");
    g += `<rect class="f-track" x="${barX}" y="${y + 6}" width="${barMax}" height="20" rx="5"/>`;
    g += `<rect class="f-bar" x="${barX}" y="${y + 6}" width="${w}" height="20" rx="5"/>`;
    g += T(inside ? barX + w - 8 : barX + w + 8, y + 21, fmt(it.value), inside ? "f-text f-on" : "f-text f-strong", inside ? "end" : "start");
  });
  return svg(W, H, label, g);
}

// 기능사 합격선 (100점 만점, 60점)
function passLine60(label) {
  const x0 = 20, w = 600, x60 = x0 + w * 0.6;
  let g = `<rect class="f-track" x="${x0}" y="34" width="${w * 0.6}" height="26" rx="6"/>`;
  g += `<rect class="f-bar" x="${x60}" y="34" width="${w * 0.4}" height="26" rx="6"/>`;
  g += `<line class="f-line" x1="${x60}" y1="24" x2="${x60}" y2="70"/>`;
  g += T(x0 + 8, 52, "불합격", "f-text") + T(x60 + 12, 52, "합격", "f-text f-on");
  g += T(x60, 18, "합격선 60점", "f-text f-strong", "middle");
  g += T(x0, 90, "0점", "f-small") + T(x0 + w, 90, "100점", "f-small", "end");
  return svg(640, 100, label, g);
}

// 과목별 40점 이상 + 평균 60점 이상
function ruleDiagram(subjects, label) {
  const n = subjects.length, gap = 10, W = 640, boxW = Math.floor((W - 20 - gap * (n - 1)) / n), y = 42;
  let g = "";
  subjects.forEach((s, i) => {
    const x = 10 + i * (boxW + gap);
    g += `<rect class="f-box" x="${x}" y="${y}" width="${boxW}" height="74" rx="10"/>`;
    const lines = wrap(s, n >= 5 ? 6 : 9);
    lines.forEach((ln, k) => (g += T(x + boxW / 2, y + 26 + k * 16, ln, "f-text", "middle")));
    g += T(x + boxW / 2, y + 66, "40점 이상", "f-text f-strong", "middle");
  });
  const x1 = 10, x2 = 10 + n * boxW + (n - 1) * gap;
  g += `<path class="f-line" d="M${x1} ${y - 8} V${y - 16} H${x2} V${y - 8}" fill="none"/>`;
  g += T((x1 + x2) / 2, y - 24, "모든 과목 40점 이상 + 평균 60점 이상이어야 합격", "f-text f-strong", "middle");
  g += T((x1 + x2) / 2, y + 100, "한 과목이라도 40점 미만이면 평균이 높아도 불합격(과락)", "f-small", "middle");
  return svg(W, y + 114, label, g);
}

// 직렬 / 병렬 저항
function resistors() {
  const box = (x, y, t) => `<rect class="f-box" x="${x}" y="${y}" width="56" height="26" rx="4"/>` + T(x + 28, y + 18, t, "f-text", "middle");
  let g = T(0, 18, "직렬 연결", "f-text f-strong");
  g += `<line class="f-line" x1="20" y1="46" x2="60" y2="46"/>` + box(60, 33, "R1");
  g += `<line class="f-line" x1="116" y1="46" x2="160" y2="46"/>` + box(160, 33, "R2");
  g += `<line class="f-line" x1="216" y1="46" x2="256" y2="46"/>`;
  g += T(20, 90, "R = R1 + R2", "f-text f-strong");
  g += T(340, 18, "병렬 연결", "f-text f-strong");
  g += `<line class="f-line" x1="360" y1="46" x2="400" y2="46"/><line class="f-line" x1="400" y1="26" x2="400" y2="76"/>`;
  g += `<line class="f-line" x1="400" y1="26" x2="430" y2="26"/>` + box(430, 13, "R1") + `<line class="f-line" x1="486" y1="26" x2="516" y2="26"/>`;
  g += `<line class="f-line" x1="400" y1="76" x2="430" y2="76"/>` + box(430, 63, "R2") + `<line class="f-line" x1="486" y1="76" x2="516" y2="76"/>`;
  g += `<line class="f-line" x1="516" y1="26" x2="516" y2="76"/><line class="f-line" x1="516" y1="46" x2="556" y2="46"/>`;
  g += T(340, 108, "R = (R1 × R2) ÷ (R1 + R2)", "f-text f-strong");
  return svg(640, 124, "직렬 연결과 병렬 연결의 합성저항 공식", g);
}

// 엘리베이터 구조
function elevator() {
  let g = "";
  g += `<rect class="f-box" x="150" y="8" width="340" height="52" rx="8"/>` + T(160, 26, "기계실", "f-small");
  g += `<circle class="f-box" cx="270" cy="38" r="14"/>` + T(240, 43, "권상기(모터)", "f-text f-strong", "end");
  g += `<circle class="f-box" cx="400" cy="38" r="9"/>` + T(436, 42, "조속기", "f-text f-strong", "middle");
  g += `<line class="f-line" x1="256" y1="38" x2="256" y2="200"/><line class="f-line" x1="284" y1="38" x2="284" y2="140"/>`;
  g += `<rect class="f-box" x="220" y="200" width="70" height="86" rx="6"/>` + T(255, 236, "카", "f-text f-strong", "middle") + T(255, 256, "(타는 곳)", "f-small", "middle");
  g += `<rect class="f-bar" x="255" y="140" width="60" height="58" rx="6" opacity="0.9"/>` + T(285, 174, "균형추", "f-text f-on", "middle");
  g += `<line class="f-line f-dash" x1="400" y1="47" x2="400" y2="276"/><line class="f-line f-dash" x1="400" y1="276" x2="290" y2="276"/>`;
  g += T(410, 150, "조속기 로프", "f-small");
  g += `<rect class="f-box f-warn" x="200" y="288" width="110" height="22" rx="4"/>` + T(255, 304, "비상정지장치", "f-text f-strong", "middle");
  g += `<line class="f-rail" x1="190" y1="70" x2="190" y2="318"/><line class="f-rail" x1="330" y1="70" x2="330" y2="318"/>`;
  g += T(100, 330, "가이드레일", "f-small");
  g += T(416, 214, "과속하면 조속기가 감지하고", "f-small") + T(416, 232, "비상정지장치가 레일을 물어 멈춘다", "f-small");
  return svg(640, 340, "엘리베이터 구조: 권상기, 로프, 카, 균형추, 조속기, 비상정지장치", g);
}

// PLC 자기유지 회로(래더)
function selfHold() {
  let g = `<line class="f-line" x1="40" y1="20" x2="40" y2="160"/><line class="f-line" x1="600" y1="20" x2="600" y2="160"/>`;
  g += `<line class="f-line" x1="40" y1="60" x2="110" y2="60"/>`;
  g += `<line class="f-line" x1="110" y1="46" x2="110" y2="74"/><line class="f-line" x1="134" y1="46" x2="134" y2="74"/><line class="f-line" x1="104" y1="76" x2="140" y2="44"/>`;
  g += T(122, 36, "정지(NC)", "f-small", "middle");
  g += `<line class="f-line" x1="134" y1="60" x2="220" y2="60"/>`;
  g += `<line class="f-line" x1="220" y1="60" x2="220" y2="130"/>`;
  g += `<line class="f-line" x1="220" y1="60" x2="274" y2="60"/><line class="f-line" x1="274" y1="46" x2="274" y2="74"/><line class="f-line" x1="298" y1="46" x2="298" y2="74"/><line class="f-line" x1="298" y1="60" x2="360" y2="60"/>`;
  g += T(286, 36, "시작(NO)", "f-small", "middle");
  g += `<line class="f-line" x1="220" y1="130" x2="274" y2="130"/><line class="f-line" x1="274" y1="116" x2="274" y2="144"/><line class="f-line" x1="298" y1="116" x2="298" y2="144"/><line class="f-line" x1="298" y1="130" x2="360" y2="130"/>`;
  g += T(286, 164, "자기유지 접점(NO)", "f-small", "middle");
  g += `<line class="f-line" x1="360" y1="60" x2="360" y2="130"/><line class="f-line" x1="360" y1="95" x2="474" y2="95"/>`;
  g += `<circle class="f-box" cx="500" cy="95" r="26"/>` + T(500, 100, "코일", "f-text f-strong", "middle") + `<line class="f-line" x1="526" y1="95" x2="600" y2="95"/>`;
  g += T(320, 196, "버튼을 눌렀다 떼도 코일이 켜진 채로 유지된다", "f-text f-strong", "middle");
  return svg(640, 210, "PLC 자기유지 회로 래더 다이어그램", g);
}

// 스택과 큐
function stackQueue() {
  let g = T(60, 18, "스택 (후입선출)", "f-text f-strong", "middle");
  [0, 1, 2].forEach((i) => (g += `<rect class="${i === 0 ? "f-bar" : "f-box"}" x="10" y="${34 + i * 34}" width="100" height="30" rx="4"/>` + T(60, 54 + i * 34, i === 0 ? "나중에 넣은 값" : "먼저 넣은 값", i === 0 ? "f-small f-on" : "f-small", "middle")));
  g += T(120, 54, "← 넣고 뺀다(위쪽)", "f-small");
  g += T(420, 18, "큐 (선입선출)", "f-text f-strong", "middle");
  [0, 1, 2].forEach((i) => (g += `<rect class="${i === 0 ? "f-bar" : "f-box"}" x="${280 + i * 90}" y="48" width="84" height="40" rx="4"/>` + T(322 + i * 90, 72, i === 0 ? "먼저 온 값" : i === 1 ? "중간 값" : "나중에 온 값", i === 0 ? "f-small f-on" : "f-small", "middle")));
  g += T(280, 112, "← 꺼낸다(맨 앞)", "f-small") + T(550, 112, "넣는다 →", "f-small", "end");
  return svg(640, 130, "스택과 큐의 입출력 순서 비교", g);
}

// 정규화 단계
function normalization() {
  const steps = [["제1정규형", "모든 값이 원자값"], ["제2정규형", "부분 함수 종속 제거"], ["제3정규형", "이행 함수 종속 제거"], ["BCNF", "결정자는 후보키"]];
  let g = "";
  steps.forEach((s, i) => {
    const x = 10 + i * 158;
    g += `<rect class="${i === 0 ? "f-bar" : "f-box"}" x="${x}" y="20" width="132" height="72" rx="10"/>`;
    g += T(x + 66, 50, s[0], i === 0 ? "f-text f-on" : "f-text f-strong", "middle") + T(x + 66, 72, s[1], i === 0 ? "f-small f-on" : "f-small", "middle");
    if (i < 3) g += `<path class="f-line" d="M${x + 136} 56 h14 m-6 -5 l6 5 l-6 5" fill="none"/>`;
  });
  return svg(640, 112, "데이터베이스 정규화 단계: 제1정규형에서 BCNF까지", g);
}

// 전압 구분(KEC)
function voltageBands() {
  let g = "";
  g += `<rect class="f-box" x="10" y="36" width="200" height="56" rx="8"/>` + T(110, 60, "저압", "f-text f-strong", "middle") + T(110, 80, "교류 1,000V 이하 · 직류 1,500V 이하", "f-tiny", "middle");
  g += `<rect class="f-box" x="220" y="36" width="200" height="56" rx="8"/>` + T(320, 60, "고압", "f-text f-strong", "middle") + T(320, 80, "저압을 넘고 7,000V 이하", "f-tiny", "middle");
  g += `<rect class="f-bar" x="430" y="36" width="200" height="56" rx="8"/>` + T(530, 60, "특고압", "f-text f-on", "middle") + T(530, 80, "7,000V 초과", "f-tiny f-on", "middle");
  g += T(10, 20, "전압이 낮다", "f-small") + T(630, 20, "전압이 높다", "f-small", "end");
  return svg(640, 108, "한국전기설비규정의 전압 구분: 저압, 고압, 특고압", g);
}

// 한국사 7개 시대 단원
function historyTimeline() {
  const eras = ["선사·국가 형성", "삼국·남북국", "고려", "조선 전기", "조선 후기", "근대", "일제강점기·현대"];
  let g = T(320, 18, "두기고 한국사 7개 시대 단원", "f-text f-strong", "middle");
  eras.forEach((e, i) => {
    const x = 10 + i * 88;
    g += `<rect class="${i >= 5 ? "f-bar" : "f-box"}" x="${x}" y="30" width="80" height="44" rx="8"/>`;
    const ls = wrap(e, 5);
    ls.forEach((ln, k) => (g += T(x + 40, (ls.length === 1 ? 57 : 49) + k * 15, ln, i >= 5 ? "f-small f-on" : "f-small", "middle")));
    g += T(x + 40, 92, `${i + 1}단원`, "f-tiny", "middle");
  });
  return svg(640, 104, "한국사 7개 시대 단원 흐름", g);
}

module.exports = { barChart, passLine60, ruleDiagram, resistors, elevator, selfHold, stackQueue, normalization, voltageBands, historyTimeline };
