# 马克笔管理系统

手绘风格的马克笔收藏与库存管理 Web 应用。基于 React + Vite + Tailwind CSS + [Rough.js](https://roughjs.com/) 构建。

## 功能

- 首页仪表盘：库存统计、最近添加、常用色板、库存预警
- 马克笔库：搜索、筛选、详情查看
- 库存管理、品牌与系列、购买记录、心愿清单
- 统计分析图表（饼图、柱状图、折线图）
- 导出与备份、设置

## 技术栈

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4
- React Router 7
- Recharts + Rough.js（手绘风图表与 UI 边框）

## 在线演示

GitHub Pages：**https://mango-sevenseven.github.io/marker-inventory/**

（推送 `main` 分支后由 GitHub Actions 自动部署，首次约需 1–2 分钟。）

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端显示的地址（默认 `http://localhost:5173`）。

## 构建

```bash
npm run build
npm run preview
```

## GitHub Pages 本地预览

```bash
npm run build:pages
npm run preview
```

## 说明

当前使用本地 Mock 数据，无需后端即可运行演示。

## License

MIT
