import {
  Building2,
  Bus,
  Car,
  ChevronDown,
  Filter,
  Info,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  MessageCircle,
  Plane,
  Route,
  Search,
  Send,
  Sparkles,
  Star,
  Train,
  X,
} from "lucide-react";
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { eventInfo, hallLayout, hallNotes, interests, sourceLinks } from "./eventData.js";
import hall09Map from "./09 2.jpeg";
import hall10Map from "./10 2.jpeg";
import hall11Map from "./11 2.jpeg";
import hall12Map from "./12 2.jpeg";
import hall13Map from "./13 2.jpeg";
import hall14Map from "./14 2.jpeg";
import hall15Map from "./15 2.jpeg";
import hall16Map from "./16 2.jpeg";

const numberFormatter = new Intl.NumberFormat("zh-CN");
const routeStart = { x: 61, y: 47, label: "南登录大厅 / 国展站C1-C2" };
const sourceBase = "https://www.cnicif.com";
const hallNumbers = ["09", "10", "11", "12", "13", "14", "15", "16"];
const hallMapImages = {
  "09": hall09Map,
  "10": hall10Map,
  "11": hall11Map,
  "12": hall12Map,
  "13": hall13Map,
  "14": hall14Map,
  "15": hall15Map,
  "16": hall16Map,
};

const genericZoneBounds = {
  A: { x1: 58, x2: 92, y1: 72, y2: 92, direction: "up", max: 12 },
  B: { x1: 9, x2: 44, y1: 72, y2: 92, direction: "up", max: 12 },
  C: { x1: 55, x2: 92, y1: 51, y2: 74, direction: "down", max: 24 },
  D: { x1: 55, x2: 92, y1: 32, y2: 52, direction: "down", max: 18 },
  E: { x1: 9, x2: 45, y1: 43, y2: 71, direction: "up", max: 18 },
  F: { x1: 9, x2: 45, y1: 29, y2: 47, direction: "up", max: 18 },
  G: { x1: 56, x2: 92, y1: 9, y2: 31, direction: "down", max: 18 },
  H: { x1: 9, x2: 45, y1: 9, y2: 31, direction: "down", max: 18 },
  J: { x1: 42, x2: 62, y1: 40, y2: 60, direction: "down", max: 12 },
};

const hallZoneBounds = {
  "11": {
    A: { x1: 57, x2: 91, y1: 79, y2: 92, direction: "up", max: 8 },
    B: { x1: 10, x2: 45, y1: 79, y2: 92, direction: "up", max: 4 },
    C: { x1: 50, x2: 92, y1: 58, y2: 79, direction: "down", max: 24 },
    D: { x1: 51, x2: 78, y1: 50, y2: 68, direction: "down", max: 8 },
    E: { x1: 53, x2: 92, y1: 33, y2: 58, direction: "down", max: 12 },
    F: { x1: 9, x2: 45, y1: 54, y2: 76, direction: "up", max: 12 },
    G: { x1: 54, x2: 92, y1: 8, y2: 33, direction: "down", max: 8 },
    H: { x1: 9, x2: 47, y1: 8, y2: 34, direction: "down", max: 5 },
  },
  "13": {
    A: { x1: 56, x2: 92, y1: 78, y2: 94, direction: "up", max: 8 },
    B: { x1: 8, x2: 45, y1: 76, y2: 94, direction: "up", max: 2 },
    C: { x1: 55, x2: 92, y1: 55, y2: 76, direction: "down", max: 14 },
    D: { x1: 55, x2: 92, y1: 32, y2: 55, direction: "down", max: 9 },
    E: { x1: 8, x2: 45, y1: 35, y2: 74, direction: "up", max: 9 },
    H: { x1: 8, x2: 92, y1: 8, y2: 31, direction: "down", max: 10 },
  },
  "15": {
    A: { x1: 8, x2: 45, y1: 8, y2: 91, direction: "up", max: 56 },
    B: { x1: 55, x2: 93, y1: 8, y2: 91, direction: "up", max: 56 },
  },
  "16": {
    A: { x1: 8, x2: 45, y1: 8, y2: 72, direction: "down", max: 12 },
    B: { x1: 55, x2: 93, y1: 8, y2: 45, direction: "down", max: 24 },
    C: { x1: 55, x2: 93, y1: 45, y2: 91, direction: "down", max: 29 },
    D: { x1: 8, x2: 45, y1: 72, y2: 91, direction: "down", max: 4 },
  },
};

const starterPrompts = [
  "我想看AI和文旅，帮我规划路线",
  "11号馆有什么值得看？",
  "从地铁怎么去全球AI切磋盛典？",
  "推荐非遗国潮展商",
];

const keywordAliases = {
  ai: ["AI", "人工智能", "AIGC", "大模型", "机器人", "智能", "元宇宙", "VR", "XR", "数字", "算法"],
  tourism: ["文旅", "旅游", "景区", "博物馆", "研学", "演艺", "城市", "沉浸"],
  heritage: ["非遗", "传承", "工艺", "手作", "国潮", "陶瓷", "茶", "漆", "绣", "刺绣", "瑶绣", "纺织", "织染", "织", "染", "服饰"],
  ip: ["影视", "动漫", "游戏", "电竞", "版权", "IP", "短剧", "电影"],
  trade: ["国际", "贸易", "海外", "出海", "APEC", "国家", "进口", "出口"],
  design: ["艺术", "设计", "创意", "美术", "时尚", "收藏", "文创"],
  publishing: ["出版", "书", "阅读", "传媒", "新闻", "版权"],
};

function unique(items) {
  return Array.from(new Set(items));
}

function uniqueById(items) {
  const map = new Map();
  items.filter(Boolean).forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeHallNo(value) {
  const match = String(value || "").match(/(?:^|\D)(0?9|1[0-6])(?:\D|$)/);
  if (!match) return "";
  const number = Number(match[1]);
  return number === 9 ? "09" : String(number);
}

function boothHallNo(booth) {
  const compact = compactText(booth).replace(/\s+/g, "").toUpperCase();
  const codeMatch = compact.match(/(?:^|[^0-9])(0?9|1[0-6])(?=[A-Z])/);
  if (codeMatch) return Number(codeMatch[1]) === 9 ? "09" : String(Number(codeMatch[1]));
  const labelMatch = compact.match(/(0?9|1[0-6])号馆/);
  if (labelMatch) return Number(labelMatch[1]) === 9 ? "09" : String(Number(labelMatch[1]));
  return "";
}

function getResolvedHallNo(exhibitor) {
  const fromBooth = boothHallNo(exhibitor?.booth);
  if (hallNumbers.includes(fromBooth)) return fromBooth;
  const fromHall = normalizeHallNo(exhibitor?.hallNo);
  return hallNumbers.includes(fromHall) ? fromHall : "00";
}

function formatHallNumber(hallNo) {
  const normalized = normalizeHallNo(hallNo);
  return normalized === "09" ? "9" : String(Number(normalized || hallNo) || "未标注");
}

function parseBoothCode(exhibitor) {
  const hallNo = getResolvedHallNo(exhibitor);
  const compact = compactText(exhibitor?.booth).replace(/\s+/g, "").toUpperCase();
  const pattern = new RegExp(`${Number(hallNo) === 9 ? "0?9" : hallNo}([A-Z])0*(\\d{1,3})`);
  const match = compact.match(pattern) || compact.match(/([A-Z])0*(\d{1,3})/);
  if (!match) {
    return { hallNo, area: "", number: 0, label: compactText(exhibitor?.booth) || "展位待查" };
  }
  return {
    hallNo,
    area: match[1],
    number: Number(match[2]) || 0,
    label: compactText(exhibitor?.booth) || `${hallNo}${match[1]}${match[2]}`,
  };
}

function hasMappableBooth(exhibitor) {
  const booth = parseBoothCode(exhibitor);
  return Boolean(booth.area && booth.number > 0 && hallNumbers.includes(booth.hallNo));
}

function mapReadinessScore(exhibitor) {
  if (hasMappableBooth(exhibitor)) return 28;
  if (exhibitor?.booth) return 8;
  if (getResolvedHallNo(exhibitor) !== "00") return 2;
  return -20;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value) {
  let hash = 0;
  String(value || "").split("").forEach((char) => {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  });
  return hash;
}

function boothMarkerPosition(exhibitor, index = 0) {
  const { hallNo, area, number } = parseBoothCode(exhibitor);
  const bounds = (hallZoneBounds[hallNo] && hallZoneBounds[hallNo][area]) || genericZoneBounds[area];
  const seed = hashString(`${exhibitor?.id || ""}${exhibitor?.booth || ""}${index}`);

  if (!bounds) {
    return {
      x: 12 + (seed % 76),
      y: 12 + ((Math.floor(seed / 7) + index * 11) % 76),
    };
  }

  const max = bounds.max || 24;
  const normalized = number > 0 ? clamp((number - 1) / Math.max(max - 1, 1), 0, 1) : (seed % 100) / 100;
  const yProgress = bounds.direction === "up" ? 1 - normalized : normalized;
  const xJitter = (((seed % 9) - 4) / 4) * Math.min((bounds.x2 - bounds.x1) * 0.16, 5);
  const yJitter = ((((Math.floor(seed / 13) + index) % 7) - 3) / 3) * Math.min((bounds.y2 - bounds.y1) * 0.06, 3);
  const x = bounds.x1 + (bounds.x2 - bounds.x1) * (0.24 + ((seed % 37) / 36) * 0.52) + xJitter;
  const y = bounds.y1 + (bounds.y2 - bounds.y1) * yProgress + yJitter;

  return {
    x: clamp(x, 5, 95),
    y: clamp(y, 5, 95),
  };
}

function tokenize(query) {
  const normalized = compactText(query).toLowerCase();
  const loose = normalized
    .split(/[\s,，。；;、/|]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);

  const aliasHits = Object.values(keywordAliases)
    .flat()
    .filter((word) => normalized.includes(String(word).toLowerCase()));
  const latinTerms = normalized.match(/[a-z0-9]{2,}/g) || [];

  return unique([normalized, ...loose, ...aliasHits, ...latinTerms].filter(Boolean));
}

function detectInterests(query) {
  const text = String(query || "").toLowerCase();
  const detected = [];
  interests.forEach((interest) => {
    const words = keywordAliases[interest.id] || interest.words;
    if (words.some((word) => text.includes(String(word).toLowerCase()))) {
      detected.push(interest.id);
    }
  });
  return detected;
}

function scoreExhibitor(exhibitor, query = "", activeInterests = []) {
  const terms = tokenize(query);
  let score = 0;
  const haystack = exhibitor.search || "";
  const name = `${exhibitor.name} ${exhibitor.shortName}`.toLowerCase();

  terms.forEach((term) => {
    if (term.length < 2) return;
    if (name.includes(term)) score += 70;
    if ((exhibitor.booth || "").toLowerCase().includes(term)) score += 50;
    if ((exhibitor.hallName || "").toLowerCase().includes(term)) score += 18;
    if (haystack.includes(term)) score += 16;
  });

  activeInterests.forEach((id) => {
    const words = keywordAliases[id] || [];
    words.forEach((word) => {
      const normalized = String(word).toLowerCase();
      if (exhibitor.tags?.some((tag) => tag.toLowerCase().includes(normalized))) score += 18;
      if (haystack.includes(normalized)) score += 4;
    });
  });

  if (exhibitor.booth) score += 2;
  if (exhibitor.intro) score += 1;
  return score;
}

function hallCenter(hallNo) {
  const item = hallLayout.find((hall) => hall.hallNo === hallNo);
  if (!item) return { x: 50, y: 50 };
  return { x: item.x + item.w / 2, y: item.y + item.h / 2 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildRoute(exhibitors, pinnedIds, activeInterests, query) {
  if (!exhibitors.length) return [];

  const pinned = exhibitors.filter((item) => pinnedIds.has(item.id));
  const forceAiHall = activeInterests.includes("ai") || /ai|人工智能|切磋|waytoagi|大模型|智能体/i.test(query);
  const aiHallPicks = forceAiHall
    ? exhibitors
        .filter((item) => getResolvedHallNo(item) === "11")
        .map((item) => ({
          item,
          score: scoreExhibitor(item, "AI 人工智能 AIGC 大模型 VR 数字 科技 文化贸易", ["ai", "trade"]) + mapReadinessScore(item),
        }))
        .filter(({ item }) => scoreExhibitor(item, "AI 人工智能 AIGC 大模型 VR 数字 科技 文化贸易", ["ai", "trade"]) > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ item }) => item)
    : [];
  const scored = exhibitors
    .map((item) => ({
      item,
      matchScore: scoreExhibitor(item, query, activeInterests),
      score: scoreExhibitor(item, query, activeInterests) + mapReadinessScore(item),
    }))
    .filter(({ item, matchScore }) => matchScore > 0 && getResolvedHallNo(item) !== "00")
    .sort((a, b) => b.score - a.score)
    .slice(0, 80)
    .map(({ item }) => item);

  const pool = unique([...pinned, ...aiHallPicks, ...scored].map((item) => item.id))
    .map((id) => exhibitors.find((item) => item.id === id))
    .filter(Boolean);

  if (!pool.length) return [];

  const grouped = pool.reduce((acc, item) => {
    const hallNo = getResolvedHallNo(item);
    if (!acc[hallNo]) acc[hallNo] = [];
    if (acc[hallNo].length < 4) acc[hallNo].push(item);
    return acc;
  }, {});

  let remaining = Object.keys(grouped).filter((hallNo) => hallNo !== "00");
  const route = [];
  let cursor = routeStart;

  if (remaining.includes("11")) {
    route.push("11");
    remaining = remaining.filter((hallNo) => hallNo !== "11");
    cursor = hallCenter("11");
  }

  while (remaining.length) {
    remaining.sort((a, b) => distance(cursor, hallCenter(a)) - distance(cursor, hallCenter(b)));
    const next = remaining.shift();
    route.push(next);
    cursor = hallCenter(next);
  }

  return route.map((hallNo, index) => ({
    hallNo,
    title: `${Number(hallNo)}号馆`,
    note: hallNotes[hallNo] || "按兴趣匹配到的展馆。",
    exhibitors: grouped[hallNo] || [],
    duration: index === 0 ? "25-35分钟" : "20-30分钟",
  }));
}

function getLogoUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${sourceBase}${path}`;
}

function formatExhibitorList(items) {
  return items
    .slice(0, 8)
    .map((item, index) => {
      const booth = item.booth ? ` ${item.booth}` : " 展位待查";
      const intro = item.intro ? `：${item.intro.slice(0, 42)}${item.intro.length > 42 ? "..." : ""}` : "";
      return `${index + 1}. ${item.name}｜${formatHallNumber(getResolvedHallNo(item))}号馆${booth}｜${item.industry}${intro}`;
    })
    .join("\n");
}

function formatRouteAdvice(routePlan) {
  if (!routePlan.length) return "路线建议：先从南登录大厅进入，优先到11号馆，再根据现场人流选择相邻展馆。";
  const stops = routePlan
    .slice(0, 6)
    .map((stop) => {
      const names = stop.exhibitors
        .slice(0, 2)
        .map((item) => item.shortName || item.name)
        .join("、");
      return `${stop.title}${names ? `（${names}）` : ""}`;
    })
    .join(" → ");
  return `路线建议：南登录大厅 / 国展站C1-C2 → ${stops}。每馆建议停留20-35分钟，地图已按展馆分布标出路线。`;
}

function makeAnswer(query, exhibitors, activeInterests, routePlan) {
  const text = compactText(query);
  const lower = text.toLowerCase();
  const detected = detectInterests(text);
  const mergedInterests = detected.length ? detected : activeInterests;
  const matched = exhibitors
    .map((item) => {
      const matchScore = scoreExhibitor(item, text, mergedInterests);
      return { item, matchScore, score: matchScore + mapReadinessScore(item) };
    })
    .filter(({ matchScore }) => matchScore > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ item }) => item);

  if (/交通|地铁|公交|出租|网约|停车|机场|高铁|怎么去|路线去|到达/.test(text)) {
    return {
      type: "transport",
      pinned: [],
      routePlan: [],
      text: `赴 ${eventInfo.aiZone}，优先坐地铁12/20号线到国展站 C1/C2，经南登录大厅去11号馆。公交可选615、M515、国际会展接驳专线1号；出租车/网约车建议按管控到南二区上下客；自驾社会车辆停地下车库。`,
    };
  }

  if (/时间|日期|几点|开馆|闭馆|地址|地点/.test(text)) {
    return {
      type: "event",
      pinned: [],
      routePlan: [],
      text: `${eventInfo.title}在${eventInfo.venue}举办，时间为${eventInfo.dates}。开馆：${eventInfo.hours.join("；")}。地址：${eventInfo.address}。`,
    };
  }

  if (/规划|路线|怎么逛|推荐路线|帮我逛|逛展/.test(text)) {
    const labels = mergedInterests
      .map((id) => interests.find((item) => item.id === id)?.label)
      .filter(Boolean)
      .join("、");
    const routeForAnswer = matched.length ? buildRoute(exhibitors, new Set(matched.map((item) => item.id)), mergedInterests, text) : routePlan;
    return {
      type: "route",
      pinned: routeForAnswer.flatMap((stop) => stop.exhibitors),
      routePlan: routeForAnswer,
      text: `按${labels || "当前兴趣"}生成路线。\n\n展商列表：\n${formatExhibitorList(matched.length ? matched : routeForAnswer.flatMap((stop) => stop.exhibitors))}\n\n${formatRouteAdvice(routeForAnswer)}`,
    };
  }

  if (/ai|人工智能|切磋|waytoagi|11号馆|11馆/i.test(lower)) {
    const aiMatches = exhibitors
      .map((item) => {
        const matchScore = scoreExhibitor(item, "AI 人工智能 大模型 机器人 VR 元宇宙 数字", ["ai"]);
        return { item, matchScore, score: matchScore + mapReadinessScore(item) };
      })
      .filter(({ item, matchScore }) => matchScore > 0 && ["11", "15", "16"].includes(getResolvedHallNo(item)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ item }) => item);
    return {
      type: "ai",
      pinned: aiMatches,
      routePlan: buildRoute(exhibitors, new Set(aiMatches.map((item) => item.id)), ["ai"], text),
      text: `全球AI切磋盛典在11号馆，5天主题依次是：${eventInfo.aiSummit.join("；")}。\n\n展商列表：\n${formatExhibitorList(aiMatches)}\n\n${formatRouteAdvice(buildRoute(exhibitors, new Set(aiMatches.map((item) => item.id)), ["ai"], text))}`,
    };
  }

  if (matched.length) {
    const matchedRoute = buildRoute(exhibitors, new Set(matched.map((item) => item.id)), mergedInterests, text);
    return {
      type: "match",
      pinned: matchedRoute.length ? matchedRoute.flatMap((stop) => stop.exhibitors) : matched,
      routePlan: matchedRoute,
      text: `为你筛出 ${matched.length} 个相关展商。\n\n展商列表：\n${formatExhibitorList(matched)}\n\n${formatRouteAdvice(matchedRoute)}`,
    };
  }

  return {
    type: "fallback",
    pinned: [],
    routePlan: [],
    text: "我可以按公司名、展馆、行业或兴趣检索展商，也可以回答时间、交通、AI切磋盛典和路线规划。你可以试试“推荐AI文旅路线”或“华为在哪个馆”。",
  };
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function IconButton({ children, title, onClick, active = false }) {
  return (
    <button className={`icon-button ${active ? "is-active" : ""}`} type="button" title={title} onClick={onClick}>
      {children}
    </button>
  );
}

function payloadExhibitor(item) {
  return {
    id: item.id,
    name: item.name,
    shortName: item.shortName,
    hallNo: getResolvedHallNo(item),
    hallName: item.hallName,
    booth: item.booth,
    industry: item.industry,
    tags: item.tags,
    intro: item.intro,
  };
}

function payloadRouteStop(stop) {
  return {
    hallNo: stop.hallNo,
    title: stop.title,
    note: stop.note,
    duration: stop.duration,
    exhibitors: stop.exhibitors.map(payloadExhibitor),
  };
}

function renderInlineMarkdown(text) {
  const segments = String(text || "").split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return segments.map((segment, index) => {
    if (/^\*\*[^*]+\*\*$/.test(segment)) return <strong key={index}>{segment.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(segment)) return <code key={index}>{segment.slice(1, -1)}</code>;
    const link = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={index}>{segment}</React.Fragment>;
  });
}

function MarkdownText({ text }) {
  const lines = String(text || "").split(/\r?\n/);
  const blocks = [];
  let list = null;

  function flushList() {
    if (!list) return;
    const Tag = list.type;
    blocks.push(
      <Tag key={`list-${blocks.length}`}>
        {list.items.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      const Tag = `h${Math.min(heading[1].length + 2, 5)}`;
      blocks.push(<Tag key={`heading-${blocks.length}`}>{renderInlineMarkdown(heading[2])}</Tag>);
      return;
    }

    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ordered[1]);
      return;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(unordered[1]);
      return;
    }

    flushList();
    blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInlineMarkdown(trimmed)}</p>);
  });

  flushList();
  return <div className="markdown-body">{blocks}</div>;
}

function HallPlanMap({ hallNo, exhibitors = [], highlightedIds = new Set(), onMarkerClick, compact = false }) {
  const image = hallMapImages[hallNo];
  const markers = uniqueById(exhibitors)
    .filter((item) => getResolvedHallNo(item) === hallNo)
    .slice(0, compact ? 18 : 80)
    .map((item, index) => {
      const booth = parseBoothCode(item);
      const position = boothMarkerPosition(item, index);
      return {
        item,
        booth,
        index,
        ...position,
        highlighted: highlightedIds.has(item.id),
      };
    });
  const routeLine = markers
    .filter((marker) => marker.highlighted || compact)
    .map((marker) => `${marker.x},${marker.y}`)
    .join(" ");

  return (
    <div className={`hall-plan-map ${compact ? "is-compact" : ""}`} data-hall={hallNo}>
      <div className="hall-plan-stage">
        {image ? (
          <img className="hall-plan-image" src={image} alt={`${formatHallNumber(hallNo)}号馆展区位置图`} loading={compact ? "lazy" : "eager"} />
        ) : (
          <div className="hall-plan-missing">未找到 {formatHallNumber(hallNo)} 号馆位置图</div>
        )}
        {routeLine && markers.length > 1 && (
          <svg className="hall-plan-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={routeLine} />
          </svg>
        )}
        {markers.map((marker) => (
          <button
            key={marker.item.id}
            className={`hall-map-marker ${marker.highlighted ? "is-highlighted" : ""}`}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            type="button"
            title={`${marker.item.name}｜${marker.booth.label}`}
            onClick={() => onMarkerClick?.(marker.item)}
          >
            <span>{marker.index + 1}</span>
            <em>{marker.booth.area || "?"}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function InlineRouteMap({ routePlan = [], exhibitors = [], onHallSelect, onExhibitorSelect }) {
  const initialHall = routePlan[0]?.hallNo || "";
  const [activeHall, setActiveHall] = useState(initialHall);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    if (initialHall) setActiveHall(initialHall);
  }, [initialHall]);

  useEffect(() => {
    if (!fullScreen) return undefined;
    document.body.classList.add("has-route-fullscreen");
    return () => document.body.classList.remove("has-route-fullscreen");
  }, [fullScreen]);

  if (!routePlan.length) return null;

  const targetIds = new Set(exhibitors.map((item) => item.id));
  const currentHall = activeHall || routePlan[0]?.hallNo;
  const activeStop = routePlan.find((stop) => stop.hallNo === currentHall) || routePlan[0];
  const activeExhibitors = activeStop?.exhibitors || [];
  const stopTabs = routePlan.slice(0, 6).map((stop, index) => (
    <button
      key={stop.hallNo}
      className={stop.hallNo === currentHall ? "is-active" : ""}
      type="button"
      onClick={() => {
        setActiveHall(stop.hallNo);
        if (fullScreen) onHallSelect?.(stop.hallNo);
      }}
    >
      <span>{index + 1}</span>
      <strong>{stop.title}</strong>
      <em>{stop.exhibitors.length}家</em>
    </button>
  ));

  return (
    <div className="inline-route-card">
      <div className="inline-route-head">
        <strong>场馆路线图</strong>
        <span>{exhibitors.length} 个目标商家 · {routePlan.length} 个展馆</span>
        <button className="route-expand-button" type="button" onClick={() => setFullScreen(true)}>
          <Maximize2 size={15} />
          全屏
        </button>
      </div>
      <div className="inline-route-stops">{stopTabs}</div>
      <div className="inline-hall-map-card" aria-label={`${activeStop?.title || ""} 对话内场馆图`}>
        <div className="inline-hall-map-head">
          <strong>{activeStop?.title}</strong>
          <span>{activeStop?.note}</span>
        </div>
        <HallPlanMap
          hallNo={activeStop?.hallNo}
          exhibitors={activeExhibitors}
          highlightedIds={targetIds}
          onMarkerClick={onExhibitorSelect}
          compact
        />
      </div>
      <div className="inline-target-list">
        {exhibitors.slice(0, 8).map((item) => (
          <button key={item.id} type="button" onClick={() => onExhibitorSelect?.(item)}>
            <strong>{item.shortName || item.name}</strong>
            <span>
              {formatHallNumber(getResolvedHallNo(item))}号馆 {item.booth || "展位待查"}
            </span>
          </button>
        ))}
      </div>
      {fullScreen && (
        <div className="route-fullscreen" role="dialog" aria-modal="true" aria-label="全屏路线图">
          <div className="route-fullscreen-header">
            <div>
              <strong>{activeStop?.title || "路线图"}</strong>
              <span>{exhibitors.length} 个目标商家 · 点击展馆切换路线段</span>
            </div>
            <button type="button" onClick={() => setFullScreen(false)} title="关闭全屏路线图">
              <X size={20} />
            </button>
          </div>
          <div className="route-fullscreen-stops">{stopTabs}</div>
          <div className="route-fullscreen-map">
            <HallPlanMap hallNo={activeStop?.hallNo} exhibitors={activeExhibitors} highlightedIds={targetIds} onMarkerClick={onExhibitorSelect} />
          </div>
          <div className="route-fullscreen-targets">
            {exhibitors.slice(0, 8).map((item) => (
              <button key={item.id} type="button" onClick={() => onExhibitorSelect?.(item)}>
                <strong>{item.shortName || item.name}</strong>
                <span>
                  {formatHallNumber(getResolvedHallNo(item))}号馆 {item.booth || "展位待查"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentMessage({ message, index, onHallSelect, onExhibitorSelect }) {
  const hasRoute = message.role === "agent" && !message.pending && message.routePlan?.length;

  return (
    <div className={`message ${message.role} ${message.pending ? "is-pending" : ""} ${hasRoute ? "has-route" : ""}`} key={message.id || `${message.role}-${index}`}>
      {message.role === "agent" && !message.pending && hasRoute ? (
        <>
          <InlineRouteMap
            routePlan={message.routePlan}
            exhibitors={message.exhibitors}
            onHallSelect={onHallSelect}
            onExhibitorSelect={onExhibitorSelect}
          />
          <details className="message-details">
            <summary>
              <ChevronDown size={15} />
              查看文字结果
            </summary>
            <MarkdownText text={message.text} />
          </details>
        </>
      ) : (
        <div className="message-text">
          {message.role === "agent" && !message.pending ? <MarkdownText text={message.text} /> : message.text}
        </div>
      )}
    </div>
  );
}

function AgentPanelContent({
  agentStatus,
  chatInput,
  chatEndRef,
  className = "",
  messages,
  onClose,
  onExhibitorSelect,
  onHallSelect,
  setChatInput,
  submitChat,
}) {
  return (
    <aside className={`agent-panel ${className}`.trim()} aria-label="文博会对话助手">
      <div className="agent-header">
        <MessageCircle size={20} />
        <div>
          <strong>文博会 Agent</strong>
          <span>{agentStatus} · 商家列表 · 路线规划</span>
        </div>
        {onClose && (
          <button className="agent-close" type="button" title="收起对话助手" onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>
      <div className="prompt-row">
        {starterPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => submitChat(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="message-list">
        {messages.map((message, index) => (
          <AgentMessage
            key={message.id || `${message.role}-${index}`}
            message={message}
            index={index}
            onHallSelect={onHallSelect}
            onExhibitorSelect={onExhibitorSelect}
          />
        ))}
        <div ref={chatEndRef} />
      </div>
      <form
        className="chat-box"
        onSubmit={(event) => {
          event.preventDefault();
          submitChat();
        }}
      >
        <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="问：想看AI文旅产品、推荐路线..." />
        <button type="submit" title="发送">
          <Send size={18} />
        </button>
      </form>
    </aside>
  );
}

export default function App() {
  const [exhibitors, setExhibitors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [routeQuery, setRouteQuery] = useState("");
  const [selectedHall, setSelectedHall] = useState("11");
  const [selectedInterests, setSelectedInterests] = useState(["ai", "tourism"]);
  const [pinnedIds, setPinnedIds] = useState(new Set());
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState("guide");
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState("导览助手已就绪");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "我是本地展商与路线 Agent。可以按兴趣标出展商、解释交通、回答某家公司在哪个馆，并生成逛展路线。",
    },
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetch("/data/exhibitors.json"), fetch("/data/summary.json")])
      .then(async ([exhibitorRes, summaryRes]) => {
        const [exhibitorData, summaryData] = await Promise.all([exhibitorRes.json(), summaryRes.json()]);
        if (!mounted) return;
        setExhibitors(exhibitorData);
        setSummary(summaryData);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const hallStats = useMemo(() => {
    const names = (summary?.halls || []).reduce((acc, hall) => {
      acc[hall.hallNo] = hall.name;
      return acc;
    }, {});
    const counts = exhibitors.reduce((acc, item) => {
      const hallNo = getResolvedHallNo(item);
      if (!acc[hallNo]) acc[hallNo] = { hallNo, number: String(Number(hallNo)), name: names[hallNo] || item.hallName, count: 0 };
      acc[hallNo].count += 1;
      return acc;
    }, {});
    return Object.values(counts);
  }, [summary, exhibitors]);

  const filtered = useMemo(() => {
    const hasSearch = query.trim().length > 0;
    return exhibitors
      .map((item) => ({
        item,
        queryScore: hasSearch ? scoreExhibitor(item, query, []) : 0,
        interestScore: scoreExhibitor(item, "", selectedInterests),
      }))
      .map(({ item, queryScore, interestScore }) => ({
        item,
        score: queryScore * 10 + interestScore + (pinnedIds.has(item.id) ? 150 : 0),
        queryScore,
        interestScore,
      }))
      .filter(({ item, queryScore, interestScore }) => {
        if (!hasSearch && selectedHall && getResolvedHallNo(item) !== selectedHall) return false;
        if (pinnedIds.has(item.id)) return true;
        if (hasSearch) return queryScore > 0;
        if (selectedInterests.length === 0) return true;
        return interestScore > 2;
      })
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [exhibitors, query, selectedHall, selectedInterests, pinnedIds]);

  const routePlan = useMemo(
    () => buildRoute(exhibitors, pinnedIds, selectedInterests, routeQuery || query),
    [exhibitors, pinnedIds, selectedInterests, routeQuery, query],
  );

  const visibleExhibitors = filtered.slice(0, 72);
  const selectedHallStat = hallStats.find((hall) => hall.hallNo === selectedHall);
  const highlightedIds = useMemo(
    () => new Set([...Array.from(pinnedIds), ...routePlan.flatMap((stop) => stop.exhibitors.map((item) => item.id))]),
    [pinnedIds, routePlan],
  );
  const selectedHallMapExhibitors = useMemo(() => {
    if (!selectedHall) return [];
    const routeItems = routePlan.flatMap((stop) => stop.exhibitors).filter((item) => getResolvedHallNo(item) === selectedHall);
    const visibleItems = visibleExhibitors.filter((item) => getResolvedHallNo(item) === selectedHall);
    return uniqueById([...routeItems, ...visibleItems]).slice(0, 80);
  }, [selectedHall, routePlan, visibleExhibitors]);

  function toggleInterest(id) {
    setSelectedInterests((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function pinExhibitor(exhibitor) {
    setPinnedIds((current) => {
      const next = new Set(current);
      if (next.has(exhibitor.id)) next.delete(exhibitor.id);
      else next.add(exhibitor.id);
      return next;
    });
  }

  function clearPins() {
    setPinnedIds(new Set());
  }

  function selectInlineHall(hallNo) {
    setSelectedHall(hallNo);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches && activeTab === "guide") return;
    document.querySelector(".venue-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectInlineExhibitor(exhibitor) {
    setSelectedHall(getResolvedHallNo(exhibitor));
    setPinnedIds((current) => {
      const next = new Set(current);
      next.add(exhibitor.id);
      return next;
    });
    setQuery(exhibitor.name);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches) {
      setActiveTab("info");
      window.setTimeout(() => document.querySelector(".exhibitor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } else {
      document.querySelector(".exhibitor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function submitChat(value = chatInput) {
    const clean = compactText(value);
    if (!clean) return;

    const detected = detectInterests(clean);
    const nextInterests = detected.length ? unique([...selectedInterests, ...detected]) : selectedInterests;
    if (detected.length) setSelectedInterests(nextInterests);
    setRouteQuery(clean);

    const temporaryRoute = buildRoute(exhibitors, pinnedIds, nextInterests, clean);
    const answer = makeAnswer(clean, exhibitors, nextInterests, temporaryRoute);
    if (!(typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches)) {
      setAgentOpen(true);
    }
    setAgentStatus("正在整理展商与路线建议");
    if (answer.pinned?.length) {
      setPinnedIds(new Set(answer.pinned.slice(0, 18).map((item) => item.id)));
      const firstHall = answer.pinned.map(getResolvedHallNo).find((hallNo) => hallNo !== "00");
      if (firstHall) setSelectedHall(firstHall);
    }
    const pendingId = `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMessages((current) => [
      ...current,
      { role: "user", text: clean },
      { id: pendingId, role: "agent", text: "正在整理相关展商、场馆分布与逛展路线...", pending: true },
    ]);
    setChatInput("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          interests: nextInterests,
          candidates: answer.pinned?.slice(0, 18).map(payloadExhibitor) || [],
          routePlan: (answer.routePlan?.length ? answer.routePlan : temporaryRoute).map(payloadRouteStop),
          fallbackText: answer.text,
          eventInfo,
        }),
      });
      const result = await response.json();
      const finalText = result?.text || answer.text;
      setAgentStatus(result?.status === "deepseek" ? "已生成智能导览建议" : "已使用本地路线规划");
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
                routePlan: answer.routePlan || [],
                exhibitors: answer.pinned || [],
                text: result?.status === "deepseek" ? finalText : `${finalText}\n\n（在线服务暂时不可用，已使用本地路线规划结果。）`,
              }
            : message,
        ),
      );
    } catch {
      setAgentStatus("已使用本地路线规划");
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
                routePlan: answer.routePlan || [],
                exhibitors: answer.pinned || [],
                text: `${answer.text}\n\n（在线服务暂时不可用，已使用本地路线规划结果。）`,
              }
            : message,
        ),
      );
    }
  }

  return (
    <main className="app-shell">
      <section className={`guide-screen ${activeTab === "guide" ? "is-active" : ""}`}>
        <AgentPanelContent
          agentStatus={agentStatus}
          chatInput={chatInput}
          chatEndRef={chatEndRef}
          className="guide-agent-panel"
          messages={messages}
          onExhibitorSelect={selectInlineExhibitor}
          onHallSelect={selectInlineHall}
          setChatInput={setChatInput}
          submitChat={submitChat}
        />
      </section>

      <section className={`info-screen ${activeTab === "info" ? "is-active" : ""}`}>
        <section className="hero">
        <div className="ribbon ribbon-one" />
        <div className="ribbon ribbon-two" />
        <div className="hero-top">
          <div className="brand-mark">
            <span className="brand-icon">ICIF</span>
            <span className="brand-divider" />
            <span className="brand-copy">
              <strong>{eventInfo.title}</strong>
              <em>{eventInfo.enTitle}</em>
            </span>
          </div>
          <div className="hero-actions">
            <IconButton title="显示交通指引图" onClick={() => setShowGuide((value) => !value)} active={showGuide}>
              <Layers size={18} />
            </IconButton>
            <IconButton title="清除已标出展商" onClick={clearPins} active={pinnedIds.size > 0}>
              <X size={18} />
            </IconButton>
          </div>
        </div>
        <div className="hero-copy">
          <p>{eventInfo.theme}</p>
          <h1>文博会展商地图与路线 Agent</h1>
          <div className="hero-meta">
            <span>
              <MapPin size={16} />
              {eventInfo.venue}
            </span>
            <span>
              <Sparkles size={16} />
              {eventInfo.aiZone}
            </span>
          </div>
        </div>
      </section>

      <section className="dashboard">
        <aside className="control-panel">
          <div className="panel-section compact">
            <div className="section-title">
              <Filter size={18} />
              <span>检索与兴趣</span>
            </div>
            <label className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜公司、展位、AI、非遗、文旅..." />
            </label>
            <div className="chip-grid">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  className={`chip ${selectedInterests.includes(interest.id) ? "is-selected" : ""}`}
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                >
                  {interest.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section stats-grid">
            <Stat label="收录展商" value={loading ? "..." : numberFormatter.format(summary?.totalExhibitors || exhibitors.length)} />
            <Stat label="标注展位" value={loading ? "..." : numberFormatter.format(summary?.boothCount || 0)} />
            <Stat label="主题展馆" value="8" />
            <Stat label="已标出" value={numberFormatter.format(pinnedIds.size)} />
          </div>

          <div className="panel-section">
            <div className="section-title">
              <Route size={18} />
              <span>推荐路线</span>
            </div>
            {routeQuery && <p className="route-context">依据：{routeQuery}</p>}
            <div className="route-start">
              <LocateFixed size={18} />
              <div>
                <strong>起点：国展站 C1/C2</strong>
                <span>经南登录大厅，先抵达 11 号馆更顺。</span>
              </div>
            </div>
            <div className="route-list">
              {routePlan.slice(0, 6).map((stop, index) => (
                <article className="route-stop" key={stop.hallNo}>
                  <div className="stop-index">{index + 1}</div>
                  <div>
                    <strong>{stop.title}</strong>
                    <p>{stop.note}</p>
                    <span>{stop.duration}</span>
                    {stop.exhibitors.slice(0, 2).map((item) => (
                      <button
                        className="route-exhibitor"
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedHall(getResolvedHallNo(item));
                          pinExhibitor(item);
                        }}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {!routePlan.length && <p className="empty-text">选择兴趣或在 Agent 中输入需求后生成路线。</p>}
            </div>
          </div>

          <div className="panel-section source-panel">
            <div className="section-title">
              <Building2 size={18} />
              <span>数据来源</span>
            </div>
            {sourceLinks.map((source) =>
              source.url ? (
                <a key={source.label} href={source.url} target="_blank" rel="noreferrer">
                  <strong>{source.label}</strong>
                  <span>{source.note}</span>
                </a>
              ) : (
                <div key={source.label}>
                  <strong>{source.label}</strong>
                  <span>{source.note}</span>
                </div>
              ),
            )}
          </div>
        </aside>

        <section className="map-and-list">
          <div className="venue-board">
            <div className="board-header">
              <div>
                <span className="eyebrow">9-16号馆总览 / 点击查看场馆图</span>
                <h2>{selectedHall ? `${Number(selectedHall)}号馆 · ${selectedHallStat?.name || ""}` : "全部展馆"}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSelectedHall("11")}>
                回到11号馆
              </button>
            </div>

            <div className="map-canvas">
              {hallLayout.map((hall) => {
                const stat = hallStats.find((item) => item.hallNo === hall.hallNo);
                const isSelected = selectedHall === hall.hallNo;
                const isRouted = routePlan.some((stop) => stop.hallNo === hall.hallNo);
                const pinnedCount = exhibitors.filter((item) => getResolvedHallNo(item) === hall.hallNo && highlightedIds.has(item.id)).length;
                return (
                  <button
                    key={hall.hallNo}
                    className={`hall-tile ${isSelected ? "is-selected" : ""} ${isRouted ? "is-routed" : ""} ${hall.hallNo === "11" ? "is-ai-zone" : ""}`}
                    style={{ left: `${hall.x}%`, top: `${hall.y}%`, width: `${hall.w}%`, height: `${hall.h}%` }}
                    type="button"
                    onClick={() => setSelectedHall(hall.hallNo)}
                  >
                    <span className="hall-number">{Number(hall.hallNo)}</span>
                    <strong>{stat?.name}</strong>
                    <em>{numberFormatter.format(stat?.count || 0)} 家</em>
                    {pinnedCount > 0 && <span className="pin-badge">{pinnedCount}</span>}
                  </button>
                );
              })}
            </div>

            {selectedHall && (
              <section className="hall-detail-card">
                <div className="hall-detail-header">
                  <div>
                    <span className="eyebrow">场馆展区位置图</span>
                    <h3>
                      {formatHallNumber(selectedHall)}号馆 · {selectedHallStat?.name || "展区位置"}
                    </h3>
                  </div>
                  <span>{selectedHallMapExhibitors.length} 个当前结果 / 路线目标已标注</span>
                </div>
                <HallPlanMap
                  hallNo={selectedHall}
                  exhibitors={selectedHallMapExhibitors}
                  highlightedIds={highlightedIds}
                  onMarkerClick={(item) => {
                    setPinnedIds((current) => new Set([...Array.from(current), item.id]));
                    setQuery(item.name);
                    document.querySelector(".exhibitor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                />
                <div className="hall-detail-legend">
                  <span>
                    <i className="legend-dot is-target" /> Agent / 路线目标
                  </span>
                  <span>
                    <i className="legend-dot" /> 当前筛选展商
                  </span>
                </div>
              </section>
            )}

            {showGuide && (
              <div className="guide-strip">
                <figure>
                  <img src="/assets/guide-layout.png" alt="本地PDF抽取的展馆与11号馆布局图" />
                  <figcaption>本地 PDF：展馆 / 11号馆 / AI展区布局页</figcaption>
                </figure>
                <figure>
                  <img src="/assets/guide-traffic.png" alt="本地PDF抽取的交通指引页" />
                  <figcaption>本地 PDF：免费乘车与南二区上下客说明</figcaption>
                </figure>
              </div>
            )}
          </div>

          <div className="transport-bar">
            <div>
              <Train size={18} />
              <span>12/20号线 国展站 C1/C2</span>
            </div>
            <div>
              <Bus size={18} />
              <span>615 / M515 / 接驳专线1号</span>
            </div>
            <div>
              <Car size={18} />
              <span>南二区上下客，地下车库停车</span>
            </div>
            <div>
              <Plane size={18} />
              <span>宝安机场约25分钟车程</span>
            </div>
          </div>

          <section className="exhibitor-panel">
            <div className="board-header">
              <div>
                <span className="eyebrow">展商收录</span>
                <h2>{numberFormatter.format(filtered.length)} 个匹配结果</h2>
              </div>
              <span className="result-note">当前显示前 {visibleExhibitors.length} 个</span>
            </div>
            <div className="exhibitor-grid">
              {visibleExhibitors.map((item) => (
                <article className={`exhibitor-card ${pinnedIds.has(item.id) ? "is-pinned" : ""}`} key={item.id}>
                  <div className="card-top">
                    <div className="logo-box" data-initial={item.name.slice(0, 1)}>
                      {item.logo ? (
                        <img
                          src={getLogoUrl(item.logo)}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.closest(".logo-box")?.classList.add("is-broken");
                            event.currentTarget.remove();
                          }}
                        />
                      ) : (
                        <span>{item.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <button
                      className={`pin-button ${pinnedIds.has(item.id) ? "is-on" : ""}`}
                      type="button"
                      title={pinnedIds.has(item.id) ? "取消标出" : "标出展商"}
                      onClick={() => pinExhibitor(item)}
                    >
                      <Star size={17} />
                    </button>
                  </div>
                  <h3>{item.shortName || item.name}</h3>
                  {item.shortName && <p className="full-name">{item.name}</p>}
                  <div className="meta-row">
                    <span>{formatHallNumber(getResolvedHallNo(item))}号馆</span>
                    <span>{item.booth || "展位待查"}</span>
                    <span>{item.industry}</span>
                  </div>
                  <p className="intro">{item.intro || "暂无展商简介，建议现场按展位进一步确认。"}</p>
                  <div className="tag-row">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                    {item.vr && (
                      <a href={item.vr} target="_blank" rel="noreferrer">
                        VR
                      </a>
                    )}
                  </div>
                </article>
              ))}
              {!visibleExhibitors.length && <div className="empty-large">没有匹配结果。试试取消展馆筛选或减少关键词。</div>}
            </div>
          </section>
        </section>
      </section>
      </section>

      <div className="desktop-agent-layer">
        {!agentOpen && (
          <button className="agent-fab" type="button" title="打开文博会 Agent" onClick={() => setAgentOpen(true)}>
            <MessageCircle size={24} />
            <span>问</span>
            {pinnedIds.size > 0 && <em>{pinnedIds.size}</em>}
          </button>
        )}

        {agentOpen && (
          <AgentPanelContent
            agentStatus={agentStatus}
            chatInput={chatInput}
            chatEndRef={chatEndRef}
            messages={messages}
            onClose={() => setAgentOpen(false)}
            onExhibitorSelect={selectInlineExhibitor}
            onHallSelect={selectInlineHall}
            setChatInput={setChatInput}
            submitChat={submitChat}
          />
        )}
      </div>

      <nav className="mobile-bottom-tabs" aria-label="底部导航">
        <button className={activeTab === "guide" ? "is-active" : ""} type="button" onClick={() => setActiveTab("guide")}>
          <MessageCircle size={19} />
          <span>智能导览</span>
        </button>
        <button className={activeTab === "info" ? "is-active" : ""} type="button" onClick={() => setActiveTab("info")}>
          <Info size={19} />
          <span>信息</span>
        </button>
      </nav>
    </main>
  );
}
