import { chromium } from "playwright-core";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5175/";
const chromePath =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function innerText(page) {
  return page.locator("body").innerText();
}

async function expectText(page, text, label = text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 30000 });
  assert((await innerText(page)).includes(text), `Missing text: ${label}`);
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badLocalResponses = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.startsWith("Failed to load resource:")) {
      consoleErrors.push(text);
    }
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!/\/module\/img\//.test(url)) failedRequests.push(`${request.failure()?.errorText || "failed"} ${url}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (url.startsWith(baseUrl) && response.status() >= 400) {
      badLocalResponses.push(`${response.status()} ${url}`);
    }
  });

  await page.goto(baseUrl, { waitUntil: "load" });
  await expectText(page, "文博会展商地图与路线 Agent");
  await expectText(page, "7,779", "展商统计");
  await expectText(page, "9-16号馆总览");
  assert(await page.locator(".agent-fab").isVisible(), "Agent should start collapsed as a floating button");
  assert(await page.locator(".desktop-agent-layer .agent-panel").count() === 0, "Desktop agent panel should not be open by default");
  assert(await page.locator(".hall-tile").count() === 8, "Expected 8 hall tiles");
  assert(await page.locator(".hall-detail-card .hall-plan-image").isVisible(), "Selected hall detail map should be visible");
  assert(await page.locator(".hall-detail-card .hall-map-marker").count() > 0, "Selected hall detail map should render exhibitor markers");
  assert(await page.locator(".exhibitor-card").count() === 72, "Expected initial 72 exhibitor cards");
  assert((await page.locator(".route-stop strong").first().innerText()).includes("11号馆"), "Default route should start at 11号馆");

  await page.getByPlaceholder("搜公司、展位、AI、非遗、文旅...").fill("深圳报业");
  await page.waitForTimeout(300);
  await expectText(page, "深圳报业集团");
  const searchTitle = await page.locator(".exhibitor-panel .board-header h2").innerText();
  assert(!searchTitle.includes("276"), "Search results should not be diluted by interest filters");

  await page.getByPlaceholder("搜公司、展位、AI、非遗、文旅...").fill("");
  await page.locator(".hall-tile").filter({ hasText: "16" }).click();
  await expectText(page, "16号馆 · 文化科技馆");
  assert(await page.locator('.hall-plan-map[data-hall="16"] .hall-plan-image').isVisible(), "Hall 16 floor plan should be visible");
  await page.locator(".pin-button").first().click();
  assert((await page.locator(".exhibitor-card.is-pinned").count()) === 1, "Pinning first exhibitor failed");

  await page.locator('[title="显示交通指引图"]').click();
  await page.locator(".guide-strip figure").first().waitFor({ state: "visible", timeout: 10000 });
  assert(await page.locator(".guide-strip figure").count() === 2, "Guide image strip should show two figures");

  await page.locator(".agent-fab").click();
  await page.locator(".desktop-agent-layer .agent-panel").waitFor({ state: "visible", timeout: 10000 });
  assert((await page.locator(".desktop-agent-layer .agent-header strong").innerText()).includes("文博会 Agent"), "Desktop agent panel did not open");
  await page.locator(".desktop-agent-layer .chat-box input").fill("从地铁怎么去全球AI切磋盛典？");
  await page.locator(".desktop-agent-layer .chat-box button").click();
  await expectText(page, "国展站 C1/C2");
  await page.locator(".desktop-agent-layer .agent-header span", { hasText: "已生成智能导览建议" }).waitFor({ state: "visible", timeout: 30000 });

  await page.locator(".desktop-agent-layer .chat-box input").fill("我想看AI和非遗，帮我规划路线");
  await page.locator(".desktop-agent-layer .chat-box button").click();
  await page.locator(".desktop-agent-layer .inline-route-card").first().waitFor({ state: "visible", timeout: 30000 });
  assert(await page.locator(".desktop-agent-layer .message-details").last().evaluate((node) => !node.open), "Agent route text should be collapsed by default");
  await page.locator(".desktop-agent-layer .message-details summary").last().click();
  const routeText = await page.locator(".desktop-agent-layer .message-details[open]").last().innerText();
  assert(routeText.includes("展商列表"), "Expanded route text should include exhibitor list");
  assert(routeText.includes("路线建议"), "Expanded route text should include route advice");
  assert(await page.locator(".desktop-agent-layer .inline-hall-map-card .hall-plan-image").first().isVisible(), "Inline route card should show a hall floor plan");
  assert(await page.locator(".desktop-agent-layer .inline-hall-map-card .hall-map-marker.is-highlighted").count() > 0, "Inline route map should highlight target merchants");
  await page.locator(".desktop-agent-layer .route-expand-button").first().click();
  await page.locator(".route-fullscreen").waitFor({ state: "visible", timeout: 10000 });
  assert(await page.locator(".route-fullscreen .hall-map-marker.is-highlighted").count() > 0, "Fullscreen route map should keep highlighted markers");
  await page.locator(".route-fullscreen-header button").click();
  await page.locator(".desktop-agent-layer .inline-target-list button").first().click();
  await expectText(page, "个匹配结果");
  assert((await page.locator(".message").count()) >= 5, "Agent messages did not append");

  await page.locator(".desktop-agent-layer .chat-box input").fill("推荐非遗国潮展商");
  await page.locator(".desktop-agent-layer .chat-box button").click();
  await page.locator(".desktop-agent-layer .inline-route-card").last().waitFor({ state: "visible", timeout: 30000 });

  assert(pageErrors.length === 0, `Page errors:\n${pageErrors.join("\n")}`);
  assert(consoleErrors.length === 0, `Console errors:\n${consoleErrors.join("\n")}`);
  assert(failedRequests.length === 0, `Request failures:\n${failedRequests.join("\n")}`);
  assert(badLocalResponses.length === 0, `Bad local responses:\n${badLocalResponses.join("\n")}`);
  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "load" });
  await expectText(page, "文博会 Agent");
  assert(await page.locator(".guide-screen.is-active .guide-agent-panel").isVisible(), "Mobile should open on the full-screen guide tab");
  assert(await page.locator(".mobile-bottom-tabs").isVisible(), "Mobile should show the bottom two-tab navigation");
  assert(await page.locator(".desktop-agent-layer").isHidden(), "Mobile should not show the desktop floating agent");
  await page.getByPlaceholder("问：想看AI文旅产品、推荐路线...").fill("我想看AI和非遗，帮我规划路线");
  await page.locator(".chat-box button").click();
  await page.locator(".inline-route-card").first().waitFor({ state: "visible", timeout: 30000 });
  assert(await page.locator(".message-details").last().evaluate((node) => !node.open), "Mobile agent text should be collapsed by default");
  await page.locator(".message-details summary").last().click();
  assert((await page.locator(".message-details .markdown-body li").count()) > 0, "Markdown lists should render as list elements");
  await page.locator(".message-details summary").last().click();
  await page.locator(".route-expand-button").first().click();
  await page.locator(".route-fullscreen").waitFor({ state: "visible", timeout: 10000 });
  assert(await page.locator(".route-fullscreen .hall-plan-image").isVisible(), "Fullscreen map should render the hall image");
  await page.locator(".route-fullscreen-header button").click();
  await page.getByRole("button", { name: "信息" }).click();
  await expectText(page, "文博会展商地图与路线 Agent");
  assert(await page.locator(".hall-tile").count() === 8, "Mobile expected 8 hall tiles on the info tab");
  assert(await page.locator(".exhibitor-card").count() > 0, "Mobile expected exhibitor cards");
  assert(pageErrors.length === 0, `Mobile page errors:\n${pageErrors.join("\n")}`);
  await context.close();
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--disable-extensions"],
});

try {
  await runDesktop(browser);
  await runMobile(browser);
  console.log("E2E smoke passed");
} finally {
  await browser.close();
}
