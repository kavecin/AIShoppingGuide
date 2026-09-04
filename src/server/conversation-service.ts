import { applyCardEdits, mergeModelPatch } from "@/domain/need-understanding/merge-patch"
import { toPublicNeedCard } from "@/domain/need-understanding/public-card"
import { chooseQuestion } from "@/domain/need-understanding/question-policy"
import {
  canReviewCard,
  isCognitionTopic,
  mustReviewCard,
} from "@/domain/need-understanding/readiness"
import type {
  ConversationPhase,
  ConversationTurnRequest,
  ConversationTurnResponse,
  QuestionTopic,
} from "@/domain/need-understanding/types"
import type { NeedUnderstandingModel } from "./model/adapter"

const outlineTopics = new Set<QuestionTopic>([
  "target_identity",
  "relationship",
  "role_assignment",
])

const phaseForQuestion = (topic: QuestionTopic): ConversationPhase => {
  if (outlineTopics.has(topic)) return "outline"
  if (isCognitionTopic(topic)) return "cognition_gap"
  return "direct_needs"
}

export const processConversationTurn = async (
  request: ConversationTurnRequest,
  model: NeedUnderstandingModel,
): Promise<ConversationTurnResponse> => {
  if (request.event.type === "edit_card") {
    const state = {
      ...applyCardEdits(request.state, request.event.edits),
      phase: "card_review" as const,
    }
    return {
      state,
      assistantMessage: "需求卡片已更新。",
      nextAction: "review",
      question: null,
      publicCard: toPublicNeedCard(state),
      canConfirm: canReviewCard(state),
      provider: model.providerName,
    }
  }

  if (request.event.type === "confirm_card") {
    if (!canReviewCard(request.state)) {
      const state = { ...request.state, phase: "card_review" as const }
      return {
        state,
        assistantMessage: "还有会影响购买判断的关键信息没有明确，请继续补充或修改卡片。",
        nextAction: "review",
        question: null,
        publicCard: toPublicNeedCard(state),
        canConfirm: false,
        provider: model.providerName,
      }
    }
    const state = { ...request.state, phase: "complete" as const }
    return {
      state,
      assistantMessage: "需求已确认，可以交给后续推荐能力使用。",
      nextAction: "complete",
      question: null,
      publicCard: toPublicNeedCard(state),
      canConfirm: true,
      provider: model.providerName,
    }
  }

  const result = await model.analyzeTurn(request)
  let state = mergeModelPatch(request.state, result.statePatch)
  const shouldReview = result.nextAction === "review" || mustReviewCard(state)
  const selectedQuestion = shouldReview
    ? null
    : chooseQuestion(state, result.questionCandidates)

  if (!selectedQuestion) {
    state = { ...state, phase: "card_review" }
    return {
      state,
      assistantMessage:
        result.nextAction === "review"
          ? result.assistantMessage
          : "当前信息已经足够形成第一版需求卡片，请检查是否准确。",
      nextAction: "review",
      question: null,
      publicCard: toPublicNeedCard(state),
      canConfirm: canReviewCard(state),
      provider: model.providerName,
    }
  }

  const cognitionIncrement = isCognitionTopic(selectedQuestion.topic) ? 1 : 0
  state = {
    ...state,
    phase: phaseForQuestion(selectedQuestion.topic),
    clarificationCount: state.clarificationCount + 1,
    cognitionQuestionCount: state.cognitionQuestionCount + cognitionIncrement,
    askedTopics: [...state.askedTopics, selectedQuestion.topic],
  }

  return {
    state,
    assistantMessage: selectedQuestion.question,
    nextAction: "ask",
    question: {
      topic: selectedQuestion.topic,
      type: selectedQuestion.type,
      prompt: selectedQuestion.question,
      options: selectedQuestion.options,
    },
    publicCard: toPublicNeedCard(state),
    canConfirm: canReviewCard(state),
    provider: model.providerName,
  }
}
