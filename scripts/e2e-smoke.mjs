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
  await expectText(page, "9-16号馆示意地图");
  assert(await page.locator(".agent-fab").isVisible(), "Agent should start collapsed as a floating button");
  assert(await page.locator(".agent-panel").count() === 0, "Agent panel should not be open by default");
  assert(await page.locator(".hall-tile").count() === 8, "Expected 8 hall tiles");
  assert(await page.locator(".exhibitor-card").count() === 72, "Expected initial 72 exhibitor cards");
  assert((await page.locator(".route-stop strong").first().innerText()).includes("11号馆"), "Default route should start at 11号馆");

  await page.getByPlaceholder("搜公司、展位、AI、非遗、文旅...").fill("深圳报业");
  await page.waitForTimeout(300);
  await expectText(page, "深圳报业集团");
  const searchTitle = await page.locator(".exhibitor-panel .board-header h2").innerText();
  assert(!searchTitle.includes("276"), "Search results should not be diluted by interest filters");

  await page.getByPlaceholder("搜公司、展位、AI、非遗、文旅...").fill("");
  await page.getByRole("button", { name: /16/ }).click();
  await expectText(page, "16号馆 · 文化科技馆");
  await page.locator(".pin-button").first().click();
  assert((await page.locator(".exhibitor-card.is-pinned").count()) === 1, "Pinning first exhibitor failed");

  await page.locator('[title="显示交通指引图"]').click();
  await page.locator(".guide-strip figure").first().waitFor({ state: "visible", timeout: 10000 });
  assert(await page.locator(".guide-strip figure").count() === 2, "Guide image strip should show two figures");

  await page.locator(".agent-fab").click();
  await expectText(page, "文博会 Agent");
  await page.getByPlaceholder("问：想看AI文旅产品、推荐路线...").fill("从地铁怎么去全球AI切磋盛典？");
  await page.locator(".chat-box button").click();
  await expectText(page, "国展站 C1/C2");
  await expectText(page, "deepseek-v4-pro");

  await page.getByPlaceholder("问：想看AI文旅产品、推荐路线...").fill("我想看AI和非遗，帮我规划路线");
  await page.locator(".chat-box button").click();
  await expectText(page, "展商列表");
  await expectText(page, "路线建议");
  await page.locator(".inline-route-card").first().waitFor({ state: "visible", timeout: 30000 });
  assert(await page.locator(".inline-hall.has-targets").count() > 0, "Inline route map should mark target halls");
  await page.locator(".inline-target-list button").first().click();
  await expectText(page, "个匹配结果");
  assert((await page.locator(".message").count()) >= 5, "Agent messages did not append");

  await page.getByPlaceholder("问：想看AI文旅产品、推荐路线...").fill("推荐非遗国潮展商");
  await page.locator(".chat-box button").click();
  await expectText(page, "展商列表");
  await expectText(page, "路线建议");

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
  await expectText(page, "文博会展商地图与路线 Agent");
  assert(await page.locator(".agent-fab").isVisible(), "Mobile agent should start as a floating button");
  await page.locator(".agent-fab").click();
  await expectText(page, "文博会 Agent");
  assert(await page.locator(".hall-tile").count() === 8, "Mobile expected 8 hall tiles");
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
