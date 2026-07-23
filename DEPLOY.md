# 部署到宝塔（BT 面板）服务器

面向：腾讯云轻量应用服务器 + 宝塔 Linux 面板 + 域名 `bughub.vip`。
架构：Next.js 应用用 PM2/宝塔 Node 项目常驻在 `127.0.0.1:3000`，宝塔「网站」用 Nginx 反向代理并签发 HTTPS；数据用本地 SQLite，存放在站点目录之外。

主站 `bughub.vip` 完全匿名只读；后台在独立子域 `admin.bughub.vip`，需账号密码登录。两个域名都反代到同一个应用（`127.0.0.1:3000`），应用根据 Host 区分。

## 0. 前置准备

1. **DNS 解析**（在你的域名服务商处，指向服务器公网 IP）：
   - `bughub.vip` → A 记录 → 服务器 IP
   - `www.bughub.vip` → A 记录 → 服务器 IP
   - `admin.bughub.vip` → A 记录 → 服务器 IP
2. **放行端口 80/443**：腾讯云控制台「防火墙」和宝塔面板「安全」里都要放行。
3. **宝塔软件商店**：确保安装了 Nginx；用「Node.js 版本管理器」安装 Node 20 LTS（含 npm）。

## 1. 获取代码

把项目放到 `/www/wwwroot/bughub`（二选一）：

- 用宝塔「文件」上传解压；或
- 若代码已推到 Git 仓库，用宝塔终端 `git clone <你的仓库地址> /www/wwwroot/bughub`。

> 注意：本地未提交/未推送的改动不会出现在服务器上，先确保服务器拿到的是最新代码。

## 2. 持久化数据目录

数据库放到站点目录之外，避免更新代码时被覆盖：

```bash
mkdir -p /www/bughub-data
```

## 3. 环境变量

在 `/www/wwwroot/bughub` 下创建 `.env`：

```text
BUGHUB_DATABASE_PATH=/www/bughub-data/bughub.sqlite
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=在服务器上生成后粘贴
ADMIN_SESSION_SECRET=在服务器上生成后粘贴
ADMIN_HOST=admin.bughub.vip
PUBLIC_SITE_URL=https://bughub.vip
```

**密钥请在服务器上生成，不要外传：**

```bash
cd /www/wwwroot/bughub
# 生成密码哈希（把 '你的强密码' 换成真实密码）
npm run admin:hash-password -- '你的强密码'
# 生成会话密钥
openssl rand -base64 48
```

把两条命令的输出分别填入 `ADMIN_PASSWORD_HASH` 和 `ADMIN_SESSION_SECRET`。`ADMIN_PASSWORD_HASH` 形如 `scrypt$...$...`。

## 4. 安装依赖与构建

```bash
cd /www/wwwroot/bughub
npm ci
npm run build
```

`better-sqlite3` 是原生模块。多数 Node 20 Linux 环境会用预编译产物；若报编译错误，需先装编译工具链（`gcc-c++`、`make`、`python3`）。

首次构建会自动初始化数据库并导入种子（18 个一级分类、72 个二级分类、144 条已发布内容）。已有数据库不会被覆盖。

## 5. 启动应用（常驻 3000 端口）

推荐用宝塔「Node 项目」：
- 项目目录 `/www/wwwroot/bughub`，Node 版本 20，启动方式选「npm 脚本」→ `start`（即 `next start`），端口 `3000`，开启守护/开机自启。

或用命令行 PM2：

```bash
cd /www/wwwroot/bughub
npm install -g pm2
pm2 start npm --name bughub -- start
pm2 save
pm2 startup   # 按提示执行输出的命令，实现开机自启
```

应用默认监听 3000。SQLite 已启用 WAL 与 5 秒 busy timeout，单实例运行即可。

## 6. 宝塔配置两个网站（反代 + HTTPS）

在宝塔「网站」里建**两个**站点，都反代到同一个应用：

**站点 A：主站**
1. 添加站点，域名填 `bughub.vip` 和 `www.bughub.vip`（纯静态站即可，不用建数据库）。
2. 站点设置 →「反向代理」→ 新增：目标 URL `http://127.0.0.1:3000`，发送域名（Host）保持默认透传（宝塔默认 `proxy_set_header Host $host`，务必保留）。
3. 「SSL」→ Let's Encrypt 申请证书，勾选 `bughub.vip`、`www.bughub.vip`，开启「强制 HTTPS」。

**站点 B：后台子域**
1. 添加站点，域名填 `admin.bughub.vip`。
2. 同样加「反向代理」到 `http://127.0.0.1:3000`，保持透传 Host。
3. 「SSL」→ Let's Encrypt 为 `admin.bughub.vip` 申请证书，开启「强制 HTTPS」。

> 关键：两个站点都必须透传原始 Host。应用靠 Host 判断是否后台域名——主站 Host 不会命中后台，后台子域才会进入 `/admin`。

## 7. 验证

- 访问 `https://bughub.vip`：主站匿名可浏览，正常。
- 访问 `https://bughub.vip/admin`：应返回 404（生产环境主域不暴露后台）。
- 访问 `https://admin.bughub.vip`：跳转到登录页；用 `ADMIN_USERNAME` + 你设置的密码登录后，可新建/编辑/删除内容。
- 新建一条内容后，回主站刷新应能看到（出现在「未分类」栏目下）。

## 8. 更新应用

```bash
cd /www/wwwroot/bughub
# 更新代码（git pull 或重新上传）
npm ci
npm run build
# 重启：宝塔 Node 项目点「重启」，或命令行：
pm2 restart bughub --update-env
```

数据库读取不走长缓存，刷新页面即可看到内容改动。

## 9. 备份与恢复

更新或维护前先备份数据库：

```bash
mkdir -p /www/backup/bughub
sqlite3 /www/bughub-data/bughub.sqlite ".backup /www/backup/bughub/bughub-$(date +%Y%m%d-%H%M%S).sqlite"
```

恢复：停应用 → 用备份覆盖 `/www/bughub-data/bughub.sqlite` → 重启应用。

## 常见问题

- **改了 `.env` 不生效**：重启应用（`pm2 restart bughub --update-env` 或宝塔 Node 项目「重启」）。修改 `ADMIN_SESSION_SECRET` 会让所有已登录会话失效。
- **`admin.bughub.vip` 打不开后台 / 一直 404**：检查该站点反代是否透传了原始 Host、`ADMIN_HOST` 是否等于 `admin.bughub.vip`。
- **登录页提示「认证尚未配置完整」**：`ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` / `ADMIN_SESSION_SECRET` 三者有缺失或格式不对（会话密钥需至少 32 位）。
- **`better-sqlite3` 安装报错**：装 `gcc-c++`、`make`、`python3` 后重试 `npm ci`。
