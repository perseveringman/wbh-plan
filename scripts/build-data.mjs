import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const sourcePath =
  "/Users/ryanbzhou/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_5a6dasbgxykg21_ca22/msg/file/2026-05/culture-com/data/exhibitors_all.json";
const pdfPath =
  "/Users/ryanbzhou/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_5a6dasbgxykg21_ca22/msg/file/2026-05/文博会·全球AI切磋盛典展区交通指引指南（嘉宾）.pdf";

const outDir = path.join(root, "public", "data");
fs.mkdirSync(outDir, { recursive: true });

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const hallNames = {
  "9": "时尚·艺术馆",
  "10": "文化产业综合馆A",
  "11": "全球文化贸易馆",
  "12": "文化产业综合馆B",
  "13": "文化传承与创新馆",
  "14": "文化产业综合馆C",
  "15": "粤港澳大湾区文化产业创新馆",
  "16": "文化科技馆",
};

function normalizeSpace(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function hallNoFrom(item) {
  const hallText = item.hallName || "";
  const boothText = item.booth || "";
  const hallMatch = hallText.match(/(\d{1,2})号馆/);
  if (hallMatch) return hallMatch[1].padStart(2, "0");
  const boothMatch = boothText.match(/^0?(\d{1,2})/);
  if (boothMatch) return boothMatch[1].padStart(2, "0");
  return "00";
}

function tagFor(item) {
  const text = `${item.company || ""} ${item.companyAbbreviation || ""} ${item.industryName || ""} ${item.introduction || ""}`;
  const tags = new Set();
  const add = (tag, words) => {
    if (words.some((word) => text.includes(word))) tags.add(tag);
  };

  add("AI", ["AI", "人工智能", "AIGC", "大模型", "智能体", "算法", "机器人", "具身"]);
  add("数字科技", ["数字", "元宇宙", "VR", "XR", "AR", "互动", "沉浸", "电竞", "游戏", "互联网"]);
  add("文旅", ["文旅", "旅游", "景区", "博物馆", "研学", "演艺", "城市"]);
  add("非遗", ["非遗", "传承", "工艺", "手作", "陶瓷", "茶", "漆", "绣"]);
  add("版权影视", ["影视", "动漫", "版权", "IP", "短剧", "电影", "动画"]);
  add("国际贸易", ["国际", "海外", "出海", "贸易", "APEC", "国家", "文化贸易"]);
  add("出版", ["出版", "书", "阅读", "传媒", "新闻"]);
  add("艺术设计", ["艺术", "设计", "美术", "创意", "时尚", "收藏"]);

  if (!tags.size && item.industryName) tags.add(item.industryName.replace("类", ""));
  return Array.from(tags).slice(0, 5);
}

const seenIds = new Map();

const exhibitors = raw.map((item, index) => {
  const sourceId = item.id || `exhibitor-${index}`;
  const seenCount = seenIds.get(sourceId) || 0;
  seenIds.set(sourceId, seenCount + 1);
  const uniqueId = seenCount === 0 ? sourceId : `${sourceId}-${seenCount + 1}`;
  const hallNo = hallNoFrom(item);
  const hallLabel = hallNames[String(Number(hallNo))] || normalizeSpace(item.hallName) || "未标注展馆";
  const name = normalizeSpace(item.company);
  const shortName = normalizeSpace(item.companyAbbreviation);
  const booth = normalizeSpace(item.booth);
  const intro = normalizeSpace(item.introduction);
  const industry = normalizeSpace(item.industryName);
  const tags = tagFor(item);

  return {
    id: uniqueId,
    sourceId,
    name,
    shortName,
    hallNo,
    hallName: hallLabel,
    booth,
    industry,
    intro,
    tags,
    logo: item.logoUrl || "",
    vr: item.vrShowUrl || "",
    type: item.exhibitionType === 1 ? "展团" : "企业",
    search: `${name} ${shortName} ${hallNo} ${hallLabel} ${booth} ${industry} ${tags.join(" ")} ${intro}`.toLowerCase(),
  };
});

const hallStats = Object.entries(hallNames).map(([number, name]) => {
  const hallNo = number.padStart(2, "0");
  const list = exhibitors.filter((item) => item.hallNo === hallNo);
  const boothCount = list.filter((item) => item.booth).length;
  const industryCounts = list.reduce((acc, item) => {
    acc[item.industry] = (acc[item.industry] || 0) + 1;
    return acc;
  }, {});
  const topIndustries = Object.entries(industryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));

  return {
    number,
    hallNo,
    name,
    count: list.length,
    boothCount,
    topIndustries,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  totalExhibitors: exhibitors.length,
  boothCount: exhibitors.filter((item) => item.booth).length,
  logoCount: exhibitors.filter((item) => item.logo).length,
  vrCount: exhibitors.filter((item) => item.vr).length,
  halls: hallStats,
  sourcePath,
  pdfPath,
};

fs.writeFileSync(path.join(outDir, "exhibitors.json"), JSON.stringify(exhibitors));
fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

console.log(`Wrote ${exhibitors.length} exhibitors to ${path.join(outDir, "exhibitors.json")}`);
