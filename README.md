# 玄天工作站

玄灵的个人创作主页，展示三个可在线互动的项目，并记录日常开发练习。页面说明其无注册、无付费、个人非商业、用于代码练习记录与好友互娱。页面仍链接到可实际互动的独立子站；备案和对外说明应如实描述实际功能。主页没有公开留言、论坛、用户注册或付费功能，保留轻量点赞计数。

## 本地开发

需要 Node.js 20 或更高版本，无第三方运行时依赖。

```sh
npm run dev
```

打开 `http://127.0.0.1:3000`。运行测试：

```sh
npm test
```

生产启动：

```sh
npm start
```

`PORT` 可更改 Node 端口，`DATA_FILE` 可指定点赞 JSON 文件路径。默认监听 `127.0.0.1`，适合由 Nginx/Caddy 反向代理并提供 HTTPS。

## 长期运行

宝塔部署时将 `PORT` 设为 `3300`，并用宝塔 Node 项目管理器配置常驻和自动重启；Nginx 将根域名与 `www.xuantiangame.com` 反向代理到 `http://127.0.0.1:3300`，提供有效 TLS 证书。确认两个主机名都解析到主页服务器、服务用户对点赞数据目录有写权限，并定期备份数据。主页的稳定运行不保证三个子站本身稳定；应分别管理各自进程、存档和网络连接。如果子站使用 WebSocket 联机，反向代理需要保留 WebSocket Upgrade 请求头。

## 备案说明

页面标注“无注册、无付费、个人非商业用途、日常代码开发练习记录与好友线上互娱”。这些说明反映预期使用方式，不会改变三个子站可在线互动的实际功能。此前 ICP 网站名称登记为“日常记录”，如现在将该域名用于玄天工作站，应向接入商确认是否需要变更备案名称或服务内容，并如实向属地网安部门描述三个可访问的互动子站。无注册、付费和仅好友使用不自动替代主管部门对网络游戏出版、运营等要求的判断。

## 背景图

主页使用 `assets/xuantian.png` 作为全页星空背景，并有深色渐变遮罩和移动端裁切适配。展示图片也位于 `assets/`，由服务器通过 `/assets/...` 提供。服务启动时根据图片内容生成版本号，并自动为 HTML 和 CSS 中的图片链接添加 `?v=...`，版本链接允许浏览器缓存一年。更换图片后提交并部署重启，版本号自动变化；预加载与 CSS 使用相同链接，不会重复下载。修改图片路径时仍需同步更新 HTML 与 CSS。

HTML、CSS、JS 等资源使用 ETag 校验，未变更时返回 304，不重复发送内容。点赞 API 禁止缓存。宝塔 Nginx 反向代理中的 `expires 1m` 和额外的 `Cache-Control` 设置应移除，以免覆盖或冲突；完整配置见 [图片缓存配置](docs/browser-cache.md)。无痕窗口、清除缓存、强制刷新或浏览器清理磁盘缓存后，图片仍可能重新下载。


## Baota panel deployment

Follow [docs/baota-deployment.md](docs/baota-deployment.md) to upload and configure the Node service, reverse proxy, DNS, and HTTPS.

## GitHub push deployment

For private SSH access keys, Baota Git Manager, and GitHub Webhooks, follow [docs/github-baota-auto-deploy.md](docs/github-baota-auto-deploy.md).
