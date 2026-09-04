import { isCognitionTopic } from "./readiness"
import type {
  NeedUnderstandingState,
  QuestionCandidate,
} from "./types"

const scoreCandidate = (candidate: QuestionCandidate) =>
  (candidate.impact * candidate.uncertainty * candidate.answerability) /
  Math.max(candidate.effort, 1)

export const chooseQuestion = (
  state: NeedUnderstandingState,
  candidates: QuestionCandidate[],
): QuestionCandidate | null => {
  if (state.clarificationCount >= 5) return null

  const asked = new Set(state.askedTopics)
  const allowed = candidates.filter((candidate) => {
    if (asked.has(candidate.topic)) return false
    if (candidate.options.length > 4) return false
    if (isCognitionTopic(candidate.topic) && state.cognitionQuestionCount >= 2) {
      return false
    }
    return candidate.impact >= 2
  })

  return (
    allowed.sort((left, right) => scoreCandidate(right) - scoreCandidate(left))[0] ??
    null
  )
}
