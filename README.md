# 马克笔管理系统

手绘风格的个人物品、马克笔库存与生活管理 Web 应用。前端使用 React/Vite，后端使用 Node.js/TypeScript，业务数据保存在 SQLite，物品图片保存在 NAS 文件目录。

## 功能

- 首页仪表盘：库存统计、最近添加、常用色板、库存预警
- 马克笔库：搜索、筛选、详情查看
- 库存管理、品牌与系列、购买记录、心愿清单
- 统计分析图表（饼图、柱状图、折线图）
- 导出与备份、设置
- 个人物品、穿搭、任务、项目、日记与旅行管理
- NAS 持久化、图片上传和浏览器旧数据自动迁移

## 技术栈

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4
- React Router 7
- Recharts + Rough.js（手绘风图表与 UI 边框）
- Express + SQLite
- Docker Compose + Nginx

## NAS 部署

NAS 需要安装 Docker Compose。进入项目目录后执行：

```bash
cp .env.example .env
docker compose up -d --build
```

浏览器访问 `http://NAS-IP:8080`。如需其他端口，修改 `.env` 中的 `APP_PORT`。

如果 NAS 无法直连 Docker Hub，可在 `.env` 中通过 `NODE_IMAGE` 和
`NGINX_IMAGE` 指定可访问的镜像地址；示例见 `.env.example`。该设置只影响
本项目构建，不会修改 NAS 的全局 Docker 镜像源。

如果后端编译阶段访问 Debian 软件源过慢，也可通过 `DEBIAN_MIRROR` 和
`DEBIAN_SECURITY_MIRROR` 单独指定软件源镜像。

后端镜像会在构建阶段编译 SQLite 原生模块，因此首次构建时间较长；编译工具
不会进入最终运行镜像。

Compose 只向宿主机发布 Nginx 端口，API 的 3000 端口不会直接暴露。运行数据位于：

- `nas-data/database/app.sqlite`：业务状态和图片元数据
- `nas-data/uploads/`：JPG、PNG、WebP 图片文件

首次从已有浏览器访问 NAS 版本时，如果服务器还没有数据，应用会自动把当前 `localStorage` 快照写入 SQLite；其中的 Base64 物品图片会自动转存到上传目录。服务器已有数据时通常以服务器为准；如果上次关闭页面前仍有本地修改未同步成功，则会优先补写本地数据。API 暂时不可用时页面会继续使用本地缓存并自动重试。

## 本地运行

```bash
npm install
npm run dev:server
```

再开一个终端：

```bash
npm run dev
```

浏览器打开 `http://localhost:5173`。Vite 会把 `/api` 和 `/media` 转发到本地 3000 端口。

## 构建

```bash
npm run build
npm run build:server
npm test
```

## GitHub Pages 本地预览

```bash
npm run build:pages
npm run preview
```

## 备份与升级

备份时必须同时保存 `nas-data/database` 和 `nas-data/uploads`。为获得一致的 SQLite 备份，推荐先执行 `docker compose stop api`，复制两个目录后再执行 `docker compose start api`。

升级代码后执行：

```bash
docker compose up -d --build
```

容器重建不会删除挂载目录中的数据库和图片。

## 无登录部署的安全边界

本项目不包含登录系统。请仅在可信局域网中开放端口；外网访问推荐先连接 NAS 所在 VPN。不要直接把端口映射到公网。若必须公网访问，应在 NAS 反向代理层增加 HTTPS 和访问认证。

## License

MIT
