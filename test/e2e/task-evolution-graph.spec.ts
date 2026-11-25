import { expect, test, type Locator } from "@playwright/test";
import { longHistoryFixture } from "../fixtures/task-evolution-long-history";

test.use({ viewport: { width: 1440, height: 1000 } });

async function graphBounds(scroll: Locator) {
  return scroll.evaluate((element) => {
    const copy = element.querySelector<HTMLElement>(".task-evolution-graph-record")!;
    return {
      width: element.clientWidth,
      copyWidth: copy.getBoundingClientRect().width,
      copyLeft: copy.getBoundingClientRect().left - element.getBoundingClientRect().left,
      pan: element.scrollLeft,
    };
  });
}

test("少量分支在详情与工作台中完整展示且不产生横向滚动", async ({ page }, testInfo) => {
  const task = longHistoryFixture(30, 3);
  await page.addInitScript((sample) => sessionStorage.setItem("u-task-guest-tasks", JSON.stringify([sample])), task);
  await page.goto(`/tasks/${task.id}`);
  const scroll = page.getByRole("group", { name: "任务演进图与记录" });
  await expect(scroll).toBeVisible();
  expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.goto("/tasks?status=all");
  await page.getByRole("tab", { name: "活动", exact: true }).click();
  const preview = page.locator(".task-detail-panel__activity .task-evolution-graph.is-compact");
  await expect(preview).toBeVisible();
  const previewScroll = preview.getByRole("group", { name: "任务演进图与记录" });
  expect(await previewScroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const bounds = await graphBounds(previewScroll);
  expect(bounds.copyLeft + bounds.copyWidth).toBeLessThanOrEqual(bounds.width + 1);
  await page.screenshot({ path: testInfo.outputPath("workbench-preview.png") });
});

test("多分支横向浏览保持正文位置，分支聚焦定位最新活动", async ({ page }, testInfo) => {
  const task = longHistoryFixture(90, 30);
  await page.addInitScript((sample) => sessionStorage.setItem("u-task-guest-tasks", JSON.stringify([sample])), task);
  await page.goto(`/tasks/${task.id}`);
  const graph = page.getByRole("region", { name: "演进记录", exact: true });
  const scroll = graph.getByRole("group", { name: "任务演进图与记录" });
  await expect(graph.getByRole("heading", { name: "演进记录" })).toBeVisible();
  const before = await graphBounds(scroll);
  expect(before.copyWidth).toBeGreaterThan(before.width * 0.65);
  await scroll.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  const panned = await graphBounds(scroll);
  expect(panned.pan).toBeGreaterThan(0);
  expect(Math.abs(panned.copyLeft - before.copyLeft)).toBeLessThan(1);
  expect(panned.copyWidth).toBe(before.copyWidth);

  const branch = task.evolution!.branches.at(-1)!;
  const latest = task.evolution!.events.filter((event) => event.branchId === branch.id).at(-1)!;
  const selector = graph.getByRole("combobox", { name: "突出分支" });
  await selector.focus();
  await selector.selectOption(branch.id);
  const latestNode = graph.locator(`[data-event-node="${latest.id}"]`);
  await expect
    .poll(() =>
      latestNode.evaluate((node) => {
        const circle = node.querySelector("circle")!.getBoundingClientRect();
        const group = node.closest(".task-evolution-graph-scroll")!;
        const area = group.getBoundingClientRect();
        const copy = group.querySelector(".task-evolution-graph-record")!.getBoundingClientRect();
        return (
          circle.left >= area.left &&
          circle.right <= copy.left &&
          circle.top >= area.top &&
          circle.bottom <= area.bottom
        );
      }),
    )
    .toBe(true);
  await expect(selector).toBeFocused();
  await expect(graph.getByRole("region", { name: "节点详情" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("desktop-focused.png") });

  await selector.selectOption("");
  await expect.poll(async () => (await graphBounds(scroll)).pan).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(graph.locator(".task-evolution-graph-svg")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const row = graph.locator(".task-evolution-graph-row:not(.is-gap)").first();
  const rowBox = await row.boundingBox();
  expect(rowBox!.height).toBe(72);
  const timeBox = await row.locator("time").boundingBox();
  expect(timeBox!.y + timeBox!.height).toBeLessThanOrEqual(rowBox!.y + rowBox!.height);
  expect((await graph.locator(".task-evolution-graph-row.is-gap").first().boundingBox())!.height).toBe(36);
  await page.screenshot({ path: testInfo.outputPath("mobile.png") });
});
