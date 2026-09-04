import { NextResponse } from "next/server"
import { conversationTurnRequestSchema } from "@/domain/need-understanding/schemas"
import { processConversationTurn } from "@/server/conversation-service"
import { createModelProvider } from "@/server/model/provider"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = conversationTurnRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求内容无效。", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const provider = createModelProvider()
    const result = await processConversationTurn(parsed.data, provider)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "处理请求时发生未知错误。"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
