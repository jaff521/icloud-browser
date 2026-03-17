# iCloud Browser — Bug 修复与功能补全

本项目是一个 Electron + React 应用，用于浏览 macOS 上 iCloud 照片备份（按"年月日"目录组织）。当前存在多个 Bug 导致 HEIC 图片和 MOV 视频无法正常浏览，以及选择年份/月份后无法展示照片等问题。

## Proposed Changes

### 前端组件 Bug 修复

---

#### [MODIFY] [PhotoGrid.tsx](file:///Users/suf1234/code-spaces/electron/electron-test/src/components/PhotoGrid.tsx)

**Bug B1: [isHeicFile()](file:///Users/suf1234/code-spaces/electron/electron-test/src/components/PreviewModal.tsx#23-28) 逻辑错误**
`filename.toLowerCase()` 返回的是完整文件名（如 `img_001.heic`），但却与 `.heic` / `.HEIC` 做全等比较。`.HEIC` 在 `toLowerCase()` 之后永远不可能匹配。

```diff
 function isHeicFile(filename: string): boolean {
-  const ext = filename.toLowerCase();
-  return ext === '.heic' || ext === '.HEIC';
+  return filename.toLowerCase().endsWith('.heic');
 }
```

**Bug B6: 视频文件在网格中只有 SVG 占位符**
为视频生成缩略图（使用后端 `ffmpeg` 提取首帧），在网格中显示实际视频首帧画面。

```diff
 {photo.isVideo === 1 ? (
-  <div style={{ /* SVG placeholder */ }}>
-    <svg>...</svg>
-  </div>
+  <img
+    src={toLocalUrl(photo.filePath, false, true)}
+    alt={photo.filename}
+    loading="lazy"
+    onError={...}
+  />
 ) : ( ... )}
```

同时更新 [toLocalUrl](file:///Users/suf1234/code-spaces/electron/electron-test/src/components/PhotoGrid.tsx#12-22) 函数，为视频文件添加 `?type=video-thumb` 参数。

---

#### [MODIFY] [PreviewModal.tsx](file:///Users/suf1234/code-spaces/electron/electron-test/src/components/PreviewModal.tsx)

**Bug B1（同上）: [isHeicFile()](file:///Users/suf1234/code-spaces/electron/electron-test/src/components/PreviewModal.tsx#23-28) 修复** — 同 PhotoGrid.tsx。

**视频预览的 `src` URL 编码问题** — 当前视频 src 中使用 `encodeURIComponent` 编码整个路径（包括 `/`），导致 `local-file://%2FUsers%2F...` 形式的 URL。后端 [fromLocalUrl](file:///Users/suf1234/code-spaces/electron/electron-test/src-electron/main/index.cjs#69-83) 能解码回来，但这不统一。统一使用 [toLocalUrl](file:///Users/suf1234/code-spaces/electron/electron-test/src/components/PhotoGrid.tsx#12-22) 辅助函数。

---

#### [MODIFY] [App.tsx](file:///Users/suf1234/code-spaces/electron/electron-test/src/renderer/App.tsx)

**Feature F4: 选择年份/月份后自动展示照片**
当前必须选到"日"才会调用 `loadPhotos`。修改：选中年份时加载该年全部照片，选中月份时加载该月全部照片。

```diff
 const handleYearSelect = (year: string) => {
   ...
   if (year) {
     loadMonths(year);
+    loadPhotos(year, '', '', 1, false);
   }
 };

 const handleMonthSelect = (month: string) => {
   ...
   if (month) {
     loadDays(selectedYear, month);
+    loadPhotos(selectedYear, month, '', 1, false);
   }
 };
```

同时修改 `photo-count` 的显示条件，从 `{selectedDay && ...}` 改为 `{selectedYear && ...}`。

**Feature F3: 扫描进度反馈**
为 [handleSelectDirectory](file:///Users/suf1234/code-spaces/electron/electron-test/src/renderer/App.tsx#128-151) 添加 `scanning` 状态，扫描过程中显示加载提示。

---

### 后端 Bug 修复

---

#### [MODIFY] [index.cjs](file:///Users/suf1234/code-spaces/electron/electron-test/src-electron/main/index.cjs)

**Bug B3: `registerStreamProtocol` 已弃用**
Electron 28 中 `protocol.registerStreamProtocol` 已弃用。迁移到 `protocol.handle`，返回 `Response` 对象。

```diff
-protocol.registerStreamProtocol(localProtocol, async (request, callback) => {
+protocol.handle(localProtocol, async (request) => {
   ...
-  callback({ statusCode: 200, headers: {...}, data: stream });
+  return new Response(stream, { status: 200, headers: {...} });
 });
```

**Bug B4: `webSecurity: false` 安全隐患**
已有 `local-file` 自定义协议注册为 privileged，无需禁用 web security。移除 `webSecurity: false` 和 `allowRunningInsecureContent: true`。

**Feature F2 后端: 视频缩略图生成**
在协议处理器中添加对 `?type=video-thumb` 的处理：使用 macOS `sips` 或 `ffmpeg`（优先尝试 ffmpeg）提取视频首帧作为缩略图。

---

#### [MODIFY] [database.cjs](file:///Users/suf1234/code-spaces/electron/electron-test/src-electron/database.cjs)

**Bug B2: 扩展名匹配大小写不一致**
`supportedExtensions` 中同时列出 `.heic` 和 `.HEIC`，但 `path.extname` 返回原始大小写。改为统一小写比较：

```diff
-const supportedExtensions = ['.heic', '.HEIC', '.jpg', '.jpeg', '.png', '.mov', '.mp4'];
+const supportedExtensions = ['.heic', '.jpg', '.jpeg', '.png', '.mov', '.mp4'];
 ...
-if (supportedExtensions.includes(ext)) {
+if (supportedExtensions.includes(ext.toLowerCase())) {
```

同样修复 `isVideo` 判断：
```diff
-isVideo: ext === '.mov' || ext === '.mp4' ? 1 : 0
+isVideo: ext.toLowerCase() === '.mov' || ext.toLowerCase() === '.mp4' ? 1 : 0
```

---

#### [MODIFY] [imageProcessor.cjs](file:///Users/suf1234/code-spaces/electron/electron-test/src-electron/main/imageProcessor.cjs)

**Feature F2: 添加视频缩略图生成功能**
新增 `processVideoThumbnail(filePath, type)` 函数，使用 `ffmpeg` 提取视频首帧并返回缩存图路径。

```javascript
async function processVideoThumbnail(filePath, type = 'thumbnail') {
  // Generate cache key
  // Try ffmpeg first: ffmpeg -i input.mov -vframes 1 -s 200x200 output.jpg
  // Fallback to qlmanage: qlmanage -t -s 200 -o outputDir input.mov
}
```

---

## Verification Plan

### Manual Verification（需要用户验证）

由于项目没有自动化测试，且涉及 Electron 文件系统交互和 macOS 原生工具（sips/ffmpeg），需要手动验证：

1. **启动应用**：在项目根目录运行 `bash dev.sh`
2. **扫描目录**：点击 "Select iCloud Photos Directory" 按钮，选择包含 HEIC 图片和 MOV 视频的备份目录
3. **验证导航**：
   - 点击年份 → 应立即在右侧显示该年所有照片
   - 点击月份 → 应显示该月照片
   - 点击日期 → 应显示该日照片
4. **验证 HEIC 显示**：
   - 网格中 HEIC 图片应显示为缩略图（而非空白或错误）
   - 点击 HEIC 图片，预览弹窗中应显示大图
5. **验证 MOV 视频**：
   - 网格中 MOV 视频应显示首帧缩略图（而非灰色 SVG 图标）
   - 点击视频，预览弹窗中应可播放视频
6. **验证扫描反馈**：扫描大目录时应显示 "Scanning..." 提示
