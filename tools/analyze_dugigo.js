// 두기고 기출 데이터에서 종목별 통계를 계산해 content/data_stats.json 으로 저장한다.
// 사용법: node tools/analyze_dugigo.js [데이터 폴더]   (기본: E:/DugiGo/client/src/data)
// 원문 문제를 저장하지 않고, 개수와 비율만 저장한다. 반복 문항 예시는 앞부분 일부만 남긴다.
const fs = require("fs");
const path = require("path");

const DATA = process.argv[2] || "E:/DugiGo/client/src/data";
const OUT = path.join(__dirname, "..", "content", "data_stats.json");

// 미리보기 글 slug → 데이터 폴더
const SUBJECTS = {
  "preview-electric-technician": "전기기능사",
  "preview-electric-engineer": "전기기사",
  "preview-infoprocess-technician": "정보처리기능사",
  "preview-infoprocess-industrial": "정보처리산업기사",
  "preview-computer-skills-2": "컴퓨터활용능력 2급",
  "preview-korean-history": "한국사검정시험",
  "preview-elevator": "승강기기능사",
  "preview-automation-technician": "자동화설비(생산자동화)기능사",
  "preview-automation-industrial": "자동화설비산업기사",
  "preview-electric-construction": "전기공사산업기사",
};

const norm = (s) => String(s || "").replace(/\s+/g, "").replace(/[()\[\]{}'"“”‘’·.,?!:;\-]/g, "");
const readJson = (f) => {
  const raw = JSON.parse(fs.readFileSync(f, "utf8").replace(/^\uFEFF/, ""));
  return Array.isArray(raw) ? raw : raw.questions || raw.data || Object.values(raw).find(Array.isArray) || [];
};
const roundKey = (q) => {
  if (q.year && q.round) return `${q.year}-${q.round}`;
  if (q.round_info) return String(q.round_info);
  if (q.round) return `r${q.round}`;
  return null;
};

const out = { generatedFrom: "두기고 기출 데이터", subjects: {} };

for (const [slug, dir] of Object.entries(SUBJECTS)) {
  const folder = path.join(DATA, dir);
  const files = fs.readdirSync(folder).filter((f) => f.endsWith(".json") && !/MASTER|bak|BACKUP|족집게/i.test(f));
  const units = [];
  const all = [];
  for (const f of files) {
    const rows = readJson(path.join(folder, f));
    const name = f.replace(/\.json$/, "").replace(/^\d+\.\s*/, "");
    units.push({ name, entries: rows.length, unique: new Set(rows.map((q) => norm(q.question)).filter((x) => x.length >= 8)).size });
    for (const q of rows) all.push({ ...q, _unit: name });
  }

  // 같은 문장이 몇 개 회차에 나왔는지
  const byText = new Map();
  for (const q of all) {
    const k = norm(q.question);
    if (k.length < 8) continue;
    if (!byText.has(k)) byText.set(k, { q: q.question, rounds: new Set(), n: 0 });
    const e = byText.get(k);
    e.n++;
    const r = roundKey(q);
    if (r) e.rounds.add(r);
  }
  const rounds = new Set(all.map(roundKey).filter(Boolean));
  const years = [...new Set(all.map((q) => q.year).filter((y) => /^\d{4}$/.test(String(y))))].sort();
  const uniq = byText.size;
  const hasRounds = rounds.size > 1;
  const repeated = hasRounds ? [...byText.values()].filter((e) => e.rounds.size >= 2) : [];
  const top = repeated
    .sort((a, b) => b.rounds.size - a.rounds.size)
    .slice(0, 5)
    .map((e) => ({ text: String(e.q).replace(/\s+/g, " ").slice(0, 38), rounds: e.rounds.size }));

  out.subjects[slug] = {
    folder: dir,
    entries: all.length,
    unique: uniq,
    rounds: rounds.size,
    years: years.length ? [years[0], years[years.length - 1]] : null,
    repeatedUnique: hasRounds ? repeated.length : null,
    repeatedShare: hasRounds && uniq ? Math.round((repeated.length / uniq) * 1000) / 10 : null,
    avgAppear: uniq ? Math.round((all.length / uniq) * 100) / 100 : null,
    top,
    units,
  };
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 1), "utf8");
for (const [s, v] of Object.entries(out.subjects)) {
  console.log(`\n== ${v.folder}  수록 ${v.entries} / 고유 ${v.unique} / 회차 ${v.rounds} / 연도 ${v.years ? v.years.join("~") : "-"} / 2회차 이상 반복 ${v.repeatedUnique}개 (${v.repeatedShare}%) / 평균 ${v.avgAppear}회`);
  console.log("   단원:", v.units.map((u) => `${u.name} ${u.entries}→${u.unique}`).join(" | "));
  console.log("   TOP:", v.top.map((t) => `${t.rounds}회 ${t.text}`).join(" / ") || "-");
}
