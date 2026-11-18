/** Sample a visible renderer without including automation round-trip time. */
export async function measureEvolutionBrowser(page, graphReadyMs = null) {
  await page.bringToFront();
  return page.evaluate(async (readyMs) => {
    const scroller = Array.from(document.querySelectorAll(".task-evolution-graph-scroll")).find((element) =>
      element.checkVisibility(),
    );
    if (!scroller || document.visibilityState !== "visible") throw new Error("性能采样需要可见的演进图窗口。");
    const top = scroller.scrollTop;
    const samples = [];
    let previous;
    let frame;
    let stopped = false;
    const complete = await Promise.race([
      new Promise((resolve) => {
        const step = (time) => {
          if (stopped) return;
          if (previous !== undefined) samples.push(time - previous);
          previous = time;
          scroller.scrollTop = (top + samples.length * 38) % Math.max(1, scroller.scrollHeight - scroller.clientHeight);
          if (samples.length >= 60) resolve(true);
          else frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      }),
      new Promise((resolve) => setTimeout(() => resolve(false), 4000)),
    ]);
    stopped = true;
    cancelAnimationFrame(frame);
    scroller.scrollTop = top;
    const sorted = samples.sort((a, b) => a - b);
    const round = (value) => (value === undefined ? null : +value.toFixed(2));
    return {
      graphReadyMs: round(readyMs),
      rows: scroller.querySelectorAll(".task-evolution-graph-rows > li").length,
      viewport: { width: innerWidth, height: innerHeight },
      scrolling: {
        complete,
        frames: samples.length,
        medianMs: round(sorted[Math.floor(sorted.length / 2)]),
        p95Ms: round(sorted[Math.floor(sorted.length * 0.95)]),
        maxMs: round(sorted.at(-1)),
      },
    };
  }, graphReadyMs);
}
