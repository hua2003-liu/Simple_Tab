# 🌴 Simple Tab

> A lightweight, beautiful Chrome new tab extension with wallpapers, search, and bookmarks.

[English](#english) · [中文](#中文)

---

## English

### Features

- 🖼️ **Drop-in Wallpapers** — Put images in the `wallpapers/` folder and they appear on the next new tab; random / sequential / pin modes
- 🔍 **Multi-Engine Search** — Switch between Bing, Google, and Baidu
- ⭐ **Bookmark Groups** — Mirrors your browser bookmarks bar; organize into groups with drag & drop right on the new tab
- 🌅 **Time-Based Themes** — Auto adapts UI colors by time of day (morning / noon / afternoon / night)
- ⚙️ **Customizable** — Your name greeting, search engine preference
- 🚀 **Lightweight** — Pure vanilla JS, no frameworks, fast load

### Screenshots

![Simple Tab](./screenshots/1.png)
![Simple Tab](./screenshots/2.png)

### Installation

1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `D:\Tab` folder
6. Open a new tab — enjoy! 🎉

### How to Add/Change Wallpapers

```bash
# Place your images in the wallpapers/ folder
# Supported formats: PNG, JPG, WEBP, GIF
# New wallpapers appear on the next new tab — no reload needed
```

### Development

```bash
# Install dependencies
npm install

# Lint
npm run lint

# Run unit tests
npm test
```

### Project Structure

```
js/
├── app.js           # Bootstrap, dependency injection
├── config/
│   └── constants.js # Search engines, storage keys
├── features/        # Feature init functions
├── lib/             # Storage, navigation, chrome adapters
└── ui/              # DOM getters, render functions
```

### License

MIT © 2026 hua2003-liu

---

## 中文

### 功能特点

- 🖼️ **即放即用壁纸** — 图片放进 `wallpapers/` 文件夹，新开标签页即可看到；支持随机 / 顺序 / 固定
- 🔍 **多搜索引擎** — 切换 Bing、Google、百度
- ⭐ **书签分组** — 实时镜像浏览器书签栏，可直接在新标签页拖拽整理分组
- 🌅 **时间主题** — 根据时间段自动变换界面色调
- ⚙️ **个性化设置** — 定制欢迎语、搜索引擎
- 🚀 **轻量快速** — 原生 JavaScript，无依赖

### 安装方式

1. 下载或克隆本仓库
2. 打开 `chrome://extensions/`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择 `D:\Tab` 文件夹
6. 打开新标签页 — 搞定！🎉

### 更换壁纸

```bash
# 把图片放入 wallpapers/ 文件夹
# 支持格式：PNG、JPG、WEBP、GIF
# 新开标签页即可看到新壁纸，无需重载扩展
```

### 开发

```bash
# 安装依赖
npm install

# 代码检查
npm run lint

# 运行单元测试
npm test
```

### 项目结构

```
js/
├── app.js           # 启动器，依赖注入
├── config/
│   └── constants.js # 搜索引擎、存储键配置
├── features/        # 各功能初始化函数
├── lib/             # 存储、导航、chrome 适配层
└── ui/              # DOM 获取器、渲染函数
```

### 开源协议

MIT © 2026 hua2003-liu
