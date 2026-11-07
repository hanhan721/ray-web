# ray-web 后台管理系统 · 实现计划（AI 开发执行手册）

> 更新日期：2026-11-06
> 适用对象：**AI 驱动开发**。用户负责目标、业务规则和重大边界；AI 负责实现方案、日常工程取舍、验证与决策记录。
> 上位约束：用户当前授权、`AGENTS.md` 与全局测试策略。阶段 0–3 已于 2026-11-06 实施，验收证据见 §8。

---

## 0. AI 执行协议

### 信息来源与读取范围

| 信息 | 主要来源 | 本文的职责 |
| --- | --- | --- |
| 目标、业务规则与授权 | 当前会话、已确认的决策记录 | 记录结论与范围，不扩大授权 |
| 稳定工程准则、版本选型流程、测试策略 | `AGENTS.md` 与上级规则 | 引用并补充实施细节，避免复制整份准则 |
| 实际依赖与工具版本 | `package.json`、生成后的 `pnpm-lock.yaml`、`mise.toml` | 记录复核结果；版本表是选型快照，不代表已安装或已验证 |
| 后端契约 | `src/api/`、`src/types/`，必要时核对后端源码、文档或真实响应 | 提供索引；发现冲突先核实，不为通过检查伪造契约 |
| 实现顺序、工程默认方案、进度与验收证据 | 本文 §3、§5–§8 | 作为实施进度与项目决策的主要记录 |

首次进入任务时读取 `AGENTS.md`、本文执行协议、当前阶段与状态记录。后续按需读取相关 API、类型、调用方和技能参考，无需每阶段重复通读全部文件。开始前用当前代码和工作区状态核对进度，避免覆盖用户修改。

### 执行循环

```text
确认本次授权的目标与范围，读取当前状态
  → 声明改动级别（L0-T / L0-C / L0-V / L1 / L2）和验证命令
  → 按 §1 判断自主工作与真正需要确认的事项
  → 在目标范围内实施，记录影响后续开发的工程决策
  → 按风险验证，回读改动区域 + git diff --check
  → 更新阶段状态、验收证据、遗留事项，汇报进展
  → 前置条件满足且仍在授权范围内时，继续下一阶段
```

- **阶段是进度检查点，完成后汇报即可，不默认暂停等待下一条指令。** 用户仅授权某一阶段或文档修订时，完成该范围即交付。
- 已确认的决定持续有效，不重复询问；可逆的实现选择由 AI 判断并记录。
- 事实缺失只暂停依赖该事实的工作，继续其他独立任务；不能把假设写成已确认事实。
- 不在聚焦验证通过后自行扩大验证范围；不运行全量测试套件，除非用户明确要求；不为通过检查修改测试规格或后端契约。

### 需要确认时如何处理

先完成已授权且不依赖答案的工作，以及形成具体方案所需的调查。记录问题、证据、影响、推荐方案与可继续的任务，再提出最小必要问题。没有实际可行的第二方案时，不为凑数编造候选项。

回答写入决策记录，仅在需要时修订对应规则。涉及发布、覆盖或不可逆操作时，先准备可审阅结果，再在执行该动作前确认；已有授权无需重复获取。环境审批通过执行工具的审批机制办理。

---

## 1. 自主执行与人工确认边界

### A 类 · AI 自主执行并记录

| 范围 | 执行要求 |
| --- | --- |
| 业务页面、布局、空态、错误态、文案与页面组件 | 在用户目标、现有模式和可访问性要求内自主设计与实现 |
| shadcn 基础组件、公共组件与 composable | 可以新增、组合和调整；先检查现有能力与调用方，按职责提取，验证受影响行为 |
| tokens、主题、目录和前端内部类型 | 按实际需求补充并保持一致；约定变化时记录原因、范围与迁移结果 |
| 请求层、路由、Pinia 和前端权限呈现 | 遵循已核实后端契约；内部组织、状态所有权和错误处理属于正常工程判断 |
| 初始化配置、scripts、依赖和锁文件 | 在用户授权正式初始化或相应功能后，按 `AGENTS.md` 流程使用兼容稳定版本并记录差异 |
| 前端内部接口调整与公共能力提取 | 检查并同步调用方；契约变化按 L2 验证，不因文件位于公共目录就要求人工批准 |
| 局部修复、重构与性能优化 | 解决有证据的问题，不顺带增加无关抽象、升级或全仓改造 |

**存在多个合理方案，本身不构成人工闸门。** AI 依据需求、官方文档、现有代码与维护成本选择，在影响后续开发时记录理由。

### B 类 · 需要用户确认的事项

| 编号 | 条件 | 处理边界 |
| --- | --- | --- |
| B1 | 缺失或冲突的业务规则会改变用户可见结果 | 先调查已有上下文，无法确定时询问；普通布局与组件选择不属于此类 |
| B2 | 后端关键事实无法核实，或需要改变既有后端契约 | 例如凭据传递方式、刷新前提、权限含义、字段语义；只阻塞依赖该事实的链路 |
| B3 | 超出既定技术方向的重大迁移、付费服务或新的外部数据传输 | 提供具体方案、成本与迁移影响；按流程补普通依赖不属于此类 |
| B4 | 不可逆或对外生效的操作，且尚无相应授权 | 如删除真实数据、覆盖用户成果、发布生产环境；先准备可审阅结果 |
| B5 | 用户明确要求确认的特定动作，或实际环境审批限制 | 尊重已有授权和工具审批要求，不自行新增审批流程 |

不得通过弱化鉴权或权限要求绕过 B2。调整共享组件、补语义 token、增加前端路由、生成锁文件和补全导出均不单独触发确认。

---

## 2. 项目现状（2026-11-06 快照）

### 已有资产

| 类别 | 内容 |
| --- | --- |
| 后端契约 | `src/api/` 共 14 个 `.ts`：13 个模块和 `index.ts` |
| 类型契约 | `src/types/` 共 7 个文件：`global.d.ts`、`env.d.ts`、`auth.ts`、`permission.ts`、`request.ts`、`enums.ts`、`index.ts` |
| 依赖与运行环境清单 | `package.json` 含 scripts 与精确版本；已生成 `pnpm-lock.yaml`；`mise.toml` 指定 Node 26.13.0 |
| 可用工具 | Vue / Router / Pinia / frontend-design / shadcn-vue 技能，shadcn MCP、Context7、Playwright |

### API 模块索引

| 模块 | 主要能力 | 实现时关注 |
| --- | --- | --- |
| `auth.ts` | login / getUserInfo / logout / refreshToken | `TokenResponse { accessToken, expireIn }`；刷新条件待核实 |
| `permission.ts` | 权限树、菜单树、角色权限保存、缓存清理 | 菜单组件映射与按钮权限 |
| `user.ts` | 分页、详情、增删改、密码、角色、部门、启停 | `put(url, null, { params: { enabled } })`、`del(url, ids)` |
| `role.ts` | 角色 CRUD、列表、启停 | 服务端分页 |
| `dept.ts` | 部门树、列表、CRUD | `DeptTree = WithChildren<Dept>` |
| `dict-type.ts` / `dict-data.ts` | 字典类型与数据分页 CRUD | 关联筛选 |
| `dict.ts` | 字典获取与转换 | tagType 与 Badge variant 的前端适配 |
| `param.ts` | 参数 CRUD、按类型或键取值 | 参数类型 |
| `online.ts` | 会话分页、踢出会话或用户 | 操作反馈 |
| `schedule-job.ts` | CRUD、暂停、恢复、触发、Cron 校验 | 调度行为与失败反馈 |
| `file.ts` | 上传、批量上传、下载、详情、删除、URL 拼接 | FormData、Blob、文件访问鉴权 |
| `column-config.ts` | 列配置读取、保存、重置 | GET 可为 null；保存全量列 |
| `index.ts` | 当前只导出 auth / permission | 页面默认从具体模块导入，无需先补全导出 |

### 已确认的真实联调环境与授权

以下信息由用户于 2026-11-06 提供。阶段 2 已通过开发代理完成真实登录、用户信息与退出，证据见 §8.1。

| 项目 | 已确认信息 |
| --- | --- |
| 后端地址 | `http://127.0.0.1:9527` |
| 服务状态 | 后端已经启动，所有后端接口均可请求 |
| 环境与授权 | 开发测试库，允许为当前开发功能进行真实接口请求及必要读写测试，无需逐次确认 |
| 联调账号 / 密码 | `admin` / `admin123` |
| 登录接口 | `POST /auth/login`，请求体按现有契约传 username / password，登录无需 Bearer header |
| 内部接口鉴权 | 除登录外，所有内部接口必须携带 `Authorization: Bearer <accessToken>` 请求头；accessToken 取自登录响应 |

联调优先使用真实后端。开发代理按现有 API 模块路径转发，并核实前端 `/api` 前缀与后端实际路径的转换。测试读写使用可识别的数据，结束后清理本轮创建的测试数据。账号用于联调，不硬编码为产品登录默认值；验证报告不记录实际 accessToken。

### 阶段 2 已补齐与仍待实现

已有 `index.html`、Vite / TypeScript / ESLint / Prettier、`@` 别名、入口、`src/utils/request.ts`、scripts 与 `pnpm-lock.yaml`。开发代理把 `/api` 原样转发到 `http://127.0.0.1:9527`。阶段 3 已接入 Tailwind，并生成登录与用户页需要的基础组件。

仍待后续阶段：登录机制、路由、Store、布局和业务页。风格校验页暂时由 `App.vue` 直接挂载。不添加虚假模块代替这些部分。

---

## 3. 工程默认方案与待核实事实

以下是后续实施默认方案，不要求用户逐项回答。实际选择变化时按 §1 判断是否需确认，并写入 §8.2；本次文档修订不安装或切换依赖。

| 项目 | 默认方案 | 核实或调整条件 |
| --- | --- | --- |
| 技术方向 | 保持 Vue + TypeScript + Pinia + Axios + shadcn-vue / Reka UI + Tailwind + TanStack Table | 不因普通功能顺带换栈 |
| 版本与环境 | pnpm 管理，直接依赖固定确切版本；使用最新稳定且相互兼容的版本 | 阶段 1 核对包元数据、官方文档与约束，再记录实际选择 |
| 组件来源 | 官方 `@shadcn` registry | 社区组件按依赖流程评估，生成代码必须核对 |
| shadcn 配置 | AI 在阶段 3 选定统一 style / baseColor；lucide 图标；cssVariables 为 true | 以当前 CLI 支持为准，记录视觉理由；后续切换评估已生成组件迁移 |
| CSS 与别名 | 全局 CSS 为 `src/styles/globals.css`；统一 `@/` 源码别名 | Tailwind v4 的 tailwind.config 留空；aliases.utils 按生成器与现有 cn 实际导出核对 |
| 视觉 | 紧凑、清晰的信息界面，统一语义 tokens，覆盖明暗主题 | AI 提供风格校验页；用户品牌要求优先，不为确认品牌色阻塞基础工程 |
| API 基址 | VITE_API_BASE_URL 默认 `/api`；开发代理目标为 `http://127.0.0.1:9527` | 用户已提供真实地址，按现有 API 路径核实代理前缀转换并真实联调 |
| 鉴权 | 用户已确认 Bearer 模式：登录外全部内部接口统一注入 Authorization；前端默认 sessionStorage、不启用记住我 | 不再询问 cookie 或凭据头选择；Token 有效期、刷新条件与失效响应仍按真实契约核实 |
| 刷新行为 | 条件确认前不启用自动刷新；401 收敛为清理会话并进入登录 | 后端确认支持后，再实现 §4.7 的刷新并发与重试规则 |
| 路由与权限 | 静态布局壳，业务页通过本地明确映射与 menus 组合；权限检查集中封装 | 不执行任意后端组件字符串；前端呈现遵循后端权限语义 |
| 表单与 Toast | Toast 用 vue-sonner；校验先满足首个真实表单 | 确需表单库时由 AI 选择一种，不把所有候选都加入 |
| 表格 | 服务端分页，默认 10 条、最大 100；初期仅当前页选择，翻页或筛选清空选择 | 首个用户页接列配置；业务确需跨页选择时明确完整语义再扩展 |
| API 导入 | 从具体模块导入，暂不补全 `src/api/index.ts` | 确有需要时自主调整并检查冲突，不改变后端语义 |
| 复杂控件 | 遇到实际需求再评估成熟实现与现有组件组合 | 不预先为富文本、图表、Cron 等未实施功能选库 |
| 国际化 | 当前中文，不预先接 i18n | 有明确多语言需求时实施 |
| Git | 保留可审阅差异，阶段完成记录验证证据 | 无提交授权时不自动提交；合并、推送、发布遵循对应授权 |

---

## 4. 实施规范与行为边界

### 4.1 代码风格与检查

沿用 `AGENTS.md`：UTF-8、LF、两空格、单引号、无分号；Vue 使用 `<script setup lang="ts">`。ESLint 负责质量且默认只读，Prettier 显式执行；不手改自动生成的类型声明。

**验证命令由 §4.9 的改动分级决定。** 不设置每次提交统一执行 type-check / lint / build 的要求。纯文档和配置值不通过编译证明正确；局部修改只检查受影响文件与行为。

### 4.2 目录与职责

```text
src/
├─ api/                     # 后端调用契约
├─ types/                   # 后端与公共类型
├─ assets/                  # 按需增加
├─ components/
│  ├─ ui/                   # shadcn 生成并由项目维护的基础组件
│  ├─ common/               # 实际需要的通用组合
│  └─ business/             # 跨页面业务组件
├─ composables/             # 有明确状态或生命周期职责的组合式函数
├─ layouts/
├─ router/
├─ stores/                  # 跨页面共享状态
├─ styles/
│  └─ globals.css           # 全局 tokens 与主题
├─ utils/
│  └─ request.ts            # 唯一 Axios 实例与请求封装
├─ views/
│  ├─ login/index.vue
│  ├─ sys/user/index.vue
│  ├─ sys/user/components/  # 有独立职责时创建，不设数量门槛
│  └─ schedule/job/index.vue
├─ App.vue
└─ main.ts
```

- 按业务模块聚合页面，页面专用组件就近维护；不为每页预建 components / composables / types 三件套。
- 按行为内聚、状态所有权与生命周期拆分。单次使用但能封装明显复杂度的组件或 composable 可以提取；简单逻辑保持局部。
- 公共能力从真实页面中形成；复用次数、目录深度与文件行数只作为判断信号，不作为硬性提取门槛。
- 可因实际职责调整目录并同步导入，不为假想需求扩建分层，不建 utils.ts / common.ts 大杂烩。

### 4.3 命名与类型

| 对象 | 约定 |
| --- | --- |
| 组件 / 页面 | PascalCase.vue；页面目录 kebab-case，入口 index.vue |
| API / 类型 / 工具 | 沿用现有 kebab-case / camelCase 模块风格 |
| Composable / Store | useTableQuery.ts / useUserStore.ts |
| 类型 / 接口 | PascalCase，新类型不加 I 前缀；已有 IPage 保持契约 |
| 变量 / 函数 / 布尔值 | camelCase；布尔值用 is / has / can / should 表意 |
| Props / Emits | 显式类型；Props camelCase，模板事件 kebab-case |
| 常量 / 页面标识 | 复用 ResponseCode、选项与标签映射；pageKey 使用 PAGE_KEYS |

- TypeScript 启用 strict、verbatimModuleSyntax、noUnusedLocals、noUnusedParameters、noFallthroughCasesInSwitch；配置先核对所选版本的实际支持。
- 使用 import type、unknown、类型守卫和泛型，不使用 any / as any / @ts-ignore 绕过错误。必要断言由 AI 核实前提并说明理由，不因断言本身新增人工闸门。
- 全局 `R<T>`、`IPage<T>`、`PageQuery`、`WithChildren<T>`、`FormType<T>`、`IdSet`、`ColumnConfigItem` 无需 import，也不重复定义。
- 用 as const 对象与派生类型表达新常量集合；API 返回值由请求泛型推导，不在调用方重复断言。
- 不混用 TanStack Table v8 / v9 API；按实际安装版本查文档和类型，不直接照搬其他版本示例。

### 4.4 Vue、路由与状态

- SFC 顺序 script → template → style；状态保持单一来源，派生值用 computed，副作用用 watch，模板避免复杂计算。
- Props down / events up 为默认数据流；v-model 对应真实双向契约，后代共享依赖确有需要时使用有类型的 provide / inject。
- 页面状态留在页面或负责行为的 composable；跨页面共享状态才进 Pinia。Setup store 返回其 state，解构响应式状态用 storeToRefs。
- 路由组件负责组装协调，不集中实现所有表单、表格与弹窗内部行为；监听和 DOM 生命周期由所属组件清理。
- 守卫优先返回结果或重定向，异步依赖等待完成；避免无限重定向，处理同路由不同参数。菜单与路由只映射本地明确允许的组件入口。
- 登出或切换身份时清理旧用户状态、动态路由与用户相关缓存，阻止旧请求回写新会话。按钮隐藏不能代替后端接口鉴权。
- 修改公共组件先检查调用方，同步类型、交互和可访问性行为。

### 4.5 样式与基础组件

- `src/styles/globals.css` 是全局 tokens 与主题的主要来源；Tailwind v4 按实际生成配置维护 @theme inline、:root / .dark 与圆角派生。AI 可补充实际需要的语义 token，先定义再引用。
- 优先语义色与组件 variants，保持布局、密度与状态表达一致，避免每页覆盖组件颜色和字体。组合、间距与图标规则以本项目 shadcn-vue 技能和实际 style 为准。
- Dialog / Sheet / Drawer 保留可访问名称，表单保留标签关联、错误态、键盘操作与焦点恢复；尊重 reduced-motion，检查窄屏布局。
- 组件源码由项目维护；可在检查调用方后自主扩展 props、variants、插槽和组合，不把生成源码视为不可修改的外部黑盒。
- 先最小 tokens，再生成当前需要的基础组件，最后用风格校验页检查按钮、输入、表格、弹窗、空态、错误态与长文本。新增控件随页面需求补齐。

### 4.6 依赖与生成过程

- 依赖选择遵循 `AGENTS.md`：先检查已有能力，再查官方文档、稳定版本、engines、peers、许可证与维护情况；记录用途与兼容例外，用 pnpm 同步清单和锁文件。
- 库 API 与 CLI 用法通过 Context7 和对应版本官方资料核实；shadcn 查询、生成、核对依照技能，CLI 使用 `pnpm dlx shadcn-vue@latest ...`，并记录实际解析版本。
- 通过 latest 发现当前版本时，记录实际解析的 CLI 版本、生成日期、registry、style 与相关配置；组件源码与依赖差异纳入审阅。不能假定同一条 @latest 命令将来生成相同结果。
- 只使用当前 CLI 支持的命令与参数，通过 CLI 获取 registry 文件，不手动从 GitHub 拉原始文件；不使用不存在的 add --dry-run / --diff / --view 参数。
- 更新组件先比较差异并保留本地定制；--overwrite 仅在用户明确授权覆盖相应内容时使用，常规更新可自主比较合并。
- 每批 add 后读取生成文件，核对导入、子组件、组合、图标、样式与新增依赖，再用 MCP audit checklist 辅助检查；checklist 不能代替真实行为验收。

### 4.7 请求层、下载与鉴权

封装兼容现有调用方式：

```ts
get<T>(url: string, params?: object, config?: RequestConfig): Promise<T>
post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>
put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>
del<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>
```

`RequestConfig` 继承 AxiosRequestConfig，额外包含 showErrorMessage。基址使用 `VITE_API_BASE_URL || '/api'`，与 file.ts 的 URL 构造一致；组件不另建请求实例。

| 情况 | 必须实现的行为 |
| --- | --- |
| 普通 JSON 成功 | 按 `R<T>` 检查业务码，成功后返回 data，调用方获得 `Promise<T>` |
| JSON 业务失败 | ResponseCode：200 成功、401 未登录、403 无权限、555 业务错误；非成功码抛出可供页面处理的错误 |
| HTTP 失败 | 在 Axios 拒绝分支提取业务信息，优先展示后端 msg / message，再使用合适的 HTTP 或网络错误信息 |
| Blob 下载成功 | 返回原始 Blob，不读取 Blob.code，不再次按 R 解包 |
| 下载返回业务错误 | 结合 Content-Type 与实际内容核实；Blob 承载业务错误 JSON 时解析并统一处理，合法 JSON 文件下载不误判 |
| FormData 上传 | 支持现有配置，核对浏览器适配器实际生成的 multipart boundary，不让通用 JSON 处理破坏上传 |
| 取消请求 | 不当作业务失败反复 Toast；由调用方处理取消与结果过期 |

保留特殊调用：DELETE 第二参数为 body；PUT 第三参数支持 params；GET 支持查询参数与 responseType: blob。内部文件接口同样需要 Bearer header；浏览器直接打开 URL 不会自动经过 Axios 拦截器，下载与预览应按已确认的鉴权规则实现。

- 阶段 2 完成真实请求处理与统一 Bearer 注入能力，使用真实登录取得 Token 后联调受保护接口；阶段 4 再接入登录页、Store 生命周期与完整会话策略。请求工具和 Store 明确依赖方向，避免循环导入。
- `POST /auth/login` 不要求 Bearer header；除登录外所有内部接口均传 `Authorization: Bearer <accessToken>`，包括 userinfo、logout、refresh、上传和下载，不把 refresh 误列为匿名接口。
- HTTP 401 与业务码 401 按后端约定统一收敛，403 不触发刷新循环；同一轮失效只进行一次清理与跳转，保留合适返回地址。
- 仅在刷新条件与协议确认后启用自动刷新：并发失效共享一次刷新，其他请求等待；刷新请求不递归进入刷新流程，符合重试条件的原请求最多重放一次。
- 刷新失败结束等待并清理会话；登出、重新登录或切换身份后，旧刷新结果与旧响应不得恢复过期身份。
- 不自动重试状态不明的写操作；刷新重放需符合后端鉴权失败尚未执行操作的约定。
- showErrorMessage: false 抑制全局提示但保留错误传播，避免页面与全局重复提示。

### 4.8 表格、竞态与保存

服务端分页以真实 PageQuery / IPage 为准，TanStack 使用实际版本的手动分页与排序模式，DOM 与样式由组件渲染。

| TanStack 状态 | 请求 / 响应转换 |
| --- | --- |
| pageIndex 从 0 开始 | 请求 `pageNum = pageIndex + 1` |
| pageSize | 请求同名参数，默认 10、最大 100 |
| 响应 current 从 1 开始 | 回填 `pageIndex = current - 1` |
| 响应 size | 回填 pageSize |
| 响应 total / pages / records | 提供总条数 / 总页数 / 当前页数据，不对当前页再次分页 |

- 服务端分页同时用服务端排序，manualPagination / manualSorting 等以所选版本为准；列 ID 显式映射后端支持的 orderBy / asc，不给未支持列展示可用排序行为，初期仅单列排序。
- 筛选或每页条数变化后重置页码；请求状态只有一个所有者，避免 URL、表格和页面互相触发重复请求。
- 业务 ID 作为稳定 row ID；初期仅当前页选择，翻页、筛选或用户切换时清空，批量操作只提交明示的选中 ID。
- 旧请求不得覆盖新结果，包括 data、error 与 loading；可用请求序号，调用链支持 signal 时考虑 AbortController，无需为取消请求擅改后端契约。
- 列配置 GET 为 null 时用本地默认；保存全部列含隐藏列。稳定 key 匹配当前定义，重置调用后端 reset；pageKey 使用 PAGE_KEYS。
- 多个独立保存接口等待全部结束，分别记录成败并保留表单；有依赖关系的请求按顺序执行。全部成功才提示完成，重试只处理失败或未完成操作，避免重复已成功的副作用。

### 4.9 分级验证与验收证据

遵循全局测试策略，每次改动前声明具体命令。混合工作按实际行为分类，不把请求层或公共接口变更归为纯配置、薄胶水层。

| 级别 | 验证范围 |
| --- | --- |
| L0-T | 回读与 git diff --check；不编译、不测试、不增加测试 |
| L0-C | 最小范围类型检查或编译；不运行或增加测试，不扩大到整仓构建 |
| L0-V | 不编译、不测试；说明读取者、默认值、改后行为与不兼容条件 |
| L1 | 只跑直接相关的现有测试；关键边界未覆盖时补少量有意义测试，必要时做对应浏览器验收 |
| L2 | 验证受影响模块并补充或更新契约测试；公共 Props / Emits / 请求封装签名按实际契约影响判断 |

- 初始化提供 dev / build / preview / type-check / lint / format / format:check。阶段 1 评估最小测试工具，编写关键行为测试时再接依赖与脚本，不预建庞大测试体系。
- 新工程首次可构建时，执行该前端应用的 type-check、lint 与 build 验证工具链；此工作包含实际行为与契约，不归 L0。后续不把整应用构建作为每个局部改动的默认命令。
- 请求层覆盖 JSON 解包、HTTP / 业务错误、Blob 成功与错误；鉴权覆盖采用方案的失效、并发与身份切换；表格覆盖页码、筛选重置、竞态与选择。验证可观察行为，不复述实现，不要求每个分支都新增测试。
- 按变化验收加载、空数据、失败重试、编辑回填、提交、部分成功、长文本、键盘和焦点恢复，可用 Playwright。
- 记录命令或操作、结果与证据、mock 或真实环境、未覆盖范围。当前真实后端与测试授权已提供，优先进行相应真实联调；若执行时遇到不可用，记录具体失败与受影响范围，不把模拟验证宣称为真实链路通过。
- 全量测试套件仅在明确要求时运行；不因阶段切换或换会话重复未受影响的检查。启动成本异常高的验证先按上级策略确认。

---

## 5. 实现顺序

按实际依赖排列：**工程骨架与请求层 → 最小 tokens 与基础组件 → 登录和布局 → 首个业务纵切 → 提取公共能力 → 扩展模块与交付。** 阶段 0、1 为范围核对与版本准备。

| 阶段 | 名称 | 主要产出 | 典型级别 |
| --- | --- | --- | --- |
| 0 | 目标、默认方案与事实缺口核对 | 实施范围、默认方案记录、局部阻塞项 | L0-T |
| 1 | 版本兼容与依赖方案复核 | 实际候选版本、缺失能力、最小测试工具方案 | L0-T |
| 2 | 工程骨架与基础请求层 | 可构建工程、真实 JSON / Blob 请求处理、锁文件 | L1 / L2 |
| 3 | 最小视觉系统与基础 UI | tokens、按需生成组件、风格校验页 | L1 / L2 |
| 4 | 登录、布局、路由与状态 | 已核实协议下的鉴权与权限链路 | L1 / L2 |
| 5 | 首个业务纵切：用户管理 | 完整页面与页面内行为闭环 | L1 |
| 6 | 从真实页面提取公共能力 | 必要公共组件、数据行为与契约验证 | L1 / L2 |
| 7 | 按模块扩展 | role / dept / menu / dict / param / online / job / file 等 | L1 / L2 |
| 8 | 交付核对 | 可审阅结果、验收证据与遗留说明 | 按实际遗留改动分级，纯记录 L0-T |

后续阶段可补充前面能力，不要求一层所有未来功能一次完成。TODO 表示尚未执行；外部事实只影响相关子任务，不建立固定的阶段人工审批点。

---

## 6. 阶段任务卡

### 阶段 0 · 核对目标与默认方案

- **动作**：获用户实现授权后，核对目标、现有代码与 §3 默认方案，直接使用 §2 已确认的后端环境、账号和 Bearer 规则；继续核实菜单、有效期和刷新等剩余事实，不重复询问已提供信息。
- **产出 / 验收**：明确范围、默认方案、按链路划分的待核实事项；每项有证据或调查方式，无需用户先回答所有选型问题。
- **级别 / 命令**：L0-T，回读 + git diff --check。
- **阶段切换**：正式初始化已获授权后，在安装或运行前同步更新 `AGENTS.md` 的当前阶段。仅修订计划时维持准备阶段，不据此启动应用建设。

### 阶段 1 · 复核版本与缺失能力

- **动作**：查询 `npm view <包名>@latest version engines peerDependencies peerDependenciesMeta --json`，核对官方文档、许可证与兼容要求；必要时查兼容范围内最高稳定版。重点检查 TypeScript 与 lint 工具、Node、Vite、Vue、Pinia peers、TanStack、shadcn CLI / registry。
- **产出 / 验收**：实际版本方案、补 vite 与 scripts 的差异清单、最小测试工具方案；不将旧表版本或约束冒充本次查询结果，本阶段不安装。
- **级别 / 命令**：L0-T，元数据查询、回读 + git diff --check。
- **边界**：兼容的常规依赖调整由 AI 决定，重大迁移或外部成本才按 §1 确认。

### 阶段 2 · 工程骨架与基础请求层

- **前置**：初始化获授权，`AGENTS.md` 阶段已同步，版本方案已核对。
- **动作**：补 scripts 与 vite，pnpm install 生成锁文件；实现入口、Vite / TS / ESLint / Prettier 配置、别名、最小挂载及指向已确认后端的开发代理。按 §4.7 实现 JSON、错误传播、上传、Blob 与统一 Bearer 注入，完整会话集成留阶段 4。
- **产出**：真实请求封装、API 可解析、工程可构建；不用虚假 request 凑类型检查。
- **验收**：首次运行 pnpm type-check、pnpm lint、pnpm build；请求层运行所选工具对应的聚焦测试，实施前写出确切命令与文件范围。使用已提供账号真实请求 `POST /auth/login`，再携带返回的 accessToken 请求 `GET /auth/userinfo`，验证请求封装和开发代理链路；记录结果，不在报告中输出 Token。
- **级别**：L1 / L2，请求封装接口与运行行为均有影响，不归纯配置。

### 阶段 3 · 最小视觉系统与基础 UI

- **前置**：阶段 2 完成。
- **动作**：选定并记录 style、baseColor、aliases 与全局 CSS 配置；先最小 tokens，再用 CLI / MCP 查询、取文档、生成所需组件，最后做风格校验页。
- **范围 / 产出**：按登录与首个用户页选择按钮、输入、Field、表格、弹窗与反馈等，不预装整套 UI；保留主题、核对过的源码、实际 CLI 版本与生成记录。
- **验收**：生成文件和依赖核对、audit checklist；长文本、明暗主题、窄屏、标签、键盘和焦点；按变化做类型与相关文件 lint 检查。
- **级别**：交互 L1，公共契约 L2；后续纯 token 值修改为 L0-V，不机械套用阶段级别。

### 阶段 4 · 登录、布局、路由与状态

- **前置**：最小 UI 可用；后端地址、账号和 Bearer 方式已由用户确认，按真实响应核对菜单与会话细节。执行时若有局部协议缺口，先完成独立工作并记录影响。
- **动作 / 产出**：登录、用户 Store、凭据注入、会话失效、布局、菜单与权限；确认刷新条件后才自动刷新；实现身份清理与本地组件映射，记录采用方案。
- **验收**：相关守卫与会话测试；浏览器检查未登录跳转、权限失败、页面刷新、登录退出和重复失效。启用自动刷新时验证并发共享、重试上限、失败收敛与旧响应隔离。
- **级别**：L1 / L2；公共组件或 Store 的正常组织调整不需额外人工批准。

### 阶段 5 · 首个业务纵切：用户管理

- **前置**：基础请求与 UI 可用；真实接口验收依赖可用登录环境。
- **动作**：接 user.ts 的分页、筛选、启停、删除、新增、编辑、密码、角色与部门操作，按需结合 file 与列配置。先完成页面闭环，独立职责可拆页面专用组件与 composable。
- **产出**：用户纵切、明确状态所有权、部分成功与重试处理、后续可复用模式的实际样本。
- **验收**：§4.8 页码、排序、选择、竞态与列配置；加载、空数据、重试、编辑提交、部分成功和可访问性；相关测试与静态检查，标注真实或模拟环境。
- **级别 / 边界**：L1，公共契约变化部分按 L2；可按需补 UI、tokens 与前端公共能力，不要求预先造齐 ProTable / SearchForm。

### 阶段 6 · 从真实页面提取公共能力

- **前置**：首个纵切已形成可验证行为。
- **动作**：按职责、复杂度与实际后续调用评估 ProTable、查询行为、SearchForm、确认交互与页面容器；隐藏明确复杂度或建立必要一致性时才提取，不要求全部出现或重复两次。
- **产出 / 验收**：必要公共能力、明确 Props / Emits / 状态所有权、迁移后的调用方；保持用户页行为，聚焦验证受影响模块与公共契约，覆盖公共层负责的数据边界。
- **级别**：L1 / L2；AI 自主确定前端契约并记录，不建固定人工审批点。

### 阶段 7 · 扩展业务模块

- **前置**：用户页模式可用，按每个模块的真实数据与交互扩展。
- **动作 / 产出**：授权范围内实现 role / dept / menu / dict / param / online / job / file；实际遇到树、Cron、上传等再评估控件，正常公共能力演进自主完成并记录。
- **验收**：直接相关测试与检查；公共层变化覆盖受影响调用方。树编辑、权限保存、踢出、调度等专有行为按需验收。
- **级别**：L1 / L2；普通功能不重新复核或升级所有依赖。

### 阶段 8 · 交付核对

- **动作**：对照授权范围、阶段证据与待核实事实，整理交付、运行说明和遗留；修复实际问题时重新声明级别与聚焦命令。
- **验收**：没有未经说明的模拟联调、缺失功能或未执行检查。若自上次构建后有影响应用产物的实现变化，按交付需要运行一次 pnpm build；纯文档收尾不构建，不重复未受影响的测试。
- **边界**：交付说明不自动授权提交、推送或部署，按已有或后续明确授权执行。

---

## 7. 契约速查与官方参考

此表只提供定位，具体结构以源码为准；源码变化时同步相关记录，不维护第二套独立契约。

| 项目 | 位置或行为 |
| --- | --- |
| JSON 包装、分页、列配置类型 | src/types/global.d.ts；JSON 按 R 解包，Blob 独立处理 |
| 响应码、标签映射与 PAGE_KEYS | src/types/enums.ts |
| 登录与用户信息 | src/api/auth.ts、src/types/auth.ts；存在 refresh 函数不等于刷新前提已确认 |
| 菜单与组件字段 | src/types/permission.ts、src/api/permission.ts |
| 用户详情与角色部门 | src/api/user.ts；详情包含 user / roleIds / deptIds |
| 文件访问与特殊配置 | src/api/file.ts、src/types/request.ts |
| 列配置 | src/api/column-config.ts；GET 可为 null，保存全量列，reset 后回到默认 |

本次修订所依据的官方资料：

- [shadcn-vue Open Code](https://shadcn-vue.com/docs/introduction)、[Skills](https://shadcn-vue.com/docs/skills)、[MCP](https://shadcn-vue.com/docs/mcp)：项目持有组件源码，AI 可基于源码、配置与查询工具组合维护。
- [TanStack Vue 分页指南](https://github.com/TanStack/table/blob/main/docs/framework/vue/guide/pagination.md)：从 0 开始的 pageIndex 与手动分页行为；main 文档会变化，实施仍需核对实际版本。
- [Axios 请求配置](https://github.com/axios/axios/blob/v1.x/docs/pages/advanced/request-config.md)、[响应拦截器](https://github.com/axios/axios/blob/v1.x/README.md)：按实际数据形式处理普通响应与 Blob，并正确传播 HTTP 错误。

---

## 8. 状态与决策记录

### 8.1 阶段状态

阶段 0–3 已完成。状态依据实际代码和证据更新，不能把默认方案写成已经实现。

| 阶段 | 状态 | 级别 | 命令 / 操作与证据 | 遗留 |
| --- | --- | --- | --- | --- |
| 0 | DONE | L0-T | 回读 AGENTS、计划、package.json、`src/api`、`src/types`，并对照 ray-boot 的 AuthController、R、ResultCode、SecurityConfig、application.yml。`git diff --check` 通过 | 菜单与文件契约见 §8.3 |
| 1 | DONE | L0-T | 2026-11-06 `npm view` 复核稳定版与 peer。未把 TypeScript 7.0.2 当作可用版本 | Context7 MCP 本会话不可用，依据 npm 与官方文档 |
| 2 | DONE | L1 / L2 | `pnpm type-check`、`pnpm lint`、`pnpm build`、`pnpm format:check` 均退出码 0。`vitest run src/utils/test/request.test.ts`：17 通过（模拟 HTTP / Blob adapter）。真实链路：`RAY_LIVE_API=1`、`RAY_API_PROXY=http://127.0.0.1:5174/api`，`vitest run src/utils/test/request.live.test.ts` 1 通过；`expireIn=1800`，`username=admin`，随后 logout。浏览器打开 `http://127.0.0.1:5174/`，挂载文案正确且无控制台错误。未记录 accessToken | 自动刷新、登录页、路由与 Store 留在后续阶段 |
| 3 | DONE | L1 / L2 | 2026-11-06。`pnpm type-check`、`pnpm lint` 退出码 0。浏览器打开 `http://127.0.0.1:5174/`（5173 仍被其他项目占用）：浅色、深色和 390px 窄屏无横向溢出；长备注换行；账号字段有关联标签；错误字段为红色边框和说明；Escape、关闭和取消都会把焦点还回触发按钮；Tab 留在弹窗内且焦点环可见；Toast 显示「已保存」。控制台无 error / warning。示例表格不是接口数据 | 登录、路由和 Store 仍在阶段 4。请求层的 `setErrorNotifier` 尚未接到 vue-sonner |
| 4 | DONE | L1 / L2 | 2026-11-06。守卫与会话 `vitest` 14 通过；菜单测试在路由映射完成后通过，后续未改映射故未重跑。请求层 `vitest` 26 通过（模拟 HTTP）。`vue-tsc -b` 通过。浏览器使用真实后端：未登录跳转、错误密码、登录、刷新页面、无权限、未知地址、重复 401 只刷新一次、过期令牌打开登录页后进入用户管理、退出。390px 键盘选择菜单后焦点在主内容。独立审查：请求层 2 次第 2 次 PASS；登录与路由 3 次第 3 次 PASS。未记录令牌，未运行构建 | 菜单页仍是占位页。`file.ts` 见 Q04 |
| 5 | DONE | L1 | 2026-11-06。`vue-tsc -b` 与相关 eslint 通过。`vitest run src/views/system/user/test/user-list.test.ts` 5 通过（模拟，测试目录不入库）。真实后端：空筛选、新增、校验错误留在表单、回填、只改资料不重复分配、角色保存、密码、停用、列隐藏与刷新后恢复、删除测试用户后 admin 仍在。旧详情不会覆盖后打开的用户。清空昵称会保存。已有性别不能清空时对话框保持。列配置失败显示在对话框内。390px 无横向溢出。独立审查 2 次，第 2 次 PASS。未记录令牌，未运行构建 | 其他菜单页仍是占位页。`file.ts` 见 Q04。性别不能通过更新接口清空 |
| 6 | DONE | L1 | 2026-11-06。只抽出列配置合并。`vue-tsc -b`、相关 eslint 通过。列配置与用户列表 vitest 共 6 通过（模拟，测试不入库）。真实页面隐藏「手机」后表头消失，恢复默认后回来。独立审查 1 次 PASS。未运行构建 | 未提取 ProTable、SearchForm、确认框或页面容器 |
| 7 | DONE | L1 / L2 | 2026-11-07。角色、部门、菜单、字典、参数、在线用户、定时任务和文件已完成，见检查点。文件页 `vue-tsc -b`、相关 eslint、file-form vitest 2 通过。真实上传、批量、客户端拒绝、取消删除、删除后清空、390px。审查 1 次 PASS。未记录令牌，未运行构建 | 没有服务端文件列表。已有性别不能清空 |
| 8 | TODO | 按实际改动 | 交付证据与遗留核对，未执行 | — |

状态：TODO / IN_PROGRESS / PARTIAL / BLOCKED / DONE。只有整个阶段没有可继续的必要工作时才标 BLOCKED；可推进独立工作时保持 IN_PROGRESS 或 PARTIAL，注明受阻子任务。DONE 要求约定验收满足，包含明确要求的真实联调，模拟验证不能代替它。

### 8.2 已确认决策与后续记录

| 编号 | 决策 | 依据与影响 | 日期 |
| --- | --- | --- | --- |
| D01 | 保持现有技术方向，采用 AI 自主执行与必要确认边界 | 用户同意按评审调整；日常工程取舍由 AI 负责并记录 | 2026-11-06 |
| D02 | 先最小 UI 再登录，首个业务纵切后提取公共能力 | 避免缺失前置组件与提前封装，不逐项审批公共前端接口 | 2026-11-06 |
| D03 | 分级验证，补请求和表格行为边界 | 取消每次提交统一构建；本次文档修订不触发应用实现 | 2026-11-06 |
| D04 | 后端与测试授权已提供，登录外所有内部接口使用 Bearer header | 用户确认本地后端、地址与联调账号；阶段 2 已实测登录、用户信息与退出 | 2026-11-06 |
| D05 | 初始化采用 2026-11-06 复核后的精确版本 | TypeScript 保持 6.0.3，因为 `typescript-eslint@8.72.1` 只支持 `<6.1.0`，不采用 7.0.2。pnpm 升到 12.18.0，`@lucide/vue` 升到 1.70.0。新增 vite 8.3.6、vitest 5.1.0、eslint-config-prettier 10.1.8、globals 17.14.0。TS 6 废弃 `baseUrl`，`paths` 改为相对 tsconfig。`@lucide/vue@1.70.0` 写入 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`，否则 pnpm 12 的发布龄门槛会拒绝安装 | 2026-11-06 |
| D06 | 请求层自行持有 sessionStorage 令牌，不接 Store、Toast 或自动刷新 | 键名 `ray.accessToken`。`POST /auth/login` 不注入 Bearer。非登录 401 每轮只清理一次并调用可注册处理函数；登录失败返回的业务 401 不清理、不跳转。刷新仍依赖 HttpOnly Cookie `refresh_token`（Path `/api/auth`），本阶段不实现自动刷新，也不全局开启 `withCredentials`。FormData 去掉无 boundary 的 Content-Type。Blob 只在没有文件名 Content-Disposition、JSON 类型、不超过 1MB 且 `code !== 200` 时按业务错误处理。`null` 请求体不发送。`setErrorNotifier` 留给阶段 4 接 vue-sonner | 2026-11-06 |
| D07 | 请求层聚焦测试使用 Vitest，默认不跑真实后端，测试目录不入库 | `pnpm test` 只执行 `src/utils/test/request.test.ts`。所有测试文件放在名为 `test` 的目录中，`.gitignore` 用 `**/test/` 排除。真实联调由 `RAY_LIVE_API=1` 单独开启。Axios 1.21 的 Node HTTP 适配器不会把 `responseType: 'blob'` 变成 Blob，Blob 用例用自定义 adapter 模拟浏览器 XHR 结果，报告中标为模拟 | 2026-11-06 |
| D08 | 开发服务器配置端口保持 5173；代理转发时去掉 Origin | 配置端口仍是 5173。本机 5173 被其他项目占用。后端 CORS 只放行 5173 和 3000，浏览器在 5174 上发登录会得到 Spring 的 `Invalid CORS request`。Vite 代理已在转发前去掉 Origin，因为浏览器只与开发服务器同源通信。5174 去掉 Origin 后登录、刷新 Cookie 和退出可用。3000 因在白名单内，不去掉 Origin 也同样可用 | 2026-11-06 |
| D09 | 视觉系统使用 Mira、mist 底色和 teal 主操作色 | CLI `shadcn-vue@2.9.0`，预设码 `a6OYtvIO`：`reka-mira`、`baseColor=mist`、`theme=teal`、`radius=small`（`--radius: 0.45rem`）、lucide、`pointer`。全局 CSS 为 `src/styles/globals.css`，Tailwind v4 不设 `tailwind.config`。`aliases.utils` 为 `@/lib/utils`，该文件再导出 `cn` 包的 `cn`；生成组件直接 `import { cn } from 'cn'`，与包导出一致。字体用 `@fontsource-variable/ibm-plex-sans@5.3.0`（OFL）自托管，中文回退系统字体，不请求 Google Fonts。`shadcn-vue@2.9.0` 留在依赖里，只因为 CSS 导入 `shadcn-vue/tailwind.css`，页面不从该包导入组件。另固定 `tw-animate-css@1.4.0`、`vue-sonner@2.0.9`。根 `tsconfig.json` 补了 `@/*`，否则 CLI 看不到 `tsconfig.app.json` 里的别名。Vue 会把布尔 `data-invalid` 渲染成空字符串，生成类原本只匹配 `=true`，已改为按属性存在匹配。Sonner 的 `--gray2` 从无效的 `hsl(var(--popover))` 改为 `color-mix`。弹窗关闭和加载状态的可读文案改为中文。`prefers-reduced-motion` 会缩短动画。`src/components/ui` 关闭 `vue/multi-word-component-names` 和 `vue/require-default-prop`，避免为了生成文件改组件名或给每个可选 `class` 补默认值 | 2026-11-06 |
| D10 | 启用自动刷新，令牌仍由请求层保存 | 真实 `POST /api/auth/refresh`：Cookie `refresh_token`（Path `/api/auth`，HttpOnly，SameSite=Lax）足够换新 accessToken；无 Cookie 返回业务 401「Refresh Token 不存在」；无效 Bearer 加有效 Cookie 仍成功。只给 login、refresh、logout 设置 `withCredentials`。并发 401 共享一次刷新，刷新自身不递归，原请求最多重放一次。刷新失败或重放仍 401 时清理一次并通知一次。登录失败的 401 不清理。403 不刷新。`sessionEpoch` 在登录写入和清理时增加，刷新轮换不增加。换代会中止上一代已经发出的刷新，避免迟到的 `Set-Cookie` 覆盖新登录写入的 Refresh Cookie；后端成功刷新会轮换 Cookie，失败会把同名 Cookie 的 Max-Age 设为 0。直接 `refreshToken()` 和自动刷新共用同一次请求。浏览器已看到两条 userinfo 401 只对应一次 refresh 200，新令牌写回且页面保持登录；5174 去掉 Origin 后 Cookie 刷新同样成功。未记录令牌 | 2026-11-06 |
| D11 | 用户页按服务端分页，不提前做通用表格 | `UserPageQuery` 不绑定 orderBy，列表不发送排序。每页 10/20/50/100。选择只保留当前页，筛选、翻页和改每页条数都清空。编辑和密码用会话序号隔离迟到响应，提交使用打开时的快照。可选文本清空时提交空字符串。已有性别不能清空，因为 `updateById` 不写 null。表单内已展示的错误关闭全局 toast。不上传头像 | 2026-11-06 |
| D12 | 阶段 6 只共享列配置合并规则 | 用户页的列表、筛选、确认和页面结构仍留在页面内。`src/utils/column-preference.ts` 负责 null 默认、丢弃未知列、追加缺失列，并保存隐藏列。`width` 和 `fixed` 仍写 null | 2026-11-06 |
| D13 | 部门页按整棵树加载，不提前做通用树表 | 不分页、不排序、不用列配置。名称在已加载结果里筛选，筛选时清空勾选。删除提交 ID 集合。根上级是 0。名称、负责人、电话、邮箱、备注按表字段 50、50、20、100、500 在提交前拦截。可选文本提交空字符串。启停提交整行，避免漏字段被 `updateById` 留下旧值。编辑保存用会话序号隔离，迟到成功只刷新列表，不关闭后打开的对话框 | 2026-11-06 |
| D14 | 菜单页提交标识时接受超管重新登录 | 按钮更新必须带 `code`，否则后端认为标识为空。因此编辑按钮，或请求里出现 `code`、`enabled`，提交后超管需要重新登录。目录和菜单在这两项没变时不提交它们。空标识不提交，避免唯一索引只允许一个空字符串。权限树缓存用序号丢掉重叠的旧响应 | 2026-11-06 |
| D15 | 参数页按单表分页，编辑读取未脱敏详情 | `ParamPageQuery` 只有分类和类型，列表不发送 orderBy，分类 0 会提交。键、类型和分类创建后不可改。列表里的加密值是 `****`，编辑必须等详情成功才允许保存。已有描述不能清空，因为空描述不会写入。字符串和字符串列表保留原文字。加载失败清空勾选。保存用会话序号隔离，迟到结果不关闭后打开的对话框 | 2026-11-07 |
| D16 | 在线用户只按登录时间范围分页 | 查询不发送 orderBy。时间在点击查询后生效，同一分钟展开为该分钟的 00 到 59 秒。没有批量下线接口，按行确认下线单个会话或该用户全部会话。下线当前账号后需要重新登录。加载失败清空列表 | 2026-11-07 |
| D17 | 定时任务分页管理，执行日志留在同一页 | 名称、分组、Bean 和状态在点击查询后生效，不发送 orderBy，默认 id DESC。暂停和恢复只切换启用。Cron、Bean 和方法在保存前校验；没有校验权限时不拦截保存。日志按当前任务分页。清空会删除全部任务的日志。确认进行中不能再次打开；用户关闭后，迟到的失败显示在页面上，迟到的成功不关闭新确认框。已有「文件生命周期清理」保持启用 | 2026-11-07 |
| D18 | 文件页只保留本次上传，不查询历史 | 控制器没有分页，菜单也没有文件页。单文件字段是 `file`，批量字段是 `files`。批量里失败的项单独显示，不撤销已成功的项。下载是 302，页面用返回的浏览签名地址打开。路由放在 `/file`，工作台在有上传权限时提供入口。刷新后不保留勾选，避免删除已经看不见的文件 | 2026-11-07 |

后续记录影响开发的实际决定：问题、选择、证据、范围、兼容例外与验证结果。§3 默认方案被实际采用或调整时补充记录，无需为每个局部变量或布局选择写条目。

### 8.3 待核实事实与按需决策

| 编号 | 事项 | 状态与下一步 | 影响范围 |
| --- | --- | --- | --- |
| Q01 | 真实 API 地址、代理目标与联调账号 | 已实测：后端无 context-path，控制器在 `/api` 下，代理不改写路径。登录、用户信息、退出经 Vite 代理成功 | 阶段 4 起可沿用该代理 |
| Q02 | expireIn 单位、刷新前提与失效语义 | 已核实并接入，见 D10。`expireIn` 单位是秒。失效跳转接到登录页，其他错误接到 vue-sonner。登录失败留在表单 | 不再询问凭据头 |
| Q03 | component / routeName 格式与按钮权限 code 含义 | 已按 admin 的 userinfo 写入 `src/router/views.ts`。目录 `component`、`routeName` 为 null。菜单 `url` 为 `user` 或 `/job`，`component` 为 `system/user/index`、`schedule/job/index`。未知 component 不注册、不执行。按钮权限在 `permissions`，不在菜单树里。阶段 4 这些菜单页共用后续阶段占位页 | 不执行任意组件字符串 |
| Q04 | 列表 orderBy，以及文件接口是否仍与 `file.ts` 一致 | 用户列表和定时任务列表都不发送 orderBy，默认 id DESC。文件接口已对齐：`POST /sys/file`、`POST /sys/file/batch`、`GET /sys/file/{id}`、`GET /sys/file/{id}/url`、`DELETE /sys/file`。下载仍是 `GET /sys/file/{id}/download` 的 302，页面不读取跳转地址 | 没有文件分页；用户页和定时任务页不排序 |
| Q05 | style、baseColor、视觉细节与 aliases.utils | 已落地，见 D09。后续换风格前要评估已生成组件 | 工程选择，已记录 |
| Q06 | 最小测试工具、表单库与复杂控件 | 测试工具已定为 Vitest 5.1.0。表单库与复杂控件仍不预装 | 阶段 3 之后按真实表单再选 |
| Q07 | 用户信息头像字段 | `UserInfo.avatarFileId` 是 `number \| null`。用户接口读到的 `avatarFileId` 是 `{fileId,name,url,ext,size}` 或 null，写入只传数字或 null。文件页不写入头像 | 用户页仍不上传头像 |

其他原有问题在 §3 给出默认方案，不再要求所有问题答完才能开工。真正需确认的问题按 §1 记录调查结果与局部影响。

### 8.4 当前未完成事项

- 已有性别不能通过用户更新接口清空，`updateById` 不写 null。
- 文件没有服务端列表。`/file` 只保留本次上传成功的未绑定文件。
- 本机 `0.0.0.0:5173` 被其他项目占用；日常 `pnpm dev` 仍配置为 5173，启动时若看到端口警告需要确认请求没有进到别的 Vite。
- 阶段 7 文件页已本地提交 `48ffc3f`，未推送。未运行 `pnpm approve`，因此没有安装 `@tanstack/vue-table` 附带的 agent skills。

### 阶段 7 恢复检查点

- **当前阶段：** 7 已完成。
- **已完成：** 阶段 1–3 复审无修改。用户、角色、部门树、菜单树、字典、系统参数、在线用户、定时任务、文件。
- **剩余：** 已有性别不能清空。文件没有历史列表。
- **关键决定：** D18。文件页只显示这次上传成功的未绑定文件。批量失败逐项保留。打开使用浏览签名地址。
- **验证：** 文件页 eslint、`vue-tsc -b` 和 file-form vitest 2 项通过。真实页面完成空文件和非法扩展名不请求、单文件上传、批量上传、部分文件被客户端拒绝、取消不删除、删除后表格清空、390px。测试文件已删除。未记录令牌，未跑全量测试和构建。
- **审查：** 阶段 1–3 一次 PASS。用户页 2 次第 2 次 PASS。列配置 1 次 PASS。角色页 1 次 PASS。部门页 2 次第 2 次 PASS。菜单页 2 次第 2 次 PASS。字典页 2 次第 2 次 PASS。参数页 1 次 PASS。在线用户页 1 次 PASS。定时任务页 3 次第 3 次 PASS。文件页 1 次 PASS。
- **提交：** `3ab7da7` 定时任务，`48ffc3f` 文件。未推送。
- **下一步：** 阶段 7 没有剩余模块。不推送。

---

## 9. 工具与技能索引

| 场景 | 使用方式 |
| --- | --- |
| Vue 实现 | vue-best-practices，写 Vue 前加载必读 reactivity / sfc / component-data-flow / composables 参考 |
| Router / Pinia | 按需使用 vue-router-best-practices / vue-pinia-best-practices |
| 视觉与组件 | frontend-design / shadcn-vue，结合实际 style 与当前配置 |
| Registry 查询 | shadcn MCP 搜索、示例、源码、add 命令与 audit checklist，结合 CLI 实际文档 |
| 库文档 | Context7 先 resolve-library-id，再按单一概念 query-docs，优先对应版本官方资料 |
| 浏览器行为 | Playwright，记录环境、操作与真实结果；工具可用不等于已验收 |
| 验证与交付 | 按 §4.9 分级和本次实际声明的命令执行，遵循上级测试策略 |
