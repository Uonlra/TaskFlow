# Windows 系统托盘

桌面端第二阶段首先加入 Windows 托盘入口。当前源码版本仍为 `2.2.0-beta.2`，签名和正式版发布保持暂缓；已安装的公开 beta.2 不会因合并源码自动获得此功能。

## 使用行为

- 启动后创建 TaskFlow 托盘图标；Windows 可能把图标放在任务栏的隐藏图标区域。
- 点击或双击图标显示并聚焦已有窗口；最小化窗口会先恢复。
- 右键菜单提供“显示 TaskFlow”“隐藏窗口”“退出 TaskFlow”。隐藏后应用仍运行，可以从托盘或再次启动应用恢复同一个窗口。
- 用户已确认关闭按钮正常关闭并退出，不新增关闭到托盘的拦截。
- 托盘退出和更新安装引起的退出都沿用正常退出流程；销毁托盘并关闭数据库。普通退出不自动安装已下载更新。
- 图标初始化失败会记录错误，主窗口仍可正常使用。

功能只在 Windows 创建托盘，没有自动启动、全局快捷键或任务通知。没有新增渲染层退出 IPC，也不更改云同步配置或数据库结构。

## 图标

`electron/assets/tray.ico` 由项目既有 `public/favicon.svg` 转换，包含 16、20、24、32、40、48、64、256 像素图层。重新生成：

```powershell
node scripts/create-tray-icon.mjs
```

ICO 随 `electron/**/*` 一起打包，发布校验会检查 ASAR 中的图标。图标生成只在开发时使用 Next.js 已安装的 sharp，不新增桌面运行依赖。

## 验证

```powershell
pnpm test:desktop-tray
pnpm desktop:smoke:tray
```

原生 smoke 使用独立名称、独立 `dist/tray-smoke-<时间戳>/profile`、真实 Electron Tray、BrowserWindow 和 Menu，操作实际菜单回调和托盘激活事件，验证隐藏、恢复、最小化恢复、显式退出，不操作当前用户的生产 TaskFlow 安装、数据库或云账户。报告保存在同目录 `report.json`。它不代表已通过人工右键通知区域图标的验收。

本机 electron npm 包缺少运行文件时，可以指定已准备好的同版本原始 Electron 可执行文件：

```powershell
$env:TASKFLOW_TRAY_ELECTRON_EXE = 'D:\path\to\electron.exe'
pnpm desktop:smoke:tray
```

测试入口位于 `scripts/fixtures`，不会加入正式包；不能指定 TaskFlow 已打包 EXE 运行这个组件 smoke。

2026-11-08 本机原生组件验收报告：`dist/tray-smoke-1794137598024/report.json`；打包程序的窗口与数据持久化验收报告：`dist/tray-package-smoke-1794137544285/report.json`。这两个测试均通过，使用本地隔离目录，没有安装或修改日常 TaskFlow。

完整打包程序使用另一个 smoke 验证窗口启动、隐藏后第二实例恢复、关闭退出和本地任务持久化，同样使用独立数据目录。传入本次新构建的程序路径，不需要覆盖安装：

```powershell
pnpm desktop:smoke:tray-package dist/path/to/win-unpacked/TaskFlow.exe
```
