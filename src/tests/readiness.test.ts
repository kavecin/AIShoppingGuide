import { describe, expect, it } from "vitest"
import { createInitialState } from "@/domain/need-understanding/initial-state"
import { chooseQuestion } from "@/domain/need-understanding/question-policy"
import {
  canReviewCard,
  mustReviewCard,
} from "@/domain/need-understanding/readiness"
import type {
  NeedUnderstandingState,
  QuestionCandidate,
} from "@/domain/need-understanding/types"

const readyState = (): NeedUnderstandingState => {
  const state = createInitialState("ready-test")
  state.actors.push({
    id: "target",
    label: "爸爸",
    relationshipToConsumer: "父亲",
    identitySummary: "刚退休",
  })
  state.roles.buyerIds = ["consumer"]
  state.roles.recipientIds = ["target"]
  state.roles.userIds = ["target"]
  state.purchaseGoal = {
    value: "准备退休礼物",
    status: "confirmed",
    source: "user_explicit",
    updatedAtTurn: 1,
  }
  state.budget = {
    value: {
      currency: "CNY",
      min: null,
      preferred: 2000,
      max: 2000,
      flexibility: "slightly_flexible",
      attitude: null,
    },
    status: "confirmed",
    source: "user_explicit",
    updatedAtTurn: 1,
  }
  state.needs = [
    {
      id: "usage",
      dimension: "usage_context",
      statement: "由爸爸日常使用",
      priority: "important",
      status: "confirmed",
      source: "user_explicit",
      updatedAtTurn: 2,
    },
    {
      id: "outcome",
      dimension: "desired_outcome",
      statement: "日常确实用得上",
      priority: "important",
      status: "confirmed",
      source: "user_explicit",
      updatedAtTurn: 3,
    },
  ]
  return state
}

const question = (
  topic: QuestionCandidate["topic"],
  impact: 1 | 2 | 3 = 3,
): QuestionCandidate => ({
  topic,
  question: `关于 ${topic} 的问题`,
  type: "free_text",
  options: [],
  impactAreas: ["desired_outcome"],
  impact,
  uncertainty: 3,
  answerability: 3,
  effort: 1,
})

describe("readiness", () => {
  it("allows review only after outline and direct needs have anchors", () => {
    const state = readyState()
    expect(canReviewCard(state)).toBe(true)
    expect(mustReviewCard(state)).toBe(false)

    state.cognitionQuestionCount = 1
    expect(mustReviewCard(state)).toBe(true)

    state.cognitionItems.push({
      id: "gap",
      statement: "最近真实行为还不明确",
      kind: "unknown",
      impactAreas: ["usage_context"],
      impactLevel: "high",
      resolved: false,
      updatedAtTurn: 3,
    })
    expect(mustReviewCard(state)).toBe(false)
  })

  it("enforces the five-question hard stop", () => {
    const state = readyState()
    state.clarificationCount = 5

    expect(chooseQuestion(state, [question("target_behavior")])).toBeNull()
    expect(mustReviewCard(state)).toBe(true)
  })

  it("filters repeated, low-impact and excess cognition questions", () => {
    const state = readyState()
    state.askedTopics = ["budget"]
    state.cognitionQuestionCount = 2

    const selected = chooseQuestion(state, [
      question("budget"),
      question("target_behavior"),
      question("preference", 1),
      question("hard_constraint"),
    ])

    expect(selected?.topic).toBe("hard_constraint")
  })
})
