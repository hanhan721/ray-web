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
| `dev-review-loop` | 本项目维护 | 手动触发，按功能批次开发、独立 Review、修复与复审 |

上游快照日期：**2026-11-06**。上表注明上游来源的技能保留原样；升级时按来源核对文件清单，
不要手改上游 `SKILL.md` 的 frontmatter。`dev-review-loop` 为项目自维护技能，可按实际使用反馈调整。

## 手动开发与审查闭环

`dev-review-loop` 为项目维护的轻量流程，正文见 [SKILL.md](skills/dev-review-loop/SKILL.md)。
它与其他技能共用 `.agents/skills`，通过 `disable-model-invocation: true` 关闭 Cursor 与 OpenCode V2 的自动匹配，只有手动调用才启用。

| 客户端 | 调用入口 |
| --- | --- |
| Cursor | `/dev-review-loop <任务目标或阶段范围>`，原生技能入口，无需重复复制到 `.cursor/skills` |
| OpenCode V2 | `/dev-review-loop <任务目标或阶段范围>`，由 `.opencode/commands/dev-review-loop.md` 在主会话加载共享技能 |
| OpenCode V2 直接调用 | `@dev-review-loop <任务目标或阶段范围>`，显式加载技能 |

例如：`/dev-review-loop 完成阶段 4 的登录、路由和状态管理`。调用范围以本次目标为准；创建技能本身不启动开发。
主 Agent 持续开发，功能批次完成后调用一个独立 Reviewer；L0 轻改沿用项目检查策略，每批默认最多 3 次 Review，不强制 TDD、不自行运行全量测试。
Reviewer 的只读要求通过任务指令传达，本技能不新增 Agent 权限配置或常驻进程。未暴露原生子 Agent 工具时明确记录独立审查未完成，不能用角色扮演代替。
若客户端列表尚未更新，刷新技能列表或重新打开会话；未在客户端实测前，不把文件配置完成描述为运行验证通过。

格式依据：[Cursor Skills](https://cursor.com/docs/skills)、[OpenCode V2 Skills](https://opencode.ai/v2/docs/skills)、[OpenCode V2 Commands](https://opencode.ai/v2/docs/commands)。

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
  当前 `components.json` 已存在；以实际配置、`AGENTS.md` 和实现计划中的当前阶段为准。
- Playwright MCP 首次运行会下载浏览器到用户级缓存 `%LOCALAPPDATA%\ms-playwright`，
  与 Node 版本无关。
