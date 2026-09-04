# AI 需求理解：初步实现方案

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档状态 | 开发前实现基线 |
| 功能名称 | AI 需求理解 |
| 目标版本 | 原型 0.1 |
| 最后更新 | 2026-09-04 |
| 上游文档 | `MVP_PRODUCT_DESIGN.md`、`AI_NEED_UNDERSTANDING_PROTOTYPE.md` |

## 2. 审核结论

当前设计不存在阻止原型实现的技术问题。界面、三层需求状态、卡片编辑、轮次控制、重复问题过滤、结构化模型接口和当前会话保存都可以确定性实现。

需要区分两类结论：

- **工程可实现性**：原型范围内的功能均有明确实现路径，可以开始开发。
- **产品效果确定性**：第三层认知缺口的追问质量、动态候选需求的相关性，以及 3–5 轮内卡片的实际增量价值，必须通过真实模型和用户测试验证，不能在开发前保证。

因此，当前可以有把握完成“可运行、可控制、可测量的原型”，但不提前承诺模型在所有消费场景中都能稳定达到产品指标。

## 3. 可实现性评估

| 能力 | 工程把握 | 主要不确定性 | 实现判断 |
| --- | --- | --- | --- |
| 对话与需求卡片界面 | 高 | 移动端空间分配 | 可直接实现 |
| 三层需求状态 | 高 | 字段粒度需在测试中微调 | 可直接实现并演进 |
| 角色识别与自用角色合并 | 高 | 模型抽取偶有歧义 | 数据结构和合并规则可控制 |
| 动态候选直接需求 | 高 | 候选项是否真正相关 | 有限词典约束后可实现，效果需验证 |
| 第三层认知缺口追问 | 中高 | 问题价值依赖语境与模型能力 | 机制可实现，默认次数和质量需测试 |
| 3–5 轮停止 | 高 | 卡片完整度与轮次可能冲突 | 代码可以强制停止，产品效果需验证 |
| 防止重复追问 | 高 | 语义相近但主题名不同 | 标准主题标识和代码过滤可控制 |
| 结构化模型输出 | 高 | 模型偶发无效结果 | Schema 校验、一次重试和回退可处理 |
| 卡片编辑与状态同步 | 高 | 编辑造成字段冲突 | 单一状态源和确定性合并可控制 |
| 当前会话临时保存 | 高 | 浏览器数据会被用户清除 | 原型阶段可接受 |

第三层认知补全是主要产品风险，不是技术阻塞。实现必须使其可单独开关、计数和评估，以便测试后调整规则。

## 4. 实现范围

### P0 必须实现

- 中文模糊需求输入。
- 对话与需求卡片双区页面。
- 自由文本与快捷候选项回答。
- 三层内部需求状态。
- 参与者与购买角色分配。
- 单轮结构化模型响应。
- 状态补丁校验与合并。
- 对话阶段转换。
- 五次主动澄清上限。
- 重复问题过滤。
- 第三层默认一次、最多两次的限制。
- 用户可见需求卡片。
- 卡片字段修改、删除与补充。
- 当前会话恢复。
- 主演示与自用场景测试。

### P1 原型验证后考虑

- 会话导出。
- 多个会话管理。
- 服务端持久化。
- 管理员查看测试记录。
- 候选需求词典的可视化配置。
- 提示词版本实验界面。

### 不实现

- 商品搜索、推荐和排序。
- 选购方案和购买清单。
- 实时价格、库存和交易。
- 用户账号。
- 跨会话长期画像。
- 多智能体或多模型编排。

## 5. 技术选型

### 5.1 推荐技术栈

- **应用框架**：Next.js App Router。
- **开发语言**：TypeScript。
- **界面层**：React。
- **服务端接口**：Next.js Route Handler。
- **运行时校验**：Zod。
- **客户端状态**：React `useReducer`。
- **样式**：CSS Modules 与少量全局设计变量。
- **会话保存**：浏览器 `sessionStorage`。
- **模型接入**：服务端模型适配器，具体供应商由环境配置决定。
- **测试**：单元测试、接口契约测试和一条浏览器端到端测试。

选择单体全栈结构是为了让页面、接口和共享类型位于同一代码库，减少原型阶段的部署与联调成本。Next.js App Router 支持页面与服务端 Route Handler 共存；Zod 用于让 TypeScript 类型与运行时数据校验保持一致。

依赖版本在实际创建应用时选择当时受支持的稳定版本并提交锁文件，不在本方案中固定未来可能过期的具体版本号。

### 5.2 本阶段不引入

- 独立后端服务。
- 数据库和 ORM。
- 全局状态管理库。
- 消息队列。
- 向量数据库。
- 通用智能体框架。
- 微服务或插件系统。

## 6. 总体架构

```text
浏览器
├─ 对话界面
├─ 候选项选择
├─ 需求卡片与编辑器
└─ sessionStorage
        │
        │ POST /api/conversation/turn
        ▼
服务端 Route Handler
├─ 请求 Schema 校验
├─ 对话控制器
│  ├─ 阶段和轮次规则
│  ├─ 状态补丁合并
│  ├─ 重复问题过滤
│  └─ 停止条件判断
├─ 模型适配器
│  └─ 单次结构化模型调用
├─ 响应 Schema 校验
└─ 用户卡片映射器
        │
        ▼
结构化响应返回浏览器
```

### 6.1 职责边界

| 模块 | 负责 | 不负责 |
| --- | --- | --- |
| 界面 | 收集输入、展示问题和卡片、发出编辑事件 | 推断需求和决定下一问题 |
| 对话控制器 | 状态合并、阶段转换、轮次、重复和停止规则 | 创造语义内容 |
| 模型 | 从文本提取信息、提出候选需求和认知缺口 | 绕过代码规则或直接控制界面 |
| 卡片映射器 | 从内部状态生成用户可见字段 | 展示来源、置信度和模型形成过程 |
| 模型适配器 | 封装供应商调用与错误转换 | 承担业务状态规则 |

## 7. 推荐目录结构

```text
src/
├─ app/
│  ├─ api/
│  │  └─ conversation/
│  │     └─ turn/
│  │        └─ route.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ conversation/
│  │  ├─ ConversationPanel.tsx
│  │  ├─ MessageList.tsx
│  │  ├─ AnswerOptions.tsx
│  │  └─ MessageComposer.tsx
│  └─ need-card/
│     ├─ NeedCard.tsx
│     ├─ NeedCardEditor.tsx
│     └─ NeedCardSection.tsx
├─ domain/
│  └─ need-understanding/
│     ├─ types.ts
│     ├─ schemas.ts
│     ├─ initial-state.ts
│     ├─ reducer.ts
│     ├─ merge-patch.ts
│     ├─ readiness.ts
│     ├─ question-policy.ts
│     └─ public-card.ts
├─ server/
│  ├─ conversation-service.ts
│  └─ model/
│     ├─ adapter.ts
│     ├─ provider.ts
│     └─ prompt.ts
└─ tests/
   ├─ unit/
   ├─ contract/
   ├─ fixtures/
   └─ e2e/
```

目录按产品领域而不是按通用工具过度拆分。原型只有一个核心功能，不建立额外抽象层。

## 8. 核心数据结构

### 8.1 字段状态

内部字段需要区分内容、确认程度和来源，但这些元数据不进入用户卡片。

```ts
type ReviewStatus = "confirmed" | "tentative" | "unknown"

type InformationSource =
  | "user_explicit"
  | "consumer_assumption"
  | "model_hypothesis"

type TrackedField<T> = {
  value: T | null
  status: ReviewStatus
  source: InformationSource
  updatedAtTurn: number
}
```

`confirmed` 表示消费者确认该内容可用于本次购物，不代表系统证明了目标者的客观事实。

### 8.2 参与者与角色

角色不使用互相独立的自由文本字段，避免同一个人出现“爸爸”“父亲”“目标者”等不一致值。

```ts
type Actor = {
  id: string
  label: string
  relationshipToConsumer: string
  identitySummary: string | null
}

type RoleAssignments = {
  initiatorIds: string[]
  buyerIds: string[]
  payerIds: string[]
  decisionMakerIds: string[]
  recipientIds: string[]
  userIds: string[]
  coUserOrInfluencerIds: string[]
}
```

自用场景只创建 `consumer` 参与者，并将相应角色指向同一个 ID。

### 8.3 直接需求项

第二层需求类别会随场景扩展，使用需求项数组表达，不为每个可能类别创建固定顶层字段。

```ts
type NeedDimension =
  | "desired_outcome"
  | "budget_value"
  | "usage_context"
  | "hard_constraint"
  | "function_performance"
  | "style_feeling"
  | "usage_cost"
  | "quality_lifespan"
  | "risk_trust"
  | "relationship_expression"
  | "time_limit"
  | "exclusion"

type NeedItem = {
  id: string
  dimension: NeedDimension
  statement: string
  priority: "must" | "important" | "optional" | "unranked"
  status: ReviewStatus
  source: InformationSource
  updatedAtTurn: number
}
```

预算同时保留结构化字段，以便后续推荐能力直接读取：

```ts
type Budget = {
  currency: "CNY"
  min: number | null
  preferred: number | null
  max: number | null
  flexibility: "fixed" | "slightly_flexible" | "flexible" | "unknown"
  attitude: string | null
}
```

### 8.4 认知缺口

```ts
type CognitionItem = {
  id: string
  statement: string
  kind: "confirmed_information" | "consumer_assumption" | "unknown"
  impactAreas: NeedDimension[]
  impactLevel: "high" | "medium" | "low"
  resolved: boolean
  updatedAtTurn: number
}
```

只有 `impactLevel` 为 `high` 且答案可能改变需求方向的项目，才有资格占用主动追问轮次。

### 8.5 完整会话状态

```ts
type ConversationPhase =
  | "outline"
  | "direct_needs"
  | "cognition_gap"
  | "card_review"
  | "complete"

type NeedUnderstandingState = {
  schemaVersion: 1
  sessionId: string
  phase: ConversationPhase
  clarificationCount: number
  cognitionQuestionCount: number
  askedTopics: QuestionTopic[]
  actors: Actor[]
  roles: RoleAssignments
  purchaseGoal: TrackedField<string>
  budget: TrackedField<Budget>
  needs: NeedItem[]
  cognitionItems: CognitionItem[]
}
```

## 9. 用户事件与接口

### 9.1 统一事件

所有交互通过同一事件模型进入控制器：

```ts
type ConversationEvent =
  | { type: "initial_message"; text: string }
  | { type: "answer"; text: string }
  | { type: "select_options"; optionIds: string[]; otherText?: string }
  | { type: "edit_card"; edits: CardEdit[] }
  | { type: "continue_clarification" }
  | { type: "confirm_card" }
```

卡片编辑是显式事件，优先级高于模型推断，不伪装成一条普通对话消息。

### 9.2 单轮接口

```text
POST /api/conversation/turn
```

请求：

```json
{
  "state": {},
  "recentMessages": [],
  "event": {
    "type": "answer",
    "text": "主要是他自己用"
  }
}
```

响应：

```json
{
  "state": {},
  "assistantMessage": "下面哪些方向对这次购买最重要？",
  "nextAction": "ask",
  "question": {
    "topic": "priority_tradeoff",
    "type": "multi_select",
    "options": []
  },
  "publicCard": {},
  "canConfirm": false
}
```

请求和响应都通过运行时 Schema 校验。服务端不信任浏览器传回的状态结构。

## 10. 单轮处理流程

```text
接收用户事件
    ↓
校验请求和旧状态
    ↓
事件路由
    ├─ edit_card：确定性更新状态并返回卡片
    ├─ confirm_card：切换为 complete 并返回
    └─ initial_message / answer / select_options / continue_clarification
                              ↓
                     构造紧凑模型输入
    ↓
模型返回状态补丁和候选问题
    ↓
校验模型结果
    ↓
按合并规则应用状态补丁
    ↓
过滤重复、低价值或越界问题
    ↓
代码判断阶段、轮次和停止条件
    ↓
从内部状态生成用户卡片
    ↓
返回界面响应
```

卡片编辑和最终确认不调用模型。只有初始输入、问题回答、候选项选择和用户主动继续澄清时才进入模型流程。

模型输出第一次未通过 Schema 校验时，可以使用同一输入重试一次。第二次仍失败则保留当前状态，返回可重试错误，不清空会话。

## 11. 状态补丁与合并规则

模型只返回需要新增、更新或删除的字段补丁，不重写完整状态。

```ts
type ModelStatePatch = {
  actors?: ActorPatch[]
  roles?: Partial<RoleAssignments>
  purchaseGoal?: TrackedFieldPatch<string>
  budget?: TrackedFieldPatch<Budget>
  needOperations?: NeedOperation[]
  cognitionOperations?: CognitionOperation[]
}
```

合并优先级：

```text
用户卡片编辑
    > 用户当前轮明确修正
    > 用户此前确认内容
    > 消费者对目标者的推测
    > 模型待确认假设
    > 未知
```

确定性规则：

1. 模型不能覆盖没有被用户修正的已确认字段。
2. `unknown` 不能覆盖已有值。
3. 相同维度和同义内容需要去重。
4. 用户否定某项后，将其删除或转为排除项，不能在下一轮重新添加。
5. 用户回答“不确定”时记录主题已问，但不生成虚假字段值。
6. 角色只能引用已经存在的参与者 ID。
7. 卡片编辑产生冲突时，以编辑结果为准，并删除冲突的模型假设。

## 12. 问题候选与选择

问题主题使用有限枚举，不能由模型自由命名：

```ts
type QuestionTopic =
  | "target_identity"
  | "relationship"
  | "role_assignment"
  | "desired_outcome"
  | "budget"
  | "usage_context"
  | "hard_constraint"
  | "preference"
  | "priority_tradeoff"
  | "exclusion"
  | "relationship_expression"
  | "target_behavior"
  | "prior_experience"
  | "capability_fit"
  | "co_user_context"
```

模型单次调用最多提出三个候选问题：

```ts
type QuestionCandidate = {
  topic: QuestionTopic
  question: string
  options: Array<{ id: string; label: string }>
  impactAreas: NeedDimension[]
  impact: 1 | 2 | 3
  uncertainty: 1 | 2 | 3
  answerability: 1 | 2 | 3
  effort: 1 | 2 | 3
}
```

控制器先过滤：

- 已经存在于 `askedTopics` 的主题。
- 不能改变需求方向的问题。
- 依赖人口标签直接推断偏好的问题。
- 超过当前阶段允许范围的问题。
- 第三层次数已达到上限后的认知问题。

剩余候选按以下分数选择：

```text
score = impact × uncertainty × answerability ÷ effort
```

缺少核心字段的问题可获得确定性优先加权。界面固定追加“其他”和“不确定”，模型只生成最多四个有语义的选项。

## 13. 阶段转换与停止规则

### 13.1 角色轮廓完成

满足以下条件时可以离开 `outline`：

- 已存在主要目标者。
- 已知目标者与消费者的关系，或明确为自用。
- 已知主要使用者。
- 已知购买者或决策者中的至少一项。

### 13.2 直接需求足够

满足以下条件时可以离开 `direct_needs`：

- 已有购买目标。
- 已有预算数值或价格态度。
- 已有主要使用情境。
- 已有优先级、硬性限制或排除项中的至少一项。

### 13.3 是否进入认知补全

仅在存在未解决的高影响 `CognitionItem`，且第三层次数未达到上限时进入 `cognition_gap`。否则直接进入 `card_review`。

### 13.4 强制停止

满足任一条件时进入 `card_review`：

- 没有高价值候选问题。
- `clarificationCount >= 5`。
- 用户主动要求查看卡片。
- 核心状态已经足够且认知缺口均为中低影响。

用户确认卡片后进入 `complete`。用户选择继续补充时可以从 `card_review` 返回最相关阶段，但不得自动清零计数并无限延长会话。

## 14. 模型调用设计

### 14.1 模型适配器

```ts
interface NeedUnderstandingModel {
  analyzeTurn(input: ModelTurnInput): Promise<ModelTurnResult>
}
```

业务代码只依赖该接口。真实供应商实现和测试用模拟实现分别注入，避免模型 SDK 扩散到领域代码。

### 14.2 单次调用输入

每轮输入只包含：

- 三层需求的紧凑状态。
- 已问主题。
- 最近对话消息。
- 当前用户事件。
- 当前阶段和剩余澄清次数。
- 有限候选需求词典。
- 输出 Schema。

不要求模型输出隐藏推理过程，只要求状态补丁、候选问题、影响维度和简短用户文案。

### 14.3 提示词规则

提示词固定要求：

1. 不生成商品、品牌或选购方案。
2. 不重复已问主题。
3. 不根据人口标签直接推断偏好。
4. 消费者对目标者的判断默认为消费者推测，除非有明确行为或直接表达。
5. 每个候选问题必须关联可能受影响的需求维度。
6. 问题只包含一个主题。
7. 问题简短，候选项互斥且可理解。
8. 无高价值问题时返回进入卡片确认。

提示词使用显式版本常量，例如 `need-understanding-v1`，测试记录关联版本，便于后续比较效果。

## 15. 用户卡片映射

用户卡片由代码从内部状态确定性生成，不让模型另外撰写一份卡片。

```ts
type PublicNeedCard = {
  purchasePurpose: {
    goal: string | null
    scenario: string | null
  }
  target: {
    identity: string | null
    relationship: string | null
    roleSummary: string | null
  }
  confirmedNeeds: Array<{
    id: string
    label: string
    value: string
  }>
  pendingQuestions: Array<{
    id: string
    text: string
  }>
}
```

映射规则：

- `confirmed` 内容进入“已经明确的需求”。
- 仍可能影响选择的 `tentative` 内容进入“还需要确认”。
- 模型假设不进入“已经明确的需求”。
- 高影响且未解决的认知项进入“还需要确认”。
- 不展示字段来源、置信度、更新轮次和模型形成说明。
- 相同参与者承担多个角色时合并成一句角色摘要。

## 16. 前端状态与组件

### 16.1 页面状态

页面使用 `useReducer` 维护：

- 当前会话状态。
- 消息列表。
- 当前问题和候选项。
- 用户卡片。
- 加载和错误状态。
- 卡片编辑草稿。

服务端成功响应后一次性替换已校验的状态与用户卡片，避免多处局部更新产生不同步。

### 16.2 关键交互

- 提交消息后暂时禁用重复提交。
- 候选项支持键盘操作和清晰焦点状态。
- “其他”展开自由输入。
- “不确定”作为明确答案发送。
- 第二轮后在桌面端常驻显示卡片。
- 移动端提供可展开卡片摘要。
- 卡片编辑先形成草稿，保存时发送 `edit_card` 事件。
- 错误重试不能重复增加澄清计数。

## 17. 当前会话保存

原型将以下内容保存到 `sessionStorage`：

- 当前状态。
- 短对话记录。
- 当前问题。
- 用户卡片。

页面刷新后恢复当前会话；关闭浏览器标签页后不保证保留。模型密钥和服务端配置不进入浏览器。

浏览器存储仅用于原型便利，不作为生产环境的数据安全边界。原型默认不在服务端日志记录完整用户对话内容。

## 18. 错误处理

| 错误 | 行为 |
| --- | --- |
| 用户输入为空 | 前端阻止提交 |
| 请求 Schema 无效 | 返回可理解的输入错误，不调用模型 |
| 模型调用超时或失败 | 保留状态，允许重试当前事件 |
| 模型结果不符合 Schema | 重试一次，仍失败则返回恢复性错误 |
| 模型提出重复主题 | 控制器过滤并选择下一候选 |
| 没有合法候选问题 | 进入卡片确认 |
| 状态补丁试图覆盖确认字段 | 拒绝该字段更新并保留原值 |
| sessionStorage 数据损坏 | 丢弃损坏会话并安全开始新会话 |

## 19. 测试策略

### 19.1 单元测试

- 初始状态创建。
- 参与者与角色合并。
- 自用场景角色自动合并。
- 状态补丁优先级。
- 已确认字段保护。
- 需求项去重与删除。
- 卡片编辑覆盖模型假设。
- 阶段转换。
- 五次澄清停止。
- 第三层次数限制。
- 重复主题过滤。
- 用户卡片映射不泄露内部字段。

### 19.2 接口契约测试

使用模拟模型适配器覆盖：

- 合法结构化响应。
- 缺失字段。
- 非法枚举。
- 过多候选项。
- 重复问题。
- 越权商品推荐。
- 模型调用错误与重试。

### 19.3 浏览器端到端测试

至少自动走通一条固定模型响应的主路径：

```text
送礼模糊输入
→ 使用角色确认
→ 直接需求选择
→ 行为事实追问
→ 需求卡片
→ 修改预算
→ 确认完成
```

### 19.4 真实模型场景测试

使用相同评分表人工评估：

1. 为刚退休的父亲购买礼物。
2. 自用居家办公问题。
3. 多人共同使用。
4. 用户不知道目标者偏好。
5. 用户中途修改预算。
6. 用户否定模型推测。
7. 人口标签容易引发刻板推断的输入。
8. 五轮后仍存在未知信息。

记录每个场景的轮次、重复主题、卡片错误、重要遗漏、无价值问题和用户修正。

## 20. 实施顺序

### 阶段 A：应用骨架与静态界面

- 创建全栈 TypeScript 应用。
- 完成开始页、对话区和需求卡片布局。
- 使用固定数据走通桌面与移动端交互。

通过条件：不接模型也能完整演示页面状态和卡片编辑。

### 阶段 B：领域状态与控制器

- 实现 Schema、初始状态和 reducer。
- 实现参与者与角色分配。
- 实现状态补丁、优先级和卡片映射。
- 实现阶段转换、轮次和重复问题规则。

通过条件：单元测试覆盖所有确定性业务规则。

### 阶段 C：模型接口

- 实现模型适配器接口和模拟实现。
- 实现真实模型供应商适配器。
- 实现提示词、结构化输出和一次重试。
- 接入单轮 Route Handler。

通过条件：两个主演示场景能够通过真实模型形成结构有效的需求卡片。

### 阶段 D：完整交互与恢复

- 接入候选项和自由输入。
- 接入卡片编辑事件。
- 实现 sessionStorage 恢复。
- 完成加载、失败和重试状态。

通过条件：刷新页面、模型失败和用户修改后，需求状态保持一致。

### 阶段 E：验证

- 完成单元、契约和端到端测试。
- 运行八类真实模型场景。
- 按产品指标记录问题并调整提示词或控制规则。

通过条件：不存在阻断主演示路径的工程问题，并能明确判断产品假设是否获得初步支持。

## 21. 原型完成标准

- 应用可以本地启动。
- 用户能够从模糊输入走到需求卡片确认。
- 前两轮能在信息允许时形成目标角色轮廓。
- 主动澄清不会超过五次。
- 第三层默认不超过一次，最多不超过两次。
- 已问主题不会重复出现。
- 用户回答“不确定”不会被模型擅自补全。
- 用户修改卡片后状态同步且旧冲突内容失效。
- 用户卡片不展示内部状态和形成过程。
- 模型结果无效或调用失败时不会丢失已有状态。
- 自动化测试覆盖确定性规则和主演示路径。
- 功能不进入商品推荐、选购方案和交易范围。

## 22. 主要风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 模型提取错误 | 卡片内容不准确 | 结构化输出、用户编辑、确认字段保护 |
| 候选需求不相关 | 增加对话负担 | 有限词典、候选评分、场景评估 |
| 第三层问题过度揣测 | 用户不信任或产生刻板推断 | 行为证据优先、次数限制、模型假设不可直接确认 |
| 五轮内信息不足 | 卡片不完整 | 保留高影响待确认项，允许用户主动继续 |
| 状态与对话冲突 | 旧信息重新出现 | 统一状态源、补丁合并优先级、编辑事件最高优先 |
| 模型输出不稳定 | 接口失败 | 运行时 Schema、一次重试、模拟适配器测试 |
| 原型范围继续扩大 | 推迟核心验证 | 保持商品推荐和长期画像为明确非范围 |

## 23. 开发前剩余决定

以下事项不阻止创建应用骨架，可以在接入真实模型前确定：

- 首个模型供应商和模型配置。
- 本地开发所使用的环境变量名称。
- 自动化测试具体工具。
- 原型视觉风格和品牌色。

除此之外，领域模型、接口边界、状态控制、页面结构、错误恢复和测试范围已经足以开始初步实现。

## 24. 技术参考

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Zod](https://zod.dev/)
