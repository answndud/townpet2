import "dotenv/config";
import { PostScope } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  listRankedSearchPosts,
  type PostSearchIn,
} from "../src/server/queries/post.queries";

type SearchCase = {
  id: string;
  query: string;
  searchIn: PostSearchIn;
  expected: string;
};

const SEARCH_CASES: SearchCase[] = [
  { id: "01", query: "강남 산책", searchIn: "ALL", expected: "강남 산책로 추천" },
  { id: "02", query: "동물병원 후기", searchIn: "ALL", expected: "병원 리뷰 글 우선" },
  { id: "03", query: "예방접종 비용", searchIn: "CONTENT", expected: "비용/진료비 글" },
  { id: "04", query: "슬개골", searchIn: "CONTENT", expected: "의료 키워드 글" },
  { id: "05", query: "중성화", searchIn: "TITLE", expected: "제목 정확 매치" },
  { id: "06", query: "산책코스", searchIn: "TITLE", expected: "띄어쓰기 변형 매치" },
  { id: "07", query: "Alex", searchIn: "AUTHOR", expected: "작성자 Alex" },
  { id: "08", query: "강남견주", searchIn: "AUTHOR", expected: "닉네임 정확 매치" },
  { id: "09", query: "분실", searchIn: "ALL", expected: "LOST_FOUND 계열" },
  { id: "10", query: "우리동네 병원", searchIn: "ALL", expected: "지역+병원 복합" },
  { id: "11", query: "24시 응급", searchIn: "TITLE", expected: "숫자/특수문자 제목" },
  { id: "12", query: "강아지 사료 추천", searchIn: "CONTENT", expected: "리뷰/추천 글" },
  { id: "13", query: "카페", searchIn: "ALL", expected: "PLACE_REVIEW 관련" },
  { id: "14", query: "서울숲", searchIn: "TITLE", expected: "고유명사 매치" },
  { id: "15", query: "관절 영양제", searchIn: "CONTENT", expected: "건강관리 글" },
  { id: "16", query: "주말 번개", searchIn: "ALL", expected: "MEETUP 관련" },
  { id: "17", query: "동물 메디컬센터", searchIn: "ALL", expected: "부분/유사 철자" },
  { id: "18", query: "주차 가능 산책", searchIn: "CONTENT", expected: "복합 문장 검색" },
  { id: "19", query: "후기", searchIn: "TITLE", expected: "일반키워드 균형" },
  { id: "20", query: "ㅅㅏㄴㅊㅐㄱ", searchIn: "ALL", expected: "오탐 과다 방지" },
  { id: "21", query: "고양이", searchIn: "ALL", expected: "고양이 글 매치" },
  { id: "22", query: "펫프렌들리", searchIn: "ALL", expected: "영문/한글 혼합" },
];

function escapePipe(value: string) {
  return value.replaceAll("|", "\\|");
}

type ExistingResult = {
  status: string;
  memo: string;
};

function parseExistingResults(markdown: string) {
  const map = new Map<string, ExistingResult>();
  const lines = markdown.split("\n");

  for (const line of lines) {
    if (!line.startsWith("| ")) {
      continue;
    }
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 8) {
      continue;
    }
    const id = cells[1];
    if (!/^\d{2}$/.test(id)) {
      continue;
    }

    map.set(id, {
      status: cells[6] || "[ ]",
      memo: cells[7] || "",
    });
  }

  return map;
}

async function main() {
  const rows: string[] = [];
  const statuses: string[] = [];
  const startedAt = new Date();
  const outputPath = resolve(process.cwd(), "../docs/plan/search-manual-check-results.md");
  let existingResults = new Map<string, ExistingResult>();

  try {
    const existing = await readFile(outputPath, "utf8");
    existingResults = parseExistingResults(existing);
  } catch {
    existingResults = new Map<string, ExistingResult>();
  }

  for (const entry of SEARCH_CASES) {
    const result = await listRankedSearchPosts({
      limit: 5,
      scope: PostScope.GLOBAL,
      q: entry.query,
      searchIn: entry.searchIn,
    });

    const topTitles = result.map((item, index) => `${index + 1}. ${item.title}`);
    const existing = existingResults.get(entry.id);
    const status = existing?.status || "[ ]";
    const memo = existing?.memo || "";
    statuses.push(status);

    rows.push(
      `| ${entry.id} | ${escapePipe(entry.query)} | ${entry.searchIn} | ${escapePipe(entry.expected)} | ${escapePipe(topTitles.join(" / ")) || "(결과 없음)"} | ${status} | ${escapePipe(memo)} |`,
    );
  }

  const passCount = statuses.filter((status) => status === "PASS").length;
  const warnCount = statuses.filter((status) => status === "WARN").length;
  const failCount = statuses.filter((status) => status === "FAIL").length;

  const report = [
    "# Search Manual Check Results",
    "",
    `- 생성 시각: ${startedAt.toISOString()}`,
    "- 실행 범위: GLOBAL / top5",
    "- 판정 규칙: 체크리스트 기준으로 PASS/WARN/FAIL 수동 기입",
    "",
    "| ID | 질의 | 범위 | 기대 결과 | top5 결과 | 상태 | 메모 |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## 판정 요약",
    `- PASS: ${passCount}`,
    `- WARN: ${warnCount}`,
    `- FAIL: ${failCount}`,
    "",
  ].join("\n");

  await writeFile(outputPath, report, "utf8");

  console.log(`Saved: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
