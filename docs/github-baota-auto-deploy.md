# GitHub 推送后由宝塔自动部署

目标流程：本机 `git push origin main` → GitHub Webhook 通知宝塔 Git 部署 → 宝塔拉取 `main` → Node 项目加载新版主页。面板版本的菜单名称可能略有差异；Git 部署的工作目录应与 Node 项目目录一致，Nginx 反向代理到 `127.0.0.1:3300`。本项目支持通过 `PORT` 环境变量覆盖默认端口。

## 零、让根域名和 www 同时可访问

在域名实际使用的 DNS 控制台（使用阿里云 DNS 时为「云解析 DNS」）添加或核对：

| 主机记录 | 类型 | 记录值 |
| --- | --- | --- |
| `@` | A | 运行宝塔的服务器公网 IPv4，以 ECS 控制台显示为准 |
| `www` | CNAME | `xuantiangame.com` |

也可以把 `www` 改成同一公网 IPv4 的 A 记录。两种方案任选一种，同一个 `www` 不要同时添加 A 和 CNAME。已有正确记录就不用重复添加，三个项目子域名的记录无需修改。TTL 使用默认值。

在 Windows PowerShell 验证：

```powershell
Resolve-DnsName xuantiangame.com -Type A
Resolve-DnsName www.xuantiangame.com -Type A
```

然后在宝塔同一个站点的「域名管理」中绑定 `xuantiangame.com` 和 `www.xuantiangame.com`，申请同时包含这两个名称的 HTTPS 证书。先验证两个域名都能访问，再按需设置根域名跳转到 `www`。DNS 解析、站点域名绑定、HTTPS 证书是三个分别需要配置的步骤。

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

如果 `git remote -v` 已显示正确地址，且当前分支已经是 `main`，跳过下面的初始化和添加远端步骤。先运行 `git status`，有待提交改动时才提交，然后执行 `git push -u origin main`。

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

本机推送密钥和服务器拉取密钥分别配置，优先检查服务器已有密钥。以下 `bash` 命令在宝塔终端执行，不是在本机 PowerShell 执行。

### 2.1 检查现有密钥

先在 Git 插件的「SSH 密钥／密钥管理」中查看现有密钥及路径。插件的密钥可能不在 root 的默认目录内；终端可辅助检查：

```bash
whoami
printf '%s\n' "$HOME"
ls -la "$HOME/.ssh"
ssh -G git@github.com | awk '/^(hostname|user|identityfile) / { print }'
```

输出中的 `identityfile` 是候选路径，不代表文件一定存在或已被成功选用。只复制 `.pub` 公钥，不要显示、上传或发送私钥内容，也不要覆盖已有密钥。

以实际私钥路径替换下面的 `/root/.ssh/id_ed25519`：

```bash
DEPLOY_KEY=/root/.ssh/id_ed25519
ls -l "$DEPLOY_KEY" "$DEPLOY_KEY.pub"
ssh-keygen -lf "$DEPLOY_KEY.pub"
cat "$DEPLOY_KEY.pub"
```

如果只有私钥，没有同名 `.pub`，使用以下命令推导并显示公钥，不会修改原私钥：

```bash
ssh-keygen -y -f "$DEPLOY_KEY"
```

GitHub 仓库打开 **Settings → Deploy keys → Add deploy key**，将公钥整行填入 Key，标题填 `Baota xuantiangame`，不勾选 **Allow write access**。

如果该密钥已经作为 GitHub 账号 SSH key 使用，并且该账号对本仓库有读取权限，可直接测试，不需要重复添加。如果它是另一个仓库的 Deploy key，GitHub 不允许直接复用同一把 Deploy key 到多个仓库；出现 `Key is already in use` 时保留旧密钥，为本项目在插件中新增一把专用密钥，再把新公钥添加到本仓库。

### 2.2 验证 GitHub 和仓库权限

```bash
ssh -i "$DEPLOY_KEY" -o IdentitiesOnly=yes -T git@github.com
```

首次连接需要核对 GitHub 官方公布的 SSH 主机指纹，再确认保存；指纹参考 <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints>。不要关闭主机指纹验证。

显示 `You've successfully authenticated, but GitHub does not provide shell access.` 表示身份验证成功；该测试即使成功也可能返回退出码 1。接着检查本仓库的实际读取权限：

```bash
GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o IdentitiesOnly=yes -o BatchMode=yes" git ls-remote --heads git@github.com:anqing-myh/xuantiangame.git main
```

应显示 `<提交哈希> refs/heads/main`。没有任何输出可能是仓库尚无 `main` 分支，先从本机推送。`Permission denied (publickey)` 通常是密钥选择或授权问题；`Repository not found` 需要检查仓库地址以及密钥是否获准读取本仓库。如果私钥有口令，无人值守部署还需要插件支持解锁或 SSH agent，交互测试通过不等于后台能够自动拉取。

### 2.3 在宝塔添加仓库和部署目录

宝塔有不同版本的 Git 管理器或 Git 部署插件，菜单名称可能不同。先打开已经安装的插件；没有时再到「软件商店」查找安装。按插件实际提供的字段设置：

| 字段 | 填写值 |
| --- | --- |
| 名称 | `xuantiangame` |
| 仓库地址 | `git@github.com:anqing-myh/xuantiangame.git` |
| 认证方式 | SSH |
| SSH 密钥 | 选择刚才测试成功的现有密钥 |
| 分支 | `main` |
| 最终代码目录 | `/www/wwwroot/xuantiangame` |

有些插件将「父目录」和「项目名」分开填写，此时父目录为 `/www/wwwroot`，项目名为 `xuantiangame`；确认最终目录没有多套一层。

克隆前检查目标目录：

```bash
if [ -d /www/wwwroot/xuantiangame ]; then
  ls -la /www/wwwroot/xuantiangame
else
  printf '%s\n' '目标目录尚不存在，可以让 Git 插件创建。'
fi
```

已有文件时，先用宝塔文件管理器备份，再选一个新的空部署目录，例如 `/www/wwwroot/xuantiangame-git`，并让后续 Node 项目使用这个新路径。不要直接克隆到非空目录或执行强制清理。如果原目录本身已经是该仓库，优先使用插件提供的「导入已有仓库」功能。

点击「添加／克隆／部署」后验证（使用新目录时同步修改命令里的路径）：

```bash
git -C /www/wwwroot/xuantiangame remote -v
git -C /www/wwwroot/xuantiangame branch --show-current
git -C /www/wwwroot/xuantiangame log -1 --oneline
ls -la /www/wwwroot/xuantiangame
```

应能看到 `package.json`、`src/`、`public/` 和 `assets/`。终端以 root 测试成功，不代表以其他用户运行的 Git 插件同样有权限；插件必须以自己的运行用户成功完成一次拉取。

如果插件没有密钥选择功能，可在**插件实际运行用户**的 `~/.ssh/config` 中配置单独的主机别名，已有配置应编辑追加，不要覆盖：

```sshconfig
Host github-xuantian
    HostName github.com
    User git
    IdentityFile /实际私钥绝对路径
    IdentitiesOnly yes
```

然后将插件仓库地址改为 `git@github-xuantian:anqing-myh/xuantiangame.git`。别名仍指向同一个 GitHub 仓库，不影响本机 `origin`。需要先以相同运行用户验证：

```bash
git ls-remote --heads git@github-xuantian:anqing-myh/xuantiangame.git main
```

SSH 私钥及配置应由该用户可读且不允许其他用户读取私钥；通常 `.ssh` 目录权限为 700，私钥和 `config` 为 600。不要为解决权限问题把整个目录设为 777。

### 2.4 配置 Node 服务

Git 部署负责拉取代码，Node 项目管理器负责运行服务。在宝塔「网站 → Node 项目」或 Node 项目管理器中设置：项目路径为上述最终代码目录，启动方式 `npm start` 或启动文件 `src/server.js`，使用受支持的 Node.js LTS 版本（项目最低要求 Node.js 20），端口 **3300**，启用开机启动和异常重启。当前无第三方依赖，无需构建。`npm start` 是启动命令，不等于常驻进程管理器；应在该 Node 项目管理器中配置端口和自动重启。

同一主页只启动一个进程；已有该项目时修改原项目，不要再启动第二个服务占用同一端口。在 Node 项目环境变量中明确设置 `PORT=3300`。Nginx 站点绑定两个域名，把整个站点反向代理到 `http://127.0.0.1:3300`，否则点赞 API 无法工作。3300 不需要对公网开放。

点赞数据应放在仓库目录之外，避免代码部署覆盖或清理运行数据。例如在服务器创建 `/www/wwwroot/xuantiangongzuozhan-data/`，将该目录写权限授予 Node 项目运行用户，并在宝塔 Node 项目的环境变量中设置：

```text
PORT=3300
DATA_FILE=/www/wwwroot/xuantiangongzuozhan-data/reactions.json
```

根据服务器现状，三个 Node 进程以 `www` 用户运行，主页应作为独立的 systemd 服务管理。先确认宝塔 Git 插件部署目录中的 Node 可执行文件路径与版本；目前服务器进程显示的路径是 `/www/server/nodejs/v26.13.1/bin/node`。如果游戏服务的 systemd 单元名不清楚，可按 PID 查询：

```bash
systemctl status 81707 --no-pager
systemctl status 91591 --no-pager
systemctl status 91722 --no-pager
systemctl list-units --type=service --all
systemctl list-unit-files --type=service
```

`systemctl status <PID>` 会尝试显示托管该 PID 的 unit。之前按服务名称筛选 `node|xuantian` 没有匹配，只说明单元名称不含这些字样，不代表没有 systemd 服务。`npm start` 只是运行 `package.json` 中的启动命令；`pm2 list` 为空也说明 root 的 PM2 当前没有管理这些 Node 进程。

在宝塔终端以 root 创建单独的主页 unit。若点赞数据已存在，先备份后迁移到仓库外的数据目录；首次部署可直接创建目录：

```bash
install -d -m 0750 -o www -g www /www/wwwroot/xuantiangongzuozhan-data
cat > /etc/systemd/system/xuantiangame.service <<'UNIT'
[Unit]
Description=Xuantian homepage Node service
After=network.target

[Service]
Type=simple
User=www
Group=www
WorkingDirectory=/www/wwwroot/xuantiangame
Environment=NODE_ENV=production
Environment=PORT=3300
Environment=DATA_FILE=/www/wwwroot/xuantiangongzuozhan-data/reactions.json
ExecStart=/www/server/nodejs/v26.13.1/bin/node /www/wwwroot/xuantiangame/src/server.js
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now xuantiangame.service
systemctl status xuantiangame.service --no-pager
curl -I http://127.0.0.1:3300/
```

`ExecStart` 使用服务器进程输出中已有的 Node 26.13.1 路径；如果该文件不存在，先用 `command -v node` 检查宝塔 Node.js 安装路径并相应修改 unit。这个项目没有依赖或构建步骤，不需要运行 `npm install`。

确认 unit 运行后，在宝塔 Git 插件的**部署后脚本**中填写以下内容。`systemctl restart` 需要 root 权限，确认部署脚本以 root 执行；不要对外开放 3300 端口。

```bash
APP_DIR="/www/wwwroot/xuantiangame"
cd "$APP_DIR" || exit 1

test -f package.json || exit 1
test -f src/server.js || exit 1
export PATH="/www/server/nodejs/v26.13.1/bin:$PATH"
npm test || exit 1
systemctl restart xuantiangame.service || exit 1
systemctl is-active xuantiangame.service >/dev/null 2>&1 || exit 1
```

若部署目录不同，修改 `APP_DIR`；若 Node 版本路径不同，同步修改 `PATH`。只更改静态文件通常刷新即可生效；部署脚本会统一重启主页服务。

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

- 根域名和 `www` 均解析到宝塔服务器，并在同一个站点绑定；`www` 可以是指向根域名的 CNAME。
- 云安全组对公网开放 80/443；Node 的 3300 端口只供本机 Nginx 访问。
- HTTPS 证书同时包含根域名和 `www`，宝塔反向代理目标为 `http://127.0.0.1:3300`。
- `DATA_FILE` 所在目录可写且不在 Git 工作目录中，并纳入备份。
- 手动在宝塔拉取一次仓库、重启一次 Node 项目，再模拟一次 `git push` 验证自动更新。
