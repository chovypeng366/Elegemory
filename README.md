# Elegemory

这是我的第一次vibe codeing

> 记录不应当需要创建文档。

一款以剪贴板为入口、以时间轴为组织方式的本地速记桌面应用。温暖纸张与磁吸白板的视觉语言，Windows 优先，数据完全保存在本机。

当前版本已实现第一阶段工程，并把「真实剪贴板 + SQLite 持久化 + 时间轴 + 全局快捷键/托盘」接通，可直接运行使用。

## 技术栈

- Tauri 2 + Rust
- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- Motion for React
- SQLite（rusqlite，内置迁移）
- Zustand
- Lucide Icons

剪贴板使用官方 `tauri-plugin-clipboard-manager`，全局快捷键使用 `tauri-plugin-global-shortcut`，单实例使用 `tauri-plugin-single-instance`。数据库访问、图片落盘与文件清理由 Rust 命令层负责。

## 环境要求（Windows）

已在本机验证的组合：

| 工具 | 版本 |
| --- | --- |
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| Rust | 1.97.1（`x86_64-pc-windows-msvc`） |
| Visual Studio Build Tools | 2022 + MSVC v143 |
| Windows SDK | 10.0.26100 |
| WebView2 Runtime | 已安装（Win11 默认） |

版本检查命令：

```bash
node -v && npm -v && rustc -V && cargo -V && rustup show
```

```powershell
& "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe" -products *
```

如果 Rust 目标不是 MSVC 工具链：

```bash
rustup default stable-x86_64-pc-windows-msvc
```

## 安装与启动

```bash
npm install
```

```bash
npm run tauri dev
```

首次运行会编译 Rust 依赖，通常需要几分钟；之后是增量编译。应用启动后会看到主窗口「记忆白板」，并在系统托盘常驻。

生产构建（生成 Windows 安装包）：

```bash
npm run tauri build
```

产物位于 `src-tauri/target/release/bundle/`（NSIS `.exe` 与 WiX `.msi`）。构建安装包需要联网下载 NSIS/WiX 工具链。

## 已实现功能

### 速记窗口（Quick Capture）

- 全局快捷键 `Ctrl + Shift + Space` 唤出 / 收起；可在设置中修改。
- 窗口弹出自动聚焦输入框，支持中文 IME。
- 文字直接输入；`Enter` 收好，`Shift + Enter` 换行。
- 切换「待办」后每行成为一条待办，`Ctrl + Enter` 收好。
- 粘贴截图：浏览器粘贴事件优先，同时提供「粘贴图片」按钮作为系统剪贴板读取兜底。
- 支持拖入本地 PNG / JPEG / WebP 图片。
- 图片会先在 Rust 侧编码为 PNG 保存到应用数据目录，再写入记录。
- 图片可与说明文字组成同一条图文记录；截图会以磁扣吸附动画进入。
- `Esc` 收起窗口，输入内容与已附加图片保存在本地草稿中，下次打开继续。
- 保存后自动刷新白板（跨窗口事件）。

### 记忆白板（Memory Board）

- 左侧导航：全部、收藏、文字、图片、待办、回收站，带实时数量。
- 顶部关键词搜索，匹配标题和全部文字内容；`Ctrl + K` 聚焦搜索。
- 按「今天 / 昨天 / 最近一周 / 年月」分组，置顶记录单独成组。
- 在「全部记忆」中可拖拽任意卡片调整顺序；文字和图片可以互相换位，顺序自动保存在本地，其他卡片依次顺延。
- 卡片自适应网格、轻微纸张倾斜、悬停抬升和阴影变化。
- 待办卡片支持勾选，复选框与划线有过渡动画；卡片上的「编辑」和详情抽屉都可以继续增删改待办。
- 悬停卡片可编辑、复制、收藏、置顶、移入回收站。
- 详情抽屉支持修改标题、编辑文字、勾选待办、添加文字/待办、复制文字、复制原图。
- 删除记录进入回收站，可恢复或永久删除；永久删除会同时清理无引用的图片文件。
- 关闭主窗口只收起到托盘，不退出；托盘菜单可打开白板、快速记录或完全退出。

### 数据与容错

- SQLite 数据库位于应用数据目录：`%APPDATA%\com.elegemory.desktop\elegemory.db`。
- 图片位于 `%APPDATA%\com.elegemory.desktop\assets\`，数据库只保存相对路径。
- 迁移由 `schema_migrations` 表管理，启动时按版本执行。
- 剪贴板无图片、格式不支持、图片损坏、快捷键被占用、数据库错误等都会返回可见提示，不会崩溃。
- 图片限制为 40 MB、4000 万像素以内，避免异常大图撑爆内存。
- 已支持 `prefers-reduced-motion`，系统开启减弱动效时会跳过入场动画。

### 设置

- 修改速记全局快捷键并即时重新注册（失败会恢复旧快捷键）。
- 拒绝没有修饰键的快捷键以及 Ctrl+C / Ctrl+V，避免全局劫持系统复制粘贴。
- 纸张主题：暖纸、雾蓝、沙丘、陶土。
- 磁扣颜色：青瓷、赤陶、黄铜、墨蓝、鼠尾草、豆沙、石墨。
- 自定义背景图片：支持 PNG / JPEG / WebP，可调节背景透明度；图片保存在本机。
- 查看数据目录、记录/图片/回收站数量。
- 查看版本、退出应用。
- AI 能力已预留接口，当前未启用。

## 目录结构

```text
Elegemory/
├─ src/
│  ├─ components/              # Logo、图标按钮、磁扣、Toast、确认框
│  ├─ features/
│  │  ├─ board/                # 白板窗口、侧栏、顶部搜索、时间轴
│  │  ├─ capture/              # 速记窗口
│  │  ├─ notes/                # 笔记卡片与详情抽屉
│  │  └─ settings/             # 设置弹窗
│  ├─ lib/                     # 样式工具、日期分组、资源 URL、拖动
│  ├─ services/
│  │  ├─ api.ts                # Tauri 命令封装
│  │  ├─ clipboard.ts          # 剪贴板图片编码 / 复制
│  │  ├─ system.ts             # 窗口、事件、拖放
│  │  ├─ mock.ts               # 仅浏览器预览用的开发数据层
│  │  └─ ai/provider.ts        # AI 扩展接口（未接线）
│  ├─ stores/                  # Zustand：笔记、界面、设置
│  ├─ styles/global.css        # 设计变量、纸张纹理、磁扣、按钮
│  └─ types/                   # TypeScript 数据模型
├─ src-tauri/
│  ├─ capabilities/default.json
│  ├─ migrations/001_init.sql
│  ├─ src/
│  │  ├─ db.rs                 # 连接、迁移、查询组装
│  │  ├─ models.rs             # Serde 模型
│  │  ├─ tray.rs               # 托盘菜单
│  │  ├─ commands/
│  │  │  ├─ notes.rs           # 笔记 / 内容块 CRUD
│  │  │  ├─ assets.rs          # 图片校验、编码、落盘
│  │  │  ├─ settings.rs        # 设置与快捷键
│  │  │  └─ system.rs          # 窗口与退出
│  │  └─ lib.rs                # 插件、迁移、快捷键、窗口生命周期
│  └─ tauri.conf.json
├─ readme.txt                  # 原始需求
└─ README.md
```

## 数据模型

- `notes`：`id / type / title / created_at / updated_at / is_pinned / is_favorite / is_archived`
- `note_blocks`：`id / note_id / block_type / content / asset_id / sort_order / is_completed`
- `assets`：`id / relative_path / mime_type / width / height / size_bytes / created_at`
- `settings`：键值配置（快捷键等非敏感设置）

记录与图片分开存储；数据库不保存 Base64。时间统一使用 Unix 毫秒时间戳，界面按本地时区分组。

## 实际使用流程

1. 启动应用，按 `Ctrl + Shift + Space` 唤出速记窗口。
2. 输入文字；或截图后直接 `Ctrl + V`，图片会出现在窗口上方。
3. 按 `Enter`（待办模式按 `Ctrl + Enter`）收好，窗口自动收起。
4. 主窗口会按时间显示这张「纸张 / 照片」卡片。
5. 点击卡片打开详情；悬停卡片可复制、收藏或删除。
6. 退出应用再打开，记录与图片仍在。

## 开发提示

### 浏览器预览模式

不连接 Tauri 时（例如直接 `npm run dev` 打开浏览器），应用会自动使用 `src/services/mock.ts` 中的本地演示数据，方便调 UI。该模式仅用于开发预览，真实开发/构建运行时始终走 Tauri 命令，不提供任何伪装的系统能力。

- 白板预览：`http://localhost:1420/?window=main`
- 速记预览：`http://localhost:1420/?window=capture`

### 常用命令

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run tauri dev
```

```bash
npm run tauri build
```

## 常见问题

**`error: linker link.exe not found` / MSVC 缺失**
安装 Visual Studio Build Tools 的「使用 C++ 的桌面开发」工作负载，并确认 Windows SDK 已勾选；然后重新打开终端。

**启动后白屏**
先看 `npm run tauri dev` 的终端输出。多半是前端编译错误或端口 1420 被占用。检查是否有旧的 Vite 进程：

```bash
netstat -ano | findstr :1420
```

**快捷键没有反应**
`Ctrl + Shift + Space` 可能被输入法、PowerToys 或截图工具占用。打开应用设置改用其他组合，保存时会提示注册失败原因。

**粘贴图片没有反应**
确认剪贴板里确实是位图（Windows 截图工具 / 第三方截图工具 / 浏览器复制图片）。可点速记窗口的「粘贴图片」按钮作为兜底；也支持直接把 PNG/JPEG 文件拖进窗口。

**图片在重启后不显示**
检查 `%APPDATA%\com.elegemory.desktop\assets\` 是否存在对应 PNG，以及数据库中 `assets.relative_path` 是否一致。应用只通过 Tauri 资源协议读取该目录。

**关闭按钮没有退出应用**
这是托盘应用的预期行为。请使用托盘菜单「退出 Elegemory」或设置里的「退出 Elegemory」。

**安装包构建失败**
`tauri build` 首次需要下载 NSIS/WiX。若日志停在 `Downloading https://github.com/...` 或出现 `failed to bundle project: timeout: global`，说明工具链下载超时，并非代码错误；先执行下面的命令验证 release 可执行文件，网络恢复后再生成安装包：

```bash
npm run tauri build -- --no-bundle
```

## 后续计划

- macOS（Apple Silicon）适配与 Command 快捷键。
- 明暗主题与更细腻的纸张材质。
- 拖拽排序、标签、每日回顾。
- AI Provider 接线：自动标题、摘要、待办整理、标签推荐（默认关闭，需用户主动触发；密钥使用系统安全凭据存储）。
- 图片资源回收站与更完整的孤儿资源清理。
