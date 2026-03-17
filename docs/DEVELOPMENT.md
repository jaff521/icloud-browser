# iCloud Browser 开发文档

## 项目概述

iCloud Browser 是一款基于 Electron 开发的 Mac 桌面应用程序，用于本地浏览 iCloud 照片备份。该应用模仿 iCloud 照片的界面设计，提供按年、月、日三级导航的图片浏览功能，支持常见图片格式（HEIC、JPG、PNG）和视频格式（MOV、MP4）的预览播放。

本项目采用现代化的技术栈构建，前端使用 React + TypeScript + Vite，后端使用 Electron 主进程处理文件系统扫描和数据管理，前后端通过 IPC 机制进行通信。应用程序使用 JSON 文件存储照片元数据，无需额外的数据库服务。

## 技术栈

本项目选择以下技术组合构建桌面应用程序，每个技术选型都经过权衡以满足项目需求。

**Electron** 作为桌面应用框架，提供跨平台桌面应用开发能力。Electron 允许使用 Web 技术构建原生桌面应用，同时可以访问操作系统的文件系统 API，这对于照片浏览类应用至关重要。项目使用 Electron 28 版本，该版本在性能和安全性方面都有显著提升。

**React 18** 作为前端 UI 框架，采用函数式组件和 Hooks 模式进行开发。React 的声明式编程范式使得 UI 状态的管理更加直观，特别是 `useState`、`useEffect` 和 `useCallback` 等 Hooks 能够优雅地处理组件状态和副作用。

**TypeScript** 为项目提供静态类型检查能力，在开发阶段即可发现潜在的类型错误，显著提高代码质量和可维护性。

**Vite** 作为构建工具，提供极快的开发服务器启动速度和热模块替换（HMR）能力。

## 项目结构

项目采用分离式架构设计，将 Electron 主进程代码和 React 渲染进程代码分别放置在不同的目录中，通过 IPC 机制进行通信。

```
icloud-browser/
├── .claude/                  # Claude AI 配置目录
├── dist/                     # Vite 构建输出目录（渲染进程）
├── dist-electron/            # Electron 构建输出目录（主进程）
├── node_modules/             # 依赖包目录
├── release/                  # 构建发布包输出目录
├── scripts/                  # 构建脚本目录
│   └── copy-electron.ts      # Electron 文件复制脚本
├── src/                      # 渲染进程源代码目录（React）
│   ├── components/           # React 组件目录
│   │   ├── ErrorBoundary.tsx # 错误边界组件
│   │   ├── PhotoGrid.tsx     # 照片网格展示组件
│   │   ├── PreviewModal.tsx  # 图片/视频预览模态框
│   │   └── Sidebar.tsx       # 年/月/日导航侧边栏
│   ├── renderer/             # React 应用入口
│   │   ├── App.tsx           # 主应用组件
│   │   ├── index.tsx         # 应用入口文件
│   │   └── index.html        # HTML 入口文件
│   ├── styles.css            # 全局样式文件
│   └── vite-env.d.ts         # Vite 类型定义
├── src-electron/             # 主进程源代码目录
│   ├── main/                 # Electron 主进程逻辑
│   │   └── index.cjs         # 主进程入口文件
│   ├── preload/              # 预加载脚本
│   │   └── index.cjs         # 预加载脚本文件
│   └── database.cjs          # 数据库管理模块
├── .npmrc                    # npm 镜像配置
├── dev.sh                    # 开发环境启动脚本
├── electron-builder.json5    # Electron Builder 打包配置
├── package.json              # 项目配置和依赖定义
├── tsconfig.json             # TypeScript 编译配置
├── tsconfig.node.json        # Node 环境 TypeScript 配置
└── vite.config.ts            # Vite 构建配置
```

## 核心架构

### Electron 主进程架构

Electron 主进程是整个应用程序的核心，负责管理应用生命周期、创建浏览器窗口、处理操作系统级事件，以及与文件系统进行交互。

**BrowserWindow 管理**：主进程在 `src-electron/main/index.cjs` 中创建应用窗口，配置窗口大小、标题栏样式、背景颜色等属性。关键配置包括：
- `webSecurity: false` - 允许加载本地资源
- `contextIsolation: true` - 启用上下文隔离
- 自定义协议 `local-file://` 用于安全加载本地文件

**IPC 处理器** 包括：
- `select-directory` - 触发目录选择对话框
- `get-years` - 获取照片年份列表
- `get-months` - 获取指定年份的月份列表
- `get-days` - 获取指定年月的日期列表
- `get-photos` - 获取指定日期的照片列表（支持分页）
- `get-photo-count` - 获取指定日期的照片总数
- `scan-directory` - 扫描目录并索引照片

**本地文件协议**：`local-file://` 自定义协议用于绕过 Chromium 的 file:// 协议限制。
- 使用 `protocol.registerStreamProtocol()` 注册
- 支持大文件流式传输
- 自动设置正确的 MIME 类型
- 支持 URL 解码（中文路径）

### 渲染进程架构

渲染进程运行在 Chromium 浏览器窗口中，负责渲染用户界面、处理用户交互事件。

**App 组件**（`src/renderer/App.tsx`）是整个前端应用的根组件，维护的状态包括：年份列表、月份列表、日期列表、当前选中的年/月/日、照片列表、预览状态等。

**组件通信模式**：采用自上而下的单向数据流设计。App 组件作为状态容器，通过 props 将状态和回调函数传递给子组件。

## 数据模型

### 照片数据结构

```typescript
interface Photo {
  id: number;
  filename: string;
  filePath: string;
  year: string;
  month: string;
  day: string;
  dateCreated: string;
  isVideo: number;
}
```

### 目录结构说明

**重要**：本项目假设 iCloud 照片的日期信息存储在**目录名**中，而非文件名中：

```
/照片备份/
  ├── 2023年9月2日/
  │   ├── IMG_6055.HEIC
  │   ├── IMG_6055.mov
  │   └── IMG_6057.HEIC
  ├── 2023年9月3日/
  └── 2023年9月4日/
```

正则表达式 `(\d{4})年(\d{2})月(\d{2})日` 用于从目录名中提取日期信息。

### 数据库存储格式

元数据以 JSON 格式存储在 `~/Library/Application Support/iCloud Browser/metadata.db` 文件中。

## 核心功能实现

### 目录扫描

`scanDirectory()` 函数递归扫描目录，从目录名中提取日期信息。支持的格式：
- 图片：HEIC、HEIC、JPG、JPEG、PNG
- 视频：MOV、MP4

### 日期导航

三级导航结构：年份 -> 月份 -> 日期。每次选择日期后触发照片加载。

### 照片网格展示

- 使用 CSS Grid 实现响应式布局
- 无限滚动加载（每页 50 张）
- 懒加载图片 (`loading="lazy"`)

### HEIC 格式支持

HEIC 文件需要转换为 JPEG 才能在浏览器中显示。项目使用 `heic2any` 库进行转换：

```typescript
// PhotoGrid.tsx 和 PreviewModal.tsx 中
const convertedBlob = await heic2any({
  blob: heicBlob,
  toType: 'image/jpeg',
  quality: 0.8
});
```

转换过程：
1. 通过 `local-file://` 协议获取 HEIC 文件
2. 使用 heic2any 转换为 JPEG Blob
3. 使用 `URL.createObjectURL()` 生成可显示的 URL

### 预览模态框

支持：
- 图片和视频预览
- 键盘导航（左右箭头切换，ESC 关闭）
- 缩略图转换时的加载动画

## 开发环境搭建

### 环境要求

- Node.js 18.0 或更高版本（推荐 v18 或 v20）
- macOS 操作系统
- Git

### npm 镜像配置（大陆用户）

由于网络原因，大陆用户需要配置 npm 镜像：

```bash
# 创建 .npmrc 文件
echo "registry=https://registry.npmmirror.com
electron_mirror=https://npmmirror.com/mirrors/electron/" > .npmrc

# 或手动创建 .npmrc 文件
```

### 依赖安装

```bash
# 使用 nvm 管理 Node 版本
source ~/.nvm/nvm.sh
nvm use 18

# 安装依赖
npm install
```

### 启动开发服务器

```bash
npm run dev
```

该脚本会启动：
1. Vite 开发服务器（端口 5173）
2. Electron 主进程

### 源代码修改

- 前端代码修改后，Vite 自动热更新
- 主进程代码修改后，需要重启应用（`Cmd+Q` 退出后重新运行 `npm run dev`）

## 关键文件详解

### 主进程入口 (`src-electron/main/index.cjs`)

- `registerLocalProtocol()` - 注册 `local-file://` 协议
- `createWindow()` - 创建应用窗口
- IPC 处理器 - 处理渲染进程的请求

### 数据库模块 (`src-electron/database.cjs`)

- `scanDirectory(rootPath)` - 扫描目录，索引照片
- `getPhotos(options)` - 获取照片列表
- `getYears()`, `getMonths()`, `getDays()` - 获取日期导航数据

### 照片网格组件 (`src/components/PhotoGrid.tsx`)

- `PhotoCard` 子组件 - 处理单个照片的显示
- HEIC 转换逻辑
- 无限滚动加载

### 预览模态框 (`src/components/PreviewModal.tsx`)

- 支持图片和视频预览
- HEIC 转换和加载状态
- 键盘导航支持

## 已知问题与解决方案

### 问题 1：文件协议安全限制

**症状**：`Not allowed to load local resource`

**解决方案**：使用自定义 `local-file://` 协议，通过主进程读取文件并返回给渲染进程。

### 问题 2：路径解析错误

**症状**：路径解析后缺少开头的 `/`

**解决方案**：在 `fromLocalUrl()` 函数中确保路径以 `/` 开头，并进行 URL 解码。

### 问题 3：HEIC 文件无法显示

**症状**：HEIC 格式图片不显示

**解决方案**：使用 `heic2any` 库将 HEIC 转换为 JPEG。

### 问题 4：npm 安装缓慢或失败

**症状**：Electron 下载超时

**解决方案**：配置 npm 镜像（见上述"npm 镜像配置"章节）。

## 待完善功能

- [ ] 照片缩略图缓存（避免重复转换 HEIC）
- [ ] 视频缩略图生成
- [ ] 照片搜索功能
- [ ] 批量操作（导出、删除）
- [ ] 相册/收藏功能
- [ ] 设置页面（缓存管理、关于）
- [ ] 深色/浅色主题切换
- [ ] Windows/Linux 适配

## 构建与发布

```bash
# 开发构建
npm run dev

# 生产构建
npm run build

# 打包产物位于 release/ 目录
```

## 相关资源

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev)
- [Vite 文档](https://vitejs.dev)
- [heic2any GitHub](https://github.com/nodeca/heic2any)
