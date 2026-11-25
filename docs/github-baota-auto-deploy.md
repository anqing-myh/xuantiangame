# GitHub 推送后由宝塔自动部署

目标流程：本机 `git push origin main` → GitHub Webhook 通知宝塔 Git 部署 → 宝塔拉取 `main` → Node 项目加载新版主页。面板版本的菜单名称可能略有差异；Git 部署的工作目录应与 Node 项目目录一致，Nginx 仍反向代理到 `127.0.0.1:3000`。

## 一、本机配置 GitHub SSH 并首次推送

先确认 GitHub 仓库是空仓库（不要预先勾选 README、License 或 .gitignore），然后在 PowerShell 执行：

```powershell
ssh -T git@github.com
```

如果提示认证成功，可直接继续。如果没有可用密钥，检查 `C:\Users\你的用户名\.ssh\` 是否已有 `id_ed25519.pub`。优先复用已经添加到 GitHub 的公钥；若没有，再执行：

```powershell
ssh-keygen -t ed25519 -C "你的 GitHub 邮箱"
```

接受默认密钥路径后，显示公钥并将整行复制到 GitHub：

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

在 GitHub 的个人设置 **Settings → SSH and GPG keys → New SSH key** 添加这把本机公钥，再次运行 `ssh -T git@github.com` 验证。私钥 `id_ed25519` 不要上传或粘贴到 GitHub。

进入本项目目录后首次关联并推送：

```powershell
Set-Location D:\xuantiangame
git init -b main
git config user.name "你的 GitHub 用户名"
git config user.email "你的 GitHub 邮箱"
git add -A
git commit -m "Add Xuantiangongzuozhan homepage"
git remote add origin git@github.com:anqing-myh/xuantiangame.git
git push -u origin main
```

仓库里的 `.gitignore` 会排除 `data/`、`.env` 和日志文件，不会把本机点赞数据或本地配置推上去。若 GitHub 仓库已经有 README 等提交，首次推送可能提示远端领先；不要强推覆盖。可先把仓库克隆到临时目录并合并，或新建一个空仓库再按上述步骤关联。

以后每次修改后执行：

```powershell
Set-Location D:\xuantiangame
git status
git add -A
git commit -m "描述本次修改"
git push
```

## 二、让宝塔能读取私有仓库

本机推送密钥与宝塔服务器读取仓库的密钥是两把不同的钥匙。不要把本机私钥上传到服务器。

1. 在宝塔软件商店安装并打开 **Git 管理器**。在插件的 SSH 密钥管理处生成密钥，或使用插件提供的部署密钥功能。
2. 复制宝塔生成的 `.pub` 公钥。在 GitHub 仓库 **Settings → Deploy keys → Add deploy key** 添加，标题可写 `Baota read-only deploy`，保持只读，不勾选写权限。
3. 宝塔 Git 管理器添加仓库，仓库地址填写 `git@github.com:anqing-myh/xuantiangame.git`，分支填写 `main`，部署目录例如 `/www/wwwroot/xuantiangame`。
4. 如果这个目录已有手动上传的文件，不要直接让 Git 克隆覆盖。先在宝塔文件管理器备份当前目录，再让 Git 管理器部署到一个新的空目录；确认后把 Node 项目路径改到该目录。
5. 确认宝塔可以成功克隆并看到 `package.json`、`src/`、`public/`、`assets/`。Git 部署负责拉取代码，Node 项目管理器负责运行 `npm start`，Nginx 网站继续把请求代理到 `http://127.0.0.1:3000`。

点赞数据应放在仓库目录之外，避免代码部署覆盖或清理运行数据。例如在服务器创建 `/www/wwwroot/xuantiangongzuozhan-data/`，将该目录写权限授予 Node 项目运行用户，并在宝塔 Node 项目的环境变量中设置：

```text
PORT=3000
DATA_FILE=/www/wwwroot/xuantiangongzuozhan-data/reactions.json
```

如宝塔 Git 管理器提供“部署后命令/部署脚本”，配置为重启对应的 Node 项目；如果没有该选项，在每次部署后从 Node 项目管理器点击重启。HTML、CSS、JavaScript 图片等静态文件由服务按请求读取，通常推送后刷新页面即可生效；`src/server.js` 等后端代码更新需要重启进程。

## 三、配置推送触发部署

1. 在宝塔 Git 管理器的该仓库设置中开启自动部署/Webhook，生成或复制它提供的回调 URL 和密钥。不要把宝塔面板登录密码当作 Webhook 密钥。
2. 在 GitHub 仓库打开 **Settings → Webhooks → Add webhook**：
   - **Payload URL**：填写宝塔 Git 管理器提供的回调 URL；
   - **Content type**：`application/json`；
   - **Secret**：填写与宝塔配置相同的随机密钥（若插件提供）；
   - **Which events**：选择 `Just the push event`；
   - 勾选 **Active** 并保存。
3. 在 GitHub Webhooks 页面查看 Recent Deliveries。先点一次 **Redeliver** 或推一个小改动，确认返回成功；同时查看宝塔 Git 管理器的部署记录和 Node 项目日志。
4. 确认 `https://www.xuantiangame.com` 更新后，再提交正式修改。

如果宝塔插件没有 Webhook 自动部署功能，不要公开宝塔面板端口或面板密码来凑回调；使用受限来源与密钥的自动部署方案，或先从宝塔手动点击“拉取/部署”。面板插件的按钮名称与自动重启能力会随版本不同。

## 四、上线前检查

- `www.xuantiangame.com` 的 DNS A 记录指向宝塔服务器；此前从当前网络检查时该主机名尚不能解析。
- 云安全组对公网开放 80/443；Node 的 3000 端口只供本机 Nginx 访问。
- HTTPS 证书已部署，宝塔反向代理目标为 `http://127.0.0.1:3000`。
- `DATA_FILE` 所在目录可写且不在 Git 工作目录中，并纳入备份。
- 手动在宝塔拉取一次仓库、重启一次 Node 项目，再模拟一次 `git push` 验证自动更新。
