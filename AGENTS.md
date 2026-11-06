# Vue 后台开发准则

面向从空项目搭建的 Vue 后台。本文版本表用于新项目选型；已存在的项目以 `package.json`、`pnpm-lock.yaml` 为实际版本，依赖升级单独实施。

## 当前阶段

`v2` 已完成阶段 0–6。Vite、TypeScript、ESLint、Prettier、源码别名、应用入口、开发代理、真实的 `src/utils/request.ts` 和最小视觉系统已落地。登录、路由、Pinia 会话和布局已接入；访问令牌仍只由请求层保存。用户管理已接真实接口，其他菜单页仍是占位页。登录相关 API 定义属于后端契约，请求层只负责传输、解包和 Bearer 注入。

## 技术栈与版本基线

查询日期：**2026-11-06**。下表依据 npm 注册表的稳定 `latest` 版本；Node.js 采用最新 LTS，TypeScript 因兼容要求单独选版。初始化按本次查询结果安装，实际安装版本以 `package.json` 与 `pnpm-lock.yaml` 为准。

| 用途 | 包 / 工具及版本 |
| --- | --- |
| 运行环境 | Node.js **26.13.0 LTS**；`@types/node` **26.6.6** |
| 包管理 | `pnpm` **12.18.0** |
| Vue | `vue` **3.5.45** |
| 路由 | `vue-router` **5.4.0** |
| 状态管理 | `pinia` **4.1.0**；必需 peer `@vue/devtools-api` **8.2.1** |
| HTTP | `axios` **1.21.0** |
| TypeScript | 选用 **6.0.3**；最新稳定版 **7.0.2** 暂不采用，原因见下文 |
| 构建 | `vite` **8.3.6**；`@vitejs/plugin-vue` **6.0.10** |
| 组件源码生成 | `shadcn-vue` CLI **2.9.0** |
| 交互基础 | `reka-ui` **2.11.0** |
| 样式 | `tailwindcss`、`@tailwindcss/vite` 均为 **4.3.4**；`tw-animate-css` **1.4.0** |
| 字体 | `@fontsource-variable/ibm-plex-sans` **5.3.0**（OFL，自托管拉丁文；中文使用系统字体） |
| 反馈 | `vue-sonner` **2.0.9** |
| 表格 | `@tanstack/vue-table` **9.3.1** |
| UI 配套 | `@vueuse/core` **15.0.0**；`cn` **0.5.2**；`class-variance-authority` **0.7.1** |
| 图标 | `@lucide/vue` **1.70.0** |
| Vue 类型检查 | `vue-tsc` **3.3.14** |
| ESLint | `eslint` **10.14.0**；`@eslint/js` **10.0.1** |
| Vue / TS 检查 | `eslint-plugin-vue` **10.12.0**；`vue-eslint-parser` **10.4.1**；`typescript-eslint` **8.72.1** |
| 格式化 | `prettier` **3.9.10**；`eslint-config-prettier` **10.1.8** |
| 测试 | `vitest` **5.1.0** |
| ESLint 运行环境 | `globals` **17.14.0** |

- **优先最新稳定且相互兼容的版本**，不使用 alpha、beta、rc、canary 或 nightly。初始化、增库或升级前重新查询，不能将本表视为永久最新；普通功能开发不顺带升级依赖。
- `typescript-eslint@8.72.1` 声明支持 `typescript >=4.8.4 <6.1.0`，因此当前选用范围内最新稳定版 **6.0.3**；待工具链正式支持 TypeScript 7 后再评估升级。依据：[官方兼容说明](https://typescript-eslint.io/users/dependency-versions/)。
- 使用 pnpm，直接依赖固定确切版本并提交锁文件，`packageManager` 固定 pnpm 版本；Node.js 与类型包保持主版本一致。Node 版本依据：[官方 LTS 列表](https://nodejs.org/en/about/previous-releases)、[26.x 发布清单](https://nodejs.org/dist/latest-v26.x/SHASUMS256.txt)。
- UI 配套按组件实际导入安装。shadcn-vue 生成的组件放在 `src/components/ui/`，页面不从 `shadcn-vue` 包导入组件。该包仍是直接依赖，因为 `src/styles/globals.css` 要导入 `shadcn-vue/tailwind.css`。满足必需 peers，可选 peers 按需求引入；直接依赖 `@vue/compiler-sfc` 时与 Vue 保持同版。

## 组件与代码边界

- Vue 使用 `<script setup lang="ts">`，明确 Props、Emits 与接口数据类型；跨页面共享状态使用 Pinia，页面临时状态留在页面。
- `src/components/ui/` 存放 shadcn-vue 基础组件源码；`common/` 存放 ProTable、SearchForm 等通用组合；`business/` 存放业务组件；页面专用组件放在页面同级 `components/`。
- 优先通过组合、参数和插槽扩展已有组件；修改公共组件前检查调用方，不为尚未出现的需求设计抽象。
- API 定义放在 `src/api/`，统一使用 `src/utils/request.ts` 的 Axios 封装；组件不另建请求实例。

## 五条实现经验

1. **按实际版本开发并检查生成代码。** 查阅对应版本的官方文档和源码，不混用 TanStack Table v8 / v9 API；通用封装保持数据类型与响应式引用。shadcn 生成后核对源码、导入依赖与交互行为，不能把生成成功等同于实现完成。
2. **先统一视觉，再开发页面。** 在 `src/styles/` 集中维护颜色、字号、间距、圆角和密度等 tokens，通过组件 variants 与组合实现差异，避免逐页复制样式。Reka UI 提供交互基础；定制时保留语义、标签关联、键盘操作和焦点管理。
3. **统一封装表格的数据行为。** 明确分页、排序和筛选由前端还是服务端处理；服务端分页时不能只对当前页排序。筛选后重置页码，勾选使用稳定业务 ID，明确跨页选择规则，并防止旧请求覆盖新结果。
4. **处理保存的部分成功。** 一次提交涉及多个独立接口时，等待请求结束，明确哪些操作已成功、哪些失败，保留表单供重试；只有全部成功才提示完成。错误优先展示后端业务 `msg/message`，避免只显示通用 HTTP 错误。
5. **验收真实行为。** 类型检查之外，按改动范围验证真实接口的加载、空数据、失败重试、编辑回填和提交结果；使用真实长度的数据检查布局，并验证公共交互的键盘操作与焦点恢复。模拟接口验证需标明，不能冒充真实联调。

## 新增依赖的查找与选择

1. 先检查已有组件和依赖，仅为当前需求引入新库；说明缺少什么能力，不因示例使用某库就直接安装。
2. 联网查阅官方文档、对应版本源码及近期发布记录，核对维护状态和许可证；使用 `npm view <包名>@latest version engines peerDependencies peerDependenciesMeta --json` 查询版本与兼容要求，有冲突时查询兼容范围内的最高稳定版。
3. 优先 Vue / TypeScript 友好、可组合、视觉可控的方案，比较功能覆盖、依赖体积与维护成本，同类能力保持统一；复杂控件评估成熟实现与自行组合的成本。
4. 接入时记录用途、版本和兼容例外，使用 pnpm 同步清单与锁文件，更新本表及查询日期；新增或重新生成 shadcn 组件时检查文件与依赖差异，避免覆盖本地定制。

## 验证与交付

- 动手前声明 L0-T / L0-C / L0-V / L1 / L2 级别及验证命令，遵循上级测试策略。纯文档仅回读与 `git diff --check`，不编译、不测试；其他改动按风险验证，只为关键行为边界补测，不自行运行全量测试。
- 初始化时提供 `type-check`、`lint`、`format`、`build` 脚本；lint 默认只读，格式化显式执行。ESLint 与 Prettier 各司其职，避免格式规则冲突；局部修改只检查或格式化相关文件。
- 使用 UTF-8、LF、两空格缩进、单引号与无分号，不手改自动生成的类型声明。交付说明改动、验证结果和未完成事项。
