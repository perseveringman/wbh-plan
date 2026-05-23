import {
  Building2,
  Bus,
  Car,
  Filter,
  Layers,
  LocateFixed,
  MapPin,
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

const numberFormatter = new Intl.NumberFormat("zh-CN");
const routeStart = { x: 61, y: 47, label: "南登录大厅 / 国展站C1-C2" };
const sourceBase = "https://www.cnicif.com";

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

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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
        .filter((item) => item.hallNo === "11")
        .map((item) => ({
          item,
          score: scoreExhibitor(item, "AI 人工智能 AIGC 大模型 VR 数字 科技 文化贸易", ["ai", "trade"]),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ item }) => item)
    : [];
  const scored = exhibitors
    .map((item) => ({
      item,
      score: scoreExhibitor(item, query, activeInterests),
    }))
    .filter(({ item, score }) => score > 0 && item.hallNo !== "00")
    .sort((a, b) => b.score - a.score)
    .slice(0, 80)
    .map(({ item }) => item);

  const pool = unique([...pinned, ...aiHallPicks, ...scored].map((item) => item.id))
    .map((id) => exhibitors.find((item) => item.id === id))
    .filter(Boolean);

  if (!pool.length) return [];

  const grouped = pool.reduce((acc, item) => {
    if (!acc[item.hallNo]) acc[item.hallNo] = [];
    if (acc[item.hallNo].length < 4) acc[item.hallNo].push(item);
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
      return `${index + 1}. ${item.name}｜${Number(item.hallNo) || "未标注"}号馆${booth}｜${item.industry}${intro}`;
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
    .map((item) => ({ item, score: scoreExhibitor(item, text, mergedInterests) }))
    .filter(({ score }) => score > 0)
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
      .map((item) => ({ item, score: scoreExhibitor(item, "AI 人工智能 大模型 机器人 VR 元宇宙 数字", ["ai"]) }))
      .filter(({ item, score }) => score > 0 && ["11", "15", "16"].includes(item.hallNo))
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
    hallNo: item.hallNo,
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

function InlineRouteMap({ routePlan = [], exhibitors = [], onHallSelect, onExhibitorSelect }) {
  if (!routePlan.length) return null;

  const routeSet = new Set(routePlan.map((stop) => stop.hallNo));
  const markedByHall = exhibitors.reduce((acc, item) => {
    if (!acc[item.hallNo]) acc[item.hallNo] = [];
    acc[item.hallNo].push(item);
    return acc;
  }, {});
  const miniPoints = [routeStart, ...routePlan.map((stop) => hallCenter(stop.hallNo))]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <div className="inline-route-card">
      <div className="inline-route-head">
        <strong>路线图</strong>
        <span>{exhibitors.length} 个目标商家 · {routePlan.length} 个展馆</span>
      </div>
      <div className="inline-map" aria-label="对话内路线图">
        <svg className="inline-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={miniPoints} />
        </svg>
        <div className="inline-entrance" style={{ left: `${routeStart.x}%`, top: `${routeStart.y}%` }}>
          起点
        </div>
        {hallLayout.map((hall) => {
          const items = markedByHall[hall.hallNo] || [];
          const routed = routeSet.has(hall.hallNo);
          return (
            <button
              key={hall.hallNo}
              className={`inline-hall ${routed ? "is-routed" : ""} ${items.length ? "has-targets" : ""}`}
              style={{ left: `${hall.x}%`, top: `${hall.y}%`, width: `${hall.w}%`, height: `${hall.h}%` }}
              type="button"
              onClick={() => onHallSelect?.(hall.hallNo)}
            >
              <span>{Number(hall.hallNo)}</span>
              {items.length > 0 && <em>{items.length}</em>}
            </button>
          );
        })}
      </div>
      <div className="inline-route-stops">
        {routePlan.slice(0, 6).map((stop, index) => (
          <button key={stop.hallNo} type="button" onClick={() => onHallSelect?.(stop.hallNo)}>
            <span>{index + 1}</span>
            <strong>{stop.title}</strong>
            <em>{stop.exhibitors.length}家</em>
          </button>
        ))}
      </div>
      <div className="inline-target-list">
        {exhibitors.slice(0, 8).map((item) => (
          <button key={item.id} type="button" onClick={() => onExhibitorSelect?.(item)}>
            <strong>{item.shortName || item.name}</strong>
            <span>
              {Number(item.hallNo) || "未标注"}号馆 {item.booth || "展位待查"}
            </span>
          </button>
        ))}
      </div>
    </div>
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
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState("DeepSeek V4");
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
    if (summary?.halls) return summary.halls;
    const counts = exhibitors.reduce((acc, item) => {
      if (!acc[item.hallNo]) acc[item.hallNo] = { hallNo: item.hallNo, number: String(Number(item.hallNo)), name: item.hallName, count: 0 };
      acc[item.hallNo].count += 1;
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
        if (!hasSearch && selectedHall && item.hallNo !== selectedHall) return false;
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

  const routePoints = useMemo(() => {
    const stops = routePlan.map((stop) => hallCenter(stop.hallNo));
    return [routeStart, ...stops].map((point) => `${point.x},${point.y}`).join(" ");
  }, [routePlan]);

  const visibleExhibitors = filtered.slice(0, 72);
  const selectedHallStat = hallStats.find((hall) => hall.hallNo === selectedHall);

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
    document.querySelector(".venue-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectInlineExhibitor(exhibitor) {
    setSelectedHall(exhibitor.hallNo);
    setPinnedIds((current) => {
      const next = new Set(current);
      next.add(exhibitor.id);
      return next;
    });
    setQuery(exhibitor.name);
    document.querySelector(".exhibitor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    setAgentOpen(true);
    setAgentStatus("DeepSeek V4 · 思考中");
    if (answer.pinned?.length) {
      setPinnedIds(new Set(answer.pinned.slice(0, 18).map((item) => item.id)));
      const firstHall = answer.pinned.find((item) => item.hallNo !== "00")?.hallNo;
      if (firstHall) setSelectedHall(firstHall);
    }
    const pendingId = `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMessages((current) => [
      ...current,
      { role: "user", text: clean },
      { id: pendingId, role: "agent", text: "正在调用 DeepSeek V4 生成展商列表和路线建议...", pending: true },
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
      setAgentStatus(result?.status === "deepseek" ? `${result.model || "DeepSeek V4"} · 已连接` : "本地备用 · DeepSeek 未连接");
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
                routePlan: answer.routePlan || [],
                exhibitors: answer.pinned || [],
                text: result?.status === "deepseek" ? finalText : `${finalText}\n\n（DeepSeek 暂时不可用，已使用本地路线规划结果。）`,
              }
            : message,
        ),
      );
    } catch {
      setAgentStatus("本地备用 · DeepSeek 未连接");
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
                routePlan: answer.routePlan || [],
                exhibitors: answer.pinned || [],
                text: `${answer.text}\n\n（DeepSeek 暂时不可用，已使用本地路线规划结果。）`,
              }
            : message,
        ),
      );
    }
  }

  return (
    <main className="app-shell">
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
                      <button className="route-exhibitor" key={item.id} type="button" onClick={() => pinExhibitor(item)}>
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
                <span className="eyebrow">9-16号馆示意地图</span>
                <h2>{selectedHall ? `${Number(selectedHall)}号馆 · ${selectedHallStat?.name || ""}` : "全部展馆"}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSelectedHall(selectedHall ? "" : "11")}>
                {selectedHall ? "查看全部" : "回到11号馆"}
              </button>
            </div>

            <div className="map-canvas">
              <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={routePoints} />
              </svg>
              <div className="entrance-marker" style={{ left: `${routeStart.x}%`, top: `${routeStart.y}%` }}>
                <Train size={16} />
                <span>南登录大厅</span>
              </div>
              {hallLayout.map((hall) => {
                const stat = hallStats.find((item) => item.hallNo === hall.hallNo);
                const isSelected = selectedHall === hall.hallNo;
                const isRouted = routePlan.some((stop) => stop.hallNo === hall.hallNo);
                const pinnedCount = exhibitors.filter((item) => item.hallNo === hall.hallNo && pinnedIds.has(item.id)).length;
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
                    <span>{Number(item.hallNo) || "未标注"}号馆</span>
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

      {!agentOpen && (
        <button className="agent-fab" type="button" title="打开文博会 Agent" onClick={() => setAgentOpen(true)}>
          <MessageCircle size={24} />
          <span>问</span>
          {pinnedIds.size > 0 && <em>{pinnedIds.size}</em>}
        </button>
      )}

      {agentOpen && (
        <aside className="agent-panel" aria-label="文博会对话助手">
          <div className="agent-header">
            <MessageCircle size={20} />
            <div>
              <strong>文博会 Agent</strong>
              <span>{agentStatus} · 商家列表 · 路线规划</span>
            </div>
            <button className="agent-close" type="button" title="收起对话助手" onClick={() => setAgentOpen(false)}>
              <X size={18} />
            </button>
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
              <div className={`message ${message.role} ${message.pending ? "is-pending" : ""}`} key={message.id || `${message.role}-${index}`}>
                <div className="message-text">{message.text}</div>
                {message.role === "agent" && !message.pending && (
                  <InlineRouteMap
                    routePlan={message.routePlan}
                    exhibitors={message.exhibitors}
                    onHallSelect={selectInlineHall}
                    onExhibitorSelect={selectInlineExhibitor}
                  />
                )}
              </div>
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
      )}
    </main>
  );
}
