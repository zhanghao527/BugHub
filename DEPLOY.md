 # 部署到自己的服务器
 
 适用于一台装有 Node.js 18.17+（推荐 20+）、Nginx 的 Linux 服务器，域名 bughub.vip 已解析到该服务器。无需数据库。
 
 ## 1. 拉取代码（含内容 submodule）
 
 ```bash
 git clone --recursive <本仓库地址> /var/www/bughub
 cd /var/www/bughub
 # 若忘了 --recursive：
 git submodule update --init
 ```
 
 ## 2. 环境变量（可选）
 
 ```bash
 cp .env.example .env
 ```
 
 内容仓库是公开的，通常无需任何配置即可运行。如需自定义见 README 的「环境变量」。常用一项：
 
 ```
 REVALIDATE_SECRET=一段随机串 # 保护即时刷新接口 /api/revalidate
 ```
 
 ## 3. 安装依赖并构建
 
 ```bash
 npm install
 npm run build
 ```
 
 ## 4. 启动（PM2 常驻）
 
 ```bash
 npm i -g pm2
 pm2 start npm --name bughub -- start
 pm2 save
 pm2 startup
 ```
 
 默认监听 3000 端口。
 
 ## 5. Nginx 反向代理 + HTTPS
 
 参考 deploy/nginx.conf.example，写入 /etc/nginx/conf.d/bughub.conf，然后：
 
 ```bash
 nginx -t && systemctl reload nginx
 certbot --nginx -d bughub.vip -d www.bughub.vip
 ```
 
 ## 6. 内容更新（时效说明）
 
 网站运行时直接读 GitHub 内容仓库，更新分三种时效：
 
 - 自动（默认）：往 bughub-content 仓库 push 后，最多 5 分钟站点自动刷新（Next ISR）。
 - 即时：给内容仓库配一个 GitHub Webhook，Payload URL 指向 https://bughub.vip/api/revalidate（若设了 REVALIDATE_SECRET 则加 ?secret=xxx），事件选 push。每次 push 后站点立刻刷新；也可手动 curl 该地址触发。
 - 应用代码更新：
 
 ```bash
 cd /var/www/bughub
 git pull
 npm install
 npm run build
 pm2 restart bughub
 ```
 
 ## 说明
 
 - 服务器需能访问 github.com 与 raw.githubusercontent.com。
 - 若 GitHub 暂时不可达，会自动回退到本地 submodule 那份内容（部署时随代码一起拉下来的）。要让兜底数据保持最新，可定期 git submodule update --remote。
 - 修改 .env 后需 pm2 restart bughub 才生效。
 
