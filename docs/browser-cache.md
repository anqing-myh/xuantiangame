# 浏览器图片缓存

背景图约 1.58 MB。Node 会为 HTML 预加载链接、CSS 背景和项目卡片图片自动添加基于内容的版本号，例如 `/assets/xuantian.png?v=...`。版本链接返回 `Cache-Control: public, max-age=31536000, immutable`，浏览器通常在一年内直接复用本地图片。修改图片并部署重启后，版本链接自动变化。

HTML、CSS、JS、未携带正确版本号的图片采用 `no-cache` 和 ETag：浏览器可保存副本，每次使用先校验；未变化时服务器返回无正文的 304。HTML 和 CSS 的 ETag 根据添加版本号后的内容生成，因此更换图片也会触发对应资源更新。点赞 API 使用 `no-store`。

## 宝塔 Nginx 配置

原配置的 `expires 1m` 会覆盖上游缓存策略。推送代码自动部署后，在宝塔当前站点的反向代理配置中，将 `#PROXY-START/` 与 `#PROXY-END/` 之间的内容替换为下面配置，保存时让宝塔检测并重载 Nginx：

```nginx
location ^~ /
{
    proxy_pass http://127.0.0.1:3300;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    expires off;
    proxy_cache off;
}
```

该配置将缓存策略交给 Node，不再设置统一的 `expires 1m` 或 `add_header Cache-Control`。网站上层或其他配置中也不应隐藏、覆盖 Node 的 `Cache-Control` / ETag，或忽略图片 URL 的查询参数。

## 验证

推送后首次访问主页，在浏览器 F12 → Network 中确认未勾选 Disable cache。筛选 `xuantian`，应看到带 `?v=...` 的图片请求，其响应头包含一年缓存策略。关闭页面重新打开，或正常刷新，图片通常显示来自 memory cache / disk cache；有条件校验时也可能返回 304。不要使用强制刷新测试缓存。

浏览器存储清理、无痕模式和强制刷新可能导致重新下载，不能保证永久只下载一次。根域名和 www 是不同来源，建议在宝塔中将其中一个重定向到另一个，统一访问入口。
