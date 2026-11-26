// 글 본문에서 [[fig:키|캡션]] 으로 불러 쓰는 직접 그린 SVG 도표
const T = (x, y, s, o = "") => `<text x="${x}" y="${y}" font-size="13" fill="currentColor" ${o}>${s}</text>`;
const L = (x1, y1, x2, y2, w = 2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;

function contact(x, y, kind, label) {
  // x,y: 접점 중심. a접점은 두 선, b접점은 두 선과 사선
  let s = L(x - 8, y - 12, x - 8, y + 12) + L(x + 8, y - 12, x + 8, y + 12);
  if (kind === "b") s += L(x - 14, y + 12, x + 14, y - 12, 1.6);
  s += T(x - 24, y - 20, label, 'text-anchor="start"');
  return s;
}
function coil(x, y, label) {
  return `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="currentColor" stroke-width="2"/>` + T(x - 16, y - 20, label);
}
function ladder(ox, kind, title, note, bad) {
  const w = 300, y1 = 70, y2 = 130;
  let s = T(ox, 22, title, 'font-weight="700"');
  s += L(ox, 40, ox, 160) + L(ox + w, 40, ox + w, 160);
  // 1번 줄
  s += L(ox, y1, ox + 40, y1) + contact(ox + 56, y1, "a", "정회전 버튼") + L(ox + 70, y1, ox + 140, y1);
  s += contact(ox + 156, y1, kind, "MC2 접점") + L(ox + 170, y1, ox + 232, y1) + coil(ox + 245, y1, "MC1") + L(ox + 258, y1, ox + w, y1);
  // 2번 줄
  s += L(ox, y2, ox + 40, y2) + contact(ox + 56, y2, "a", "역회전 버튼") + L(ox + 70, y2, ox + 140, y2);
  s += contact(ox + 156, y2, kind, "MC1 접점") + L(ox + 170, y2, ox + 232, y2) + coil(ox + 245, y2, "MC2") + L(ox + 258, y2, ox + w, y2);
  s += T(ox, 186, note, `fill="${bad ? "#c0392b" : "#1e8449"}" font-weight="600"`);
  return s;
}

module.exports = {
  "ai-boundary": `<svg viewBox="0 0 680 230" role="img" aria-label="AI가 잘하는 화면 안의 일과 사람이 필요한 화면 밖의 일을 나눈 그림" style="width:100%;height:auto;color:inherit">
<rect x="8" y="8" width="290" height="190" rx="12" fill="none" stroke="currentColor" stroke-width="2"/>
<rect x="382" y="8" width="290" height="190" rx="12" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="7 5"/>
${T(24, 36, "화면 안의 일", 'font-weight="700" font-size="15"')}
${T(24, 62, "AI가 빠르게 해 주는 쪽")}
${T(24, 96, "· 문장 다듬기")}${T(24, 122, "· 제어 프로그램 초안")}${T(24, 148, "· 표와 자료 정리")}${T(24, 174, "· 규칙대로 분류하기")}
${T(398, 36, "화면 밖의 일", 'font-weight="700" font-size="15"')}
${T(398, 62, "사람이 서 있어야 하는 쪽")}
${T(398, 96, "· 배선이 제대로 물렸는지 확인")}${T(398, 122, "· 소리와 냄새로 고장 짐작")}${T(398, 148, "· 전원을 켜도 되는지 판단")}${T(398, 174, "· 사고 났을 때 책임지기")}
${L(306, 103, 372, 103, 2.5)}<polygon points="372,96 384,103 372,110" fill="currentColor"/>
${T(310, 86, "설비에", 'font-size="12"')}${T(310, 124, "올리는 순간", 'font-size="12"')}
</svg>`,
  "interlock-compare": `<svg viewBox="0 0 640 410" role="img" aria-label="정역 운전 인터록 회로에서 b접점을 쓴 올바른 회로와 a접점을 쓴 틀린 회로를 비교한 그림" style="width:100%;height:auto;color:inherit">
${ladder(10, "b", "올바른 회로", "→ 한쪽이 켜지면 다른 쪽 길이 끊긴다", false)}
<g transform="translate(0,205)">${ladder(10, "a", "틀린 회로 (그럴듯해 보이는 것)", "→ 두 버튼을 함께 누르면 둘 다 켜질 수 있다", true)}</g>
</svg>`,
};
