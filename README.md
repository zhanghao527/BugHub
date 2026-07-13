 # BugHub
 
 一个面向公众分享的个人 bug 知识库。把踩过的每一个线上缺陷记录成一篇 Markdown：现象、根因、复现步骤、当初该测什么、修复方案，按大类 / 小类归档。
 
 在线地址：https://bughub.vip
 
 ## 架构
 
 - 前端与服务端：Next.js 14（App Router）+ TypeScript + Tailwind CSS
 - 内容：全部存放在独立的 GitHub 仓库 bughub-content，目录即分类，一个 .md 文件就是一道 bug
 - 数据读取：运行时直接从 GitHub 解析内容（git trees API 列目录 + raw 读文件），用 gray-matter 解析 frontmatter
 - 缓存：Next ISR，每 5 分钟自动刷新一次；也可通过 /api/revalidate 即时刷新
 - 无数据库、无后台、无登录：新增内容就是往 bughub-content 仓库提交一个 Markdown 文件
 
 ## 内容仓库
 
 内容仓库：https://github.com/zhanghao527/bughub-content
 
 目录结构：
 
 ```
 content/<大类>/<小类>/<slug>.md
 ```
 
 - 目录名用 NN- 前缀数字控制排序，展示时自动去掉前缀
 - 文件名（英文）作为详情页 URL 的 slug
 - frontmatter 字段：title / severity / stage / date / tags
 - 正文小节：## 现象 / ## 根因 / ## 复现步骤 / ## 当初该测什么 / ## 修复方案
 
 本仓库通过 git submodule 引用了内容仓库（bughub-content/），作为 GitHub 不可达时的本地兜底数据源。
 
 ## 新增一道 bug
 
 推荐直接在 GitHub 上操作：
 
 1. 在 bughub-content 仓库对应目录下新增一个 .md 文件
 2. 提交并 push
 3. 最多 5 分钟站点自动刷新；或访问 /api/revalidate 立即刷新
 
 ## 环境变量（均可选）
 
 - BUGHUB_REPO：内容仓库，默认 zhanghao527/bughub-content
 - BUGHUB_BRANCH：分支，默认 main
 - BUGHUB_CONTENT_PATH：内容根目录，默认 content
 - GITHUB_TOKEN：给 GitHub API 提高限额（公开仓库可不填）
 - REVALIDATE_SECRET：设置后 /api/revalidate 需带 ?secret=xxx
 - BUGHUB_CONTENT_DIR：本地兜底内容目录的绝对路径
 
 ## 本地开发
 
 ```bash
 npm install
 npm run dev
 ```
 
 打开 http://localhost:3000
 
 ## 部署
 
 见 DEPLOY.md（Node.js 18.17+，推荐 20+；PM2 + Nginx，无需数据库）。
 
