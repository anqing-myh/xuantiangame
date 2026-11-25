# 用宝塔面板发布玄天工作站

项目没有 GitHub 仓库，也不需要构建或安装第三方依赖。服务器需要 Node.js 20 或更高版本。主页服务默认监听 `127.0.0.1:3000`，建议让 Nginx 通过宝塔反向代理对外提供 HTTPS。

## 1. 配置域名解析

在 xuantiangame.com 当前使用的 DNS 控制台添加记录：

| 类型 | 主机记录 | 记录值 |
| --- | --- | --- |
| A | `www` | 阿里云服务器的公网 IPv4 |

如果 DNS 已有 `www` 记录，先确认它指向运行宝塔的这台服务器。此前检查时 `www.xuantiangame.com` 没有解析记录；其他游戏子域名的解析不能代替 `www` 记录。等待解析生效后再申请证书。

## 2. 上传项目文件

在 Windows 上把项目打包为 ZIP，通过宝塔「文件」上传到 `/www/wwwroot/xuantiangame/` 并解压。也可以用 WinSCP 通过 SFTP 上传。保留目录结构，解压后应能看到：

```text
package.json
src/server.js
public/index.html
public/styles.css
public/app.js
public/favicon.svg
assets/
```

无需上传 `node_modules`。`data/reactions.json` 在服务第一次收到点赞时会自动创建；确保 Node 项目的运行用户对项目里的 `data/` 目录有写权限。升级时先备份 `data/reactions.json`，覆盖代码时不要删除点赞数据。

## 3. 在宝塔启动 Node 服务

1. 在宝塔「软件商店」安装 Node.js 版本管理器或 Node 项目管理器，并安装 Node.js 20 LTS 或更新版本。
2. 打开 Node 项目管理器，添加项目：项目路径选 `/www/wwwroot/xuantiangame`，启动命令选 `npm start`（或指定启动文件 `src/server.js`），运行端口填 `3000`。
3. 启用项目开机启动和异常重启。这个服务只监听本机回环地址，公网请求应由 Nginx 转发。
4. 如果面板要求先安装依赖，可在项目目录执行 `npm install --omit=dev`；当前项目没有第三方运行依赖，因此不需要下载包。

若项目管理器提供环境变量设置，可添加 `PORT=3000` 和 `DATA_FILE=/www/wwwroot/xuantiangame/data/reactions.json`。两者也都有默认值。

通过宝塔终端或 SSH 验证服务已启动：

```sh
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/favicon.svg
curl -I http://127.0.0.1:3000/assets/xuantian.png
```

都应返回 HTTP `200`。点赞接口可以用浏览器打开 `http://127.0.0.1:3000/api/likes` 检查 JSON 响应。

## 4. 配置宝塔网站与反向代理

在「网站」中为 `www.xuantiangame.com` 添加 Nginx 站点，然后打开该站点的「反向代理」设置：

- 代理名称：`xuantiangame-home`
- 目标 URL：`http://127.0.0.1:3000`
- 发送域名：`$host` 或 `www.xuantiangame.com`
- WebSocket：主页本身不需要；三个现有游戏子域名的代理配置不要改动

把整个站点请求反向代理给 Node 服务，不要只将静态首页交给 Nginx，否则 `/api/likes` 不会工作。也不要在云安全组或宝塔防火墙中开放 3000 端口；公网只需开放网站使用的 80/443 端口。

## 5. 配置 HTTPS 并验收

等 `www` DNS 解析到服务器后，在宝塔站点的「SSL」中申请并部署 Let's Encrypt 证书，随后开启强制 HTTPS。检查：

- `https://www.xuantiangame.com` 能打开主页；
- `https://www.xuantiangame.com/favicon.svg` 能显示玄字轨道图标；
- `https://www.xuantiangame.com/assets/xuantian.png` 能显示背景；
- 三个项目卡片分别能打开对应子域名，点赞接口可用；
- 重启 Node 项目或服务器后，主页仍能访问且点赞数据文件仍在。

若显示 502，先看宝塔 Node 项目日志并确认本机 `127.0.0.1:3000` 有响应；若页面可开但图片/API 失败，确认反向代理目标是根路径 `http://127.0.0.1:3000`，且上传时没有多套一层目录。证书申请失败通常先检查 `www` DNS 是否生效以及 80 端口是否可从公网访问。

## 文件更新

先停止 Node 项目，把新版本文件上传并覆盖 `public/`、`src/` 和 `package.json`，不要覆盖或删除 `data/reactions.json`；然后重新启动项目。保留服务器上的旧 ZIP 和点赞数据备份，确认新站正常后再清理旧版本。
