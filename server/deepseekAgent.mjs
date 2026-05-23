const DEFAULT_MODEL = "deepseek-v4-pro";
const DEFAULT_BASE_URL = "https://api.deepseek.com";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  return JSON.parse(text);
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeExhibitor(item) {
  return {
    id: item.id,
    name: compact(item.name),
    shortName: compact(item.shortName),
    hallNo: item.hallNo,
    hallName: compact(item.hallName),
    booth: compact(item.booth) || "展位待查",
    industry: compact(item.industry),
    tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : [],
    intro: compact(item.intro).slice(0, 180),
  };
}

function safeRouteStop(stop) {
  return {
    hallNo: stop.hallNo,
    title: stop.title,
    note: compact(stop.note),
    duration: stop.duration,
    exhibitors: Array.isArray(stop.exhibitors) ? stop.exhibitors.slice(0, 4).map(safeExhibitor) : [],
  };
}

function buildMessages(payload) {
  const event = payload.eventInfo || {};
  const candidates = Array.isArray(payload.candidates) ? payload.candidates.slice(0, 18).map(safeExhibitor) : [];
  const routePlan = Array.isArray(payload.routePlan) ? payload.routePlan.slice(0, 8).map(safeRouteStop) : [];
  const fallbackText = compact(payload.fallbackText).slice(0, 1800);
  const interests = Array.isArray(payload.interests) ? payload.interests.slice(0, 8) : [];

  return [
    {
      role: "system",
      content:
        "你是2026深圳文博会游客路线规划 Agent。必须只基于用户请求和提供的展商/路线/交通数据作答，不编造展位、展馆或公司。输出中文，简洁但可执行。若用户问交通，优先给到达路线；若用户问产品/兴趣/公司，必须包含“展商列表：”和“路线建议：”两个小节。展商列表要列出展商名、馆号、展位和推荐理由；路线建议要按展馆分布排序，从南登录大厅/国展站C1-C2出发。不要提到你看不到的数据。",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          userRequest: compact(payload.message),
          selectedInterests: interests,
          event: {
            title: event.title,
            dates: event.dates,
            venue: event.venue,
            aiZone: event.aiZone,
            address: event.address,
            hours: event.hours,
            transport: event.transport,
            aiSummit: event.aiSummit,
          },
          candidateExhibitors: candidates,
          routePlan,
          deterministicDraft: fallbackText,
          requiredOutput:
            "如非纯交通/时间问题，请输出：1）展商列表：编号列表；2）路线建议：按馆号/动线说明；3）一句现场提醒。",
        },
        null,
        2,
      ),
    },
  ];
}

export async function callDeepSeekAgent(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: "missing_key",
      text: payload.fallbackText || "DeepSeek API key 未配置，已使用本地路线规划结果。",
      model: null,
    };
  }

  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(payload),
      temperature: 0.2,
      max_tokens: 1100,
      thinking: { type: "disabled" },
    }),
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error?.message || raw || `DeepSeek request failed with ${response.status}`;
    return {
      ok: false,
      status: "api_error",
      statusCode: response.status,
      text: payload.fallbackText || "DeepSeek 暂时不可用，已使用本地路线规划结果。",
      model,
      error: message.slice(0, 500),
    };
  }

  const text = compact(data?.choices?.[0]?.message?.content);
  return {
    ok: Boolean(text),
    status: text ? "deepseek" : "empty_response",
    text: text || payload.fallbackText || "DeepSeek 未返回内容，已使用本地路线规划结果。",
    model: data?.model || model,
    usage: data?.usage || null,
  };
}

export async function handleAgentRequest(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readJson(req);
    if (!compact(payload.message)) {
      sendJson(res, 400, { ok: false, error: "Missing message" });
      return;
    }

    const result = await callDeepSeekAgent(payload);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      status: "server_error",
      text: "Agent 服务暂时不可用，请稍后重试。",
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
  }
}
