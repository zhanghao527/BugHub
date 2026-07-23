# bughub-mcp

把 BugHub 常见 Bug 库接入到 AI 编码 / 测试流程的 MCP 服务。它通过 HTTP 只读访问 BugHub 站点，让 AI 在写代码或写测试用例前，能检索这套按失效机制分类的常见坑并对照自查。

## 工具

- `list_taxonomy`：列出全部分类（一级失效机制 + 二级模式 + 数量）。
- `search_bugs`：按关键词 / 领域 / 失效模式 / 分类 / 严重度检索，返回场景、根因、测试要点。
- `get_bug`：按编号（如 `BH-1017`）取单条完整详情。
- `review_context`：输入正在实现的功能描述，召回最相关的历史坑，用于动手前规避、动手后自查。

## 要求

- Node.js ≥ 18（自带 fetch）。
- 数据来自 BugHub 站点的只读接口，无需本地数据库。

## 配置

在你的 AI 客户端 MCP 配置里加入（以 Kiro 的 `mcp.json` 为例）：

```json
{
  "mcpServers": {
    "bughub": {
      "command": "node",
      "args": ["/绝对路径/bughub-mcp/server.mjs"],
      "env": {
        "BUGHUB_API_BASE": "https://bughub.vip"
      }
    }
  }
}
```

### 环境变量

- `BUGHUB_API_BASE`：BugHub 站点地址，默认 `https://bughub.vip`。本地开发可设为 `http://localhost:3000`。
- `BUGHUB_TIMEOUT_MS`：单次请求超时，默认 `15000`。

## 本地自测

先启动 BugHub 站点（`npm run dev`），再把 `BUGHUB_API_BASE` 指向 `http://localhost:3000` 启动本服务。

## 说明

服务只读，不会修改 BugHub 数据。数据源是公开的常见 Bug 知识库。
