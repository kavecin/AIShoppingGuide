import type { ModelTurnInput, ModelTurnResult } from "@/domain/need-understanding/types"

export interface NeedUnderstandingModel {
  readonly providerName: "mock" | "openai"
  analyzeTurn(input: ModelTurnInput): Promise<ModelTurnResult>
}
