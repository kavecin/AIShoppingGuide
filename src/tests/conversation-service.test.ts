import { describe, expect, it } from "vitest"
import { createInitialState } from "@/domain/need-understanding/initial-state"
import { processConversationTurn } from "@/server/conversation-service"
import { MockModelProvider } from "@/server/model/mock-provider"
import type {
  ConversationEvent,
  ConversationTurnResponse,
  Message,
} from "@/domain/need-understanding/types"

describe("gift dialogue", () => {
  it("forms an editable card after three focused clarification questions", async () => {
    const model = new MockModelProvider()
    let state = createInitialState("dialogue-test")
    const messages: Message[] = []

    const turn = async (event: ConversationEvent) => {
      const response = await processConversationTurn(
        { state, recentMessages: messages, event },
        model,
      )
      state = response.state
      if (event.type === "initial_message" || event.type === "answer") {
        messages.push({ id: `user-${messages.length}`, role: "user", content: event.text })
      }
      messages.push({
        id: `assistant-${messages.length}`,
        role: "assistant",
        content: response.assistantMessage,
      })
      return response
    }

    let response: ConversationTurnResponse = await turn({
      type: "initial_message",
      text: "我想给刚退休的爸爸买件东西，预算大约 2000 元，但不知道买什么。",
    })
    expect(response.question?.topic).toBe("role_assignment")
    expect(response.state.clarificationCount).toBe(1)

    response = await turn({
      type: "select_options",
      options: [{ id: "target-only", label: "是，主要由爸爸自己用" }],
    })
    expect(response.question?.topic).toBe("priority_tradeoff")

    response = await turn({
      type: "select_options",
      options: [
        { id: "daily", label: "日常确实用得上" },
        { id: "simple", label: "操作简单" },
      ],
    })
    expect(response.question?.topic).toBe("target_behavior")

    response = await turn({
      type: "answer",
      text: "他最近每天都会花时间照顾阳台上的花。",
    })
    expect(response.nextAction).toBe("review")
    expect(response.canConfirm).toBe(true)
    expect(response.publicCard.target).toMatchObject({
      label: "爸爸",
      relationship: "父亲",
      identity: "刚退休",
    })
    expect(response.publicCard.confirmedNeeds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "budget", value: "预算约 ¥2,000" }),
        expect.objectContaining({ value: "日常确实用得上" }),
        expect.objectContaining({ value: "操作简单" }),
      ]),
    )
    expect(JSON.stringify(response.publicCard)).not.toContain("source")
    expect(JSON.stringify(response.publicCard)).not.toContain("confidence")

    response = await turn({ type: "confirm_card" })
    expect(response.nextAction).toBe("complete")
    expect(response.state.phase).toBe("complete")
  })

  it("keeps an unknown answer visible instead of treating it as confirmed", async () => {
    const model = new MockModelProvider()
    let state = createInitialState("unknown-test")

    const first = await processConversationTurn(
      {
        state,
        recentMessages: [],
        event: {
          type: "initial_message",
          text: "我想给刚退休的爸爸买礼物，预算 2000 元。",
        },
      },
      model,
    )
    state = first.state
    const second = await processConversationTurn(
      {
        state,
        recentMessages: [],
        event: {
          type: "select_options",
          options: [{ id: "target-only", label: "是，主要由爸爸自己用" }],
        },
      },
      model,
    )
    state = second.state
    const third = await processConversationTurn(
      {
        state,
        recentMessages: [],
        event: {
          type: "select_options",
          options: [{ id: "daily", label: "日常确实用得上" }],
        },
      },
      model,
    )
    state = third.state
    const last = await processConversationTurn(
      {
        state,
        recentMessages: [],
        event: { type: "answer", text: "我还不确定" },
      },
      model,
    )

    expect(last.state.cognitionItems[0]).toMatchObject({
      kind: "unknown",
      resolved: false,
    })
    expect(last.publicCard.pendingQuestions.length).toBeGreaterThan(0)
  })

  it("rejects premature confirmation and supports one more clarification", async () => {
    const model = new MockModelProvider()
    const initial = createInitialState("guard-test")

    const rejected = await processConversationTurn(
      {
        state: initial,
        recentMessages: [],
        event: { type: "confirm_card" },
      },
      model,
    )
    expect(rejected.nextAction).toBe("review")
    expect(rejected.canConfirm).toBe(false)
    expect(rejected.state.phase).not.toBe("complete")

    const reviewable = createInitialState("continue-test")
    reviewable.clarificationCount = 3
    reviewable.cognitionQuestionCount = 1
    reviewable.askedTopics = ["role_assignment", "priority_tradeoff", "target_behavior"]
    reviewable.phase = "card_review"

    const continued = await processConversationTurn(
      {
        state: reviewable,
        recentMessages: [],
        event: { type: "continue_clarification" },
      },
      model,
    )
    expect(continued.nextAction).toBe("ask")
    expect(continued.question?.topic).toBe("prior_experience")
    expect(continued.state.clarificationCount).toBe(4)
  })
})
