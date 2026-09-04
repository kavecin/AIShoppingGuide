import type {
  Budget,
  ConversationEvent,
  ModelStatePatch,
  ModelTurnInput,
  ModelTurnResult,
  NeedDimension,
  NeedItem,
  QuestionCandidate,
  QuestionOption,
} from "@/domain/need-understanding/types"
import type { NeedUnderstandingModel } from "./adapter"

const emptyPatch = (): ModelStatePatch => ({
  actorUpserts: [],
  roleAssignments: {},
  purchaseGoal: null,
  budget: null,
  needOperations: [],
  cognitionOperations: [],
})

const eventText = (event: ConversationEvent) => {
  if (event.type === "initial_message" || event.type === "answer") return event.text
  if (event.type === "select_options") {
    return [...event.options.map((option) => option.label), event.otherText]
      .filter(Boolean)
      .join("；")
  }
  return ""
}

const parseBudget = (text: string): Budget | null => {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(?:元|块|人民币)?/)
  if (!match) return null
  const preferred = Number(match[1])
  if (!Number.isFinite(preferred)) return null
  return {
    currency: "CNY",
    min: null,
    preferred,
    max: preferred,
    flexibility: /左右|大约|差不多/.test(text) ? "slightly_flexible" : "unknown",
    attitude: null,
  }
}

const option = (id: string, label: string): QuestionOption => ({ id, label })

const candidate = (
  topic: QuestionCandidate["topic"],
  question: string,
  type: QuestionCandidate["type"],
  options: QuestionOption[],
  impactAreas: NeedDimension[],
  impact: 1 | 2 | 3 = 3,
): QuestionCandidate => ({
  topic,
  question,
  type,
  options,
  impactAreas,
  impact,
  uncertainty: 3,
  answerability: 3,
  effort: 1,
})

const needFromLabel = (label: string, turn: number): NeedItem => {
  let dimension: NeedDimension = "desired_outcome"
  if (/操作|学习|简单|方便/.test(label)) dimension = "usage_cost"
  else if (/纪念|心意|礼物/.test(label)) dimension = "relationship_expression"
  else if (/品质|耐用/.test(label)) dimension = "quality_lifespan"
  else if (/空间|收纳/.test(label)) dimension = "hard_constraint"
  else if (/预算|价格/.test(label)) dimension = "budget_value"

  return {
    id: `need-${dimension}-${label.slice(0, 8)}`,
    dimension,
    statement: label,
    priority: "important",
    status: "confirmed",
    source: "user_explicit",
    updatedAtTurn: turn,
  }
}

const hasSelfUseCue = (text: string) =>
  /我想改善|我自己|自用|给自己|我在家|我需要/.test(text)

const isUnknownReply = (text: string) =>
  /不确定|不知道|不清楚|没注意|说不好/.test(text)

const relationshipFromText = (text: string) => {
  if (/爸爸|父亲|老爸/.test(text)) return { label: "爸爸", relationship: "父亲" }
  if (/妈妈|母亲|老妈/.test(text)) return { label: "妈妈", relationship: "母亲" }
  if (/伴侣|爱人|丈夫|妻子|男朋友|女朋友/.test(text)) {
    return { label: "伴侣", relationship: "伴侣" }
  }
  if (/朋友/.test(text)) return { label: "朋友", relationship: "朋友" }
  if (/同事/.test(text)) return { label: "同事", relationship: "同事" }
  return null
}

const initialTurn = (input: ModelTurnInput): ModelTurnResult => {
  const text = eventText(input.event)
  const turn = input.state.clarificationCount
  const patch = emptyPatch()
  const budget = parseBudget(text)
  if (budget) {
    patch.budget = {
      value: budget,
      status: "confirmed",
      source: "user_explicit",
      updatedAtTurn: turn,
    }
  }

  if (hasSelfUseCue(text)) {
    patch.roleAssignments = {
      buyerIds: ["consumer"],
      payerIds: ["consumer"],
      decisionMakerIds: ["consumer"],
      recipientIds: ["consumer"],
      userIds: ["consumer"],
    }
    patch.purchaseGoal = {
      value: text,
      status: "confirmed",
      source: "user_explicit",
      updatedAtTurn: turn,
    }
    patch.needOperations.push({
      operation: "upsert",
      item: {
        id: "need-usage-self",
        dimension: "usage_context",
        statement: /办公/.test(text) ? "在家办公时使用" : "由自己日常使用",
        priority: "important",
        status: "confirmed",
        source: "user_explicit",
        updatedAtTurn: turn,
      },
    })

    if (!budget) {
      const question = candidate(
        "budget",
        "你希望把预算控制在什么范围？不确定也没关系。",
        "free_text",
        [],
        ["budget_value"],
      )
      return {
        statePatch: patch,
        assistantMessage: question.question,
        nextAction: "ask",
        questionCandidates: [question],
      }
    }

    const question = candidate(
      "priority_tradeoff",
      "这次改善中，你最希望优先保留哪些体验？最多选两项。",
      "multi_select",
      [
        option("comfort", "缓解身体不适"),
        option("space", "尽量节省空间"),
        option("adjust", "容易调整和使用"),
        option("value", "控制总体预算"),
      ],
      ["desired_outcome", "hard_constraint", "usage_cost", "budget_value"],
    )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  const relation = relationshipFromText(text)
  if (relation) {
    patch.actorUpserts.push({
      id: "target-1",
      label: relation.label,
      relationshipToConsumer: relation.relationship,
      identitySummary: /刚退休|退休/.test(text) ? "刚退休" : null,
    })
    patch.roleAssignments = {
      buyerIds: ["consumer"],
      payerIds: ["consumer"],
      decisionMakerIds: ["consumer"],
      recipientIds: ["target-1"],
    }
    patch.purchaseGoal = {
      value: `为${relation.label}梳理这次购买需求`,
      status: "confirmed",
      source: "user_explicit",
      updatedAtTurn: turn,
    }
    const question = candidate(
      "role_assignment",
      `这件东西主要由${relation.label}自己使用吗？`,
      "single_select",
      [
        option("target-only", `是，主要由${relation.label}自己用`),
        option("shared", "我们会一起用"),
      ],
      ["usage_context"],
    )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  const question = candidate(
    "target_identity",
    "这次主要是给谁购买或使用？",
    "single_select",
    [
      option("self", "我自己"),
      option("family", "家人"),
      option("friend", "朋友或同事"),
    ],
    ["usage_context"],
  )
  patch.purchaseGoal = {
    value: text,
    status: "confirmed",
    source: "user_explicit",
    updatedAtTurn: turn,
  }
  return {
    statePatch: patch,
    assistantMessage: question.question,
    nextAction: "ask",
    questionCandidates: [question],
  }
}

const followUpTurn = (input: ModelTurnInput): ModelTurnResult => {
  const patch = emptyPatch()
  const text = eventText(input.event)
  const turn = input.state.clarificationCount
  const lastTopic = input.state.askedTopics.at(-1)
  const target = input.state.actors.find((actor) => actor.id !== "consumer")

  if (input.event.type === "continue_clarification") {
    patch.cognitionOperations.push({
      operation: "upsert",
      item: {
        id: "cognition-prior-experience",
        statement: target
          ? `过去为${target.label}做过的相似选择及反馈还不明确`
          : "过去解决同类问题的尝试和结果还不明确",
        kind: "unknown",
        impactAreas: ["exclusion", "desired_outcome"],
        impactLevel: "high",
        resolved: false,
        updatedAtTurn: turn,
      },
    })
    const question = candidate(
      "prior_experience",
      target
        ? `过去给${target.label}买过或尝试过类似方向吗？对方当时最喜欢或最不喜欢什么？`
        : "过去尝试过哪些解决办法？其中最有效或最不满意的是什么？",
      "free_text",
      [],
      ["exclusion", "desired_outcome"],
      2,
    )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  if (lastTopic === "target_identity") {
    const selfUse = /自己/.test(text)
    if (selfUse) {
      patch.roleAssignments = {
        buyerIds: ["consumer"],
        payerIds: ["consumer"],
        decisionMakerIds: ["consumer"],
        recipientIds: ["consumer"],
        userIds: ["consumer"],
      }
    } else {
      patch.actorUpserts.push({
        id: "target-1",
        label: text || "目标者",
        relationshipToConsumer: text || "待补充",
        identitySummary: null,
      })
      patch.roleAssignments = {
        buyerIds: ["consumer"],
        decisionMakerIds: ["consumer"],
        recipientIds: ["target-1"],
      }
    }
    const question = candidate(
      selfUse ? "usage_context" : "role_assignment",
      selfUse ? "这次主要会在什么情境下使用？" : "主要由对方自己使用吗？",
      "free_text",
      [],
      ["usage_context"],
    )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  if (lastTopic === "role_assignment") {
    const targetId = target?.id ?? "target-1"
    const shared = /一起|共同/.test(text)
    const unknown = isUnknownReply(text)
    patch.roleAssignments = {
      userIds: unknown ? [] : shared ? [targetId, "consumer"] : [targetId],
      coUserOrInfluencerIds: shared ? ["consumer"] : [],
    }
    patch.needOperations.push({
      operation: "upsert",
      item: {
        id: "need-usage-role",
        dimension: "usage_context",
        statement: unknown
          ? "主要使用者暂不确定"
          : shared
            ? "消费者与目标者共同使用"
            : "主要由目标者日常使用",
        priority: "important",
        status: unknown ? "tentative" : "confirmed",
        source: "user_explicit",
        updatedAtTurn: turn,
      },
    })
    const question = candidate(
      "priority_tradeoff",
      `结合你对${target?.label ?? "对方"}的了解，下面哪些方向最重要？最多选两项。`,
      "multi_select",
      [
        option("daily", "日常确实用得上"),
        option("simple", "操作简单"),
        option("meaningful", "有纪念意义"),
        option("durable", "品质耐用"),
      ],
      ["desired_outcome", "usage_cost", "relationship_expression", "quality_lifespan"],
    )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  if (lastTopic === "budget") {
    const budget = parseBudget(text)
    if (budget) {
      patch.budget = {
        value: budget,
        status: "confirmed",
        source: "user_explicit",
        updatedAtTurn: turn,
      }
    } else {
      patch.needOperations.push({
        operation: "upsert",
        item: {
          id: "need-budget-attitude",
          dimension: "budget_value",
          statement: "预算暂不确定",
          priority: "unranked",
          status: "tentative",
          source: "user_explicit",
          updatedAtTurn: turn,
        },
      })
    }
    const question = candidate(
      "priority_tradeoff",
      "这次你最希望优先保留哪些体验？最多选两项。",
      "multi_select",
      [
        option("effective", "解决当前问题"),
        option("simple", "使用简单"),
        option("space", "节省空间"),
        option("value", "控制预算"),
      ],
      ["desired_outcome", "usage_cost", "hard_constraint", "budget_value"],
    )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  if (lastTopic === "usage_context") {
    patch.needOperations.push({
      operation: "upsert",
      item: {
        id: "need-usage-context",
        dimension: "usage_context",
        statement: text || "使用情境待进一步确认",
        priority: "important",
        status: text ? "confirmed" : "tentative",
        source: "user_explicit",
        updatedAtTurn: turn,
      },
    })
    const topic = input.state.budget.value ? "priority_tradeoff" : "budget"
    const question =
      topic === "budget"
        ? candidate(
            "budget",
            "你希望把预算控制在什么范围？不确定也没关系。",
            "free_text",
            [],
            ["budget_value"],
          )
        : candidate(
            "priority_tradeoff",
            "这次最重要的目标是什么？最多选两项。",
            "multi_select",
            [
              option("effective", "实际解决问题"),
              option("simple", "使用简单"),
              option("durable", "品质耐用"),
              option("value", "控制预算"),
            ],
            ["desired_outcome", "usage_cost", "quality_lifespan", "budget_value"],
          )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  if (lastTopic === "priority_tradeoff") {
    const labels =
      input.event.type === "select_options"
        ? input.event.options.map((selected) => selected.label)
        : [text].filter(Boolean)
    for (const label of labels) {
      patch.needOperations.push({ operation: "upsert", item: needFromLabel(label, turn) })
    }
    patch.cognitionOperations.push({
      operation: "upsert",
      item: {
        id: "cognition-main-behavior",
        statement: target
          ? `${target.label}最近最愿意持续投入的活动还不明确`
          : "当前实际使用行为还不明确",
        kind: "unknown",
        impactAreas: ["desired_outcome", "usage_context"],
        impactLevel: "high",
        resolved: false,
        updatedAtTurn: turn,
      },
    })
    const question = candidate(
      "target_behavior",
      target
        ? `你最近看到${target.label}最常主动花时间做什么？`
        : "你通常在什么情况下最明显感受到这个问题？",
      "free_text",
      [],
      ["desired_outcome", "usage_context"],
    )
    return {
      statePatch: patch,
      assistantMessage: question.question,
      nextAction: "ask",
      questionCandidates: [question],
    }
  }

  if (lastTopic === "target_behavior") {
    const unknown = isUnknownReply(text)
    patch.needOperations.push({
      operation: "upsert",
      item: {
        id: "need-observed-behavior",
        dimension: "usage_context",
        statement: unknown || !text ? "实际行为暂不确定" : text,
        priority: "important",
        status: unknown || !text ? "tentative" : "confirmed",
        source: "user_explicit",
        updatedAtTurn: turn,
      },
    })
    patch.cognitionOperations.push({
      operation: "upsert",
      item: {
        id: "cognition-main-behavior",
        statement: unknown || !text ? "实际行为暂不确定" : text,
        kind: unknown || !text ? "unknown" : "confirmed_information",
        impactAreas: ["desired_outcome", "usage_context"],
        impactLevel: "high",
        resolved: Boolean(text) && !unknown,
        updatedAtTurn: turn,
      },
    })
    return {
      statePatch: patch,
      assistantMessage: "需求已经足够形成第一版卡片，你可以检查并修改其中的内容。",
      nextAction: "review",
      questionCandidates: [],
    }
  }

  if (lastTopic === "prior_experience") {
    const unknown = isUnknownReply(text)
    patch.cognitionOperations.push({
      operation: "upsert",
      item: {
        id: "cognition-prior-experience",
        statement: unknown || !text ? "过往相似选择及反馈暂不明确" : text,
        kind: unknown || !text ? "unknown" : "confirmed_information",
        impactAreas: ["exclusion", "desired_outcome"],
        impactLevel: "high",
        resolved: Boolean(text) && !unknown,
        updatedAtTurn: turn,
      },
    })
    return {
      statePatch: patch,
      assistantMessage: "补充信息已更新到需求理解中，请再次检查这张卡片。",
      nextAction: "review",
      questionCandidates: [],
    }
  }

  return {
    statePatch: patch,
    assistantMessage: "我已经整理出第一版需求卡片，请检查是否准确。",
    nextAction: "review",
    questionCandidates: [],
  }
}

export class MockModelProvider implements NeedUnderstandingModel {
  readonly providerName = "mock" as const

  async analyzeTurn(input: ModelTurnInput): Promise<ModelTurnResult> {
    if (input.event.type === "initial_message") return initialTurn(input)
    return followUpTurn(input)
  }
}
