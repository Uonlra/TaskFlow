const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createTrayController } = require("./tray.cjs");

function setup({ emptyIcon = false, failMenu = false } = {}) {
  const app = new EventEmitter();
  let quits = 0;
  app.quit = () => {
    quits++;
    app.emit("before-quit");
  };
  const trays = [];
  class FakeTray extends EventEmitter {
    constructor() {
      super();
      trays.push(this);
      this.destroyCount = 0;
    }
    setToolTip(value) {
      this.tooltip = value;
    }
    setContextMenu(value) {
      this.menu = value;
    }
    destroy() {
      this.destroyCount++;
    }
  }
  let window = {
    destroyed: false,
    minimized: false,
    visible: true,
    focusCount: 0,
    restoreCount: 0,
    isDestroyed() {
      return this.destroyed;
    },
    isMinimized() {
      return this.minimized;
    },
    restore() {
      this.minimized = false;
      this.restoreCount++;
    },
    show() {
      this.visible = true;
    },
    hide() {
      this.visible = false;
    },
    focus() {
      this.focusCount++;
    },
  };
  const create = () =>
    createTrayController({
      app,
      Tray: FakeTray,
      Menu: {
        buildFromTemplate: (items) => {
          if (failMenu) throw new Error("Menu failed");
          return items;
        },
      },
      nativeImage: { createFromPath: () => ({ isEmpty: () => emptyIcon }) },
      iconPath: "fixture.ico",
      getWindow: () => window,
    });
  return {
    app,
    create,
    get tray() {
      return trays.at(-1);
    },
    get window() {
      return window;
    },
    setWindow: (next) => {
      window = next;
    },
    quits: () => quits,
  };
}

test("tray restores minimized windows and can explicitly hide and show", () => {
  const s = setup();
  const controller = s.create();
  assert.equal(s.tray.tooltip, "TaskFlow");
  s.window.minimized = true;
  s.window.visible = false;
  s.tray.emit("click");
  assert.equal(s.window.visible, true);
  assert.equal(s.window.restoreCount, 1);
  assert.equal(s.window.focusCount, 1);
  s.tray.menu.find((item) => item.id === "hide").click();
  assert.equal(s.window.visible, false);
  s.tray.menu.find((item) => item.id === "show").click();
  assert.equal(s.window.visible, true);
  s.tray.emit("double-click");
  assert.equal(s.window.focusCount, 3);
  controller.destroy();
});

test("quit is explicit, cannot reopen while exiting, and destroys native tray once", () => {
  const s = setup();
  const controller = s.create();
  s.tray.menu.find((item) => item.id === "quit").click();
  assert.equal(s.quits(), 1);
  assert.equal(controller.show(), false);
  assert.equal(controller.hide(), false);
  s.app.emit("will-quit");
  controller.destroy();
  assert.equal(s.tray.destroyCount, 1);
  assert.equal(s.tray.listenerCount("click"), 0);
  assert.equal(s.app.listenerCount("before-quit"), 0);
  assert.equal(s.app.listenerCount("will-quit"), 0);
});

test("never operates on stale or destroyed windows", () => {
  const s = setup();
  const controller = s.create();
  s.window.destroyed = true;
  assert.equal(controller.show(), false);
  assert.equal(controller.hide(), false);
  s.setWindow(undefined);
  s.tray.emit("click");
  assert.equal(controller.show(), false);
  controller.destroy();
});

test("failed initialization does not leave a native icon or app event handlers", () => {
  const empty = setup({ emptyIcon: true });
  assert.throws(empty.create);
  assert.equal(empty.tray, undefined);
  const failed = setup({ failMenu: true });
  assert.throws(failed.create);
  assert.equal(failed.tray.destroyCount, 1);
  assert.equal(failed.app.listenerCount("before-quit"), 0);
});
