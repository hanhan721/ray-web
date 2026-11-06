# AI 前端开发工具（项目级）

本目录只存放 AI 编码客户端的 Skills 与配置，不含业务代码。

## Skills

Skills 放在 `.agents/skills/<id>/SKILL.md`，这是单一副本：

- **Cursor** 自动发现项目级目录 `.agents/skills`（也认 `.cursor/skills/`，本仓库只用这一份）；
- **OpenCode v2** 自动发现项目级兼容性目录 `.agents/skills`；
- **Codex** 自动发现仓库级目录 `.agents/skills`（从工作目录向上扫描到仓库根）。

因此三个客户端共用同一份文件，不重复、不产生同名 ID 覆盖。目录内的 `references/`、`rules/`、
`*.md` 是 SKILL.md 引用的支持文件，不会被当作独立 Skill。

| Skill ID | 来源 | 用途 |
| --- | --- | --- |
| `shadcn-vue` | `unovue/shadcn-vue` `dev` 分支 `skills/shadcn-vue/` | shadcn-vue 组件查找、安装、组合、主题与 CLI |
| `vue-best-practices` | `vuejs-ai/skills` `main` 分支 `skills/vue-best-practices/` | Vue 3、Composition API、响应式、组件设计 |
| `vue-router-best-practices` | 同上 | 项目已依赖 `vue-router`，补充路由与守卫实践 |
| `vue-pinia-best-practices` | 同上 | 项目已依赖 `pinia`，补充 Store 与状态实践 |
| `frontend-design` | `anthropics/skills` `main` 分支 `skills/frontend-design/` | UI 视觉设计、布局与交互质感（含 `LICENSE.txt`） |

快照日期：**2026-11-06**。以上文件均为上游原样副本；升级时按上表重新拉取并核对文件清单，
不要手改 `SKILL.md` 的 frontmatter。

## MCP

| 客户端 | 配置文件 | 说明 |
| --- | --- | --- |
| Cursor | `.cursor/mcp.json` | `mcpServers` 下定义 `shadcn`、`playwright`；与用户级 `~/.cursor/mcp.json` 合并，同名时项目配置优先 |
| OpenCode v2 | `opencode.jsonc`（项目根） | `mcp.servers` 下定义 `shadcn`、`playwright` |
| Codex | `.codex/config.toml` | `[mcp_servers.*]` 表，仅在受信任项目加载 |

两个 Server 都用 `npx -y <pkg>@latest` 启动，**不是**项目依赖，不写入 `node_modules`、
`package.json` 或锁文件；包只临时落在 npm 缓存。启动时的 Node 版本由启动客户端的 PATH 与
工作目录决定：从已激活 mise 的 shell、在项目根启动时会按 `mise.toml` 使用 Node 26.13.0；
从其他环境启动可能落到机器的其他 Node 版本（两个包均兼容 Node 18+）。

**OpenCode 侧的代理覆盖**：本机 OpenCode 服务进程给子进程注入了没有协议头的
`HTTP_PROXY` / `HTTPS_PROXY`（`127.0.0.1:8800`），npm 11 在解析 `@latest` 时会抛
`ERR_INVALID_URL`。因此 `opencode.jsonc` 里给这两个 Server 显式清空了四个代理变量，
让 npm 直连 registry（已验证 `npm ping` 可达）。这是环境相关的补丁：若宿主机改用
带 `http://` 前缀的合法代理，或本机确实必须走代理才能联网，请删除这两段 `environment`；
届时也可以选择在宿主机把 `HTTPS_PROXY` 修成 `http://127.0.0.1:8800`。Cursor 与 Codex 未加此覆盖：
Cursor 由编辑器进程启动 MCP，Codex CLI 从用户 shell 启动，两者继承的都不是 OpenCode 那套无协议头代理。

## 前置条件

- Codex 需要把本仓库标记为**受信任项目**，否则忽略 `.codex/config.toml`。
- shadcn-vue Skill 与 MCP 在存在 `components.json` 后才能读取项目配置并安装组件。
  当前项目尚未初始化 UI，因此本次未创建 `components.json`。
- Playwright MCP 首次运行会下载浏览器到用户级缓存 `%LOCALAPPDATA%\ms-playwright`，
  与 Node 版本无关。
