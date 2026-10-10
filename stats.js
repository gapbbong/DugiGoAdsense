// 글자수 측정 및 애드센스 품질 검수 스크립트: npm run stats
const fs = require("fs");
const path = require("path");

const CATS = [
  { slug: "stories", name: "합격 스토리", posts: require("./content/stories.js") },
  { slug: "previews", name: "시험 미리보기", posts: require("./content/previews.js") },
  { slug: "tips", name: "공부 꿀팁", posts: require("./content/tips.js") },
];

const EXTRAS = [require("./content/extra.js"), require("./content/extra2.js")];

// build.js와 완전히 동일한 본문 확장 로직
function withExtra(p) {
  const adds = EXTRAS.map((e) => e[p.slug]).filter(Boolean);
  if (!adds.length) return p.body;
  const blocks = p.body.trim().split(/\n\s*\n/);
  const last = blocks.pop();
  return [...blocks, ...adds.map((a) => a.trim()), last].join("\n\n");
}

// 네이버/포털 글자수세기 표준 방식 정규화
function countStats(rawText) {
  // 1. 유니코드 정규화 (NFC)
  let text = rawText.normalize("NFC");
  
  // 2. 줄바꿈 통일 (\r\n -> \n)
  text = text.replace(/\r\n/g, "\n");
  
  // 3. 마크다운 기호 제거 (제목 ##, 리스트 - 등 순수 텍스트 기준)
  const plainText = text
    .split("\n")
    .map(line => line.replace(/^#{1,6}\s+/, "").replace(/^[-*]\s+/, "").trim())
    .join("\n")
    .trim();

  const withSpaces = plainText.length;
  const withoutSpaces = plainText.replace(/\s/g, "").length;
  const byteCount = Buffer.byteLength(plainText, "utf8");

  return { withSpaces, withoutSpaces, byteCount };
}

console.log("=".repeat(88));
console.log(`[두기고 자격증 사이트] 콘텐츠 글자수 분석 리포트 (총 31편)`);
console.log("=".repeat(88));
console.log(
  "카테고리".padEnd(10) +
  "제목".padEnd(36) +
  "공백포함".padStart(10) +
  "공백제외".padStart(10) +
  "상태".padStart(10)
);
console.log("-".repeat(88));

let totalWith = 0;
let totalWithout = 0;
let count = 0;
let lowCount = 0;

for (const c of CATS) {
  for (const p of c.posts) {
    const fullBody = withExtra(p);
    const stats = countStats(fullBody);

    totalWith += stats.withSpaces;
    totalWithout += stats.withoutSpaces;
    count++;

    // 애드센스 권장: 공백 포함 1,000자 이상
    const isWarning = stats.withSpaces < 1000;
    if (isWarning) lowCount++;

    const status = isWarning ? "⚠️ 미달" : "✅ 적합";
    
    // 제목이 길면 자르기
    const displayTitle = p.title.length > 20 ? p.title.slice(0, 19) + "…" : p.title;

    console.log(
      c.name.padEnd(8) + " | " +
      displayTitle.padEnd(24) + " | " +
      (stats.withSpaces + "자").padStart(10) + " | " +
      (stats.withoutSpaces + "자").padStart(10) + " | " +
      status.padStart(8)
    );
  }
}

console.log("=".repeat(88));
const avgWith = Math.round(totalWith / count);
const avgWithout = Math.round(totalWithout / count);

console.log(`총 글 수: ${count}편 | 평균 글자수: 공백포함 ${avgWith.toLocaleString()}자 / 공백제외 ${avgWithout.toLocaleString()}자`);
if (lowCount > 0) {
  console.log(`⚠️ 1,000자 미만 게시글: ${lowCount}편 (보강 권장)`);
} else {
  console.log(`🎉 모든 게시글이 1,000자 이상으로 애드센스 심사에 충분한 분량입니다!`);
}
console.log("=".repeat(88));
