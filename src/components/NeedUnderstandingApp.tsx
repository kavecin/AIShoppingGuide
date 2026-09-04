"use client"

import { useEffect, useReducer, useState } from "react"
import { ConversationPanel } from "./conversation/ConversationPanel"
import { NeedCard } from "./need-card/NeedCard"
import { NeedCardEditor } from "./need-card/NeedCardEditor"
import { createInitialState } from "@/domain/need-understanding/initial-state"
import { toPublicNeedCard } from "@/domain/need-understanding/public-card"
import type {
  CardEdit,
  ConversationEvent,
  ConversationTurnResponse,
  Message,
  NeedUnderstandingState,
  PublicNeedCard,
  Question,
  QuestionOption,
} from "@/domain/need-understanding/types"

const STORAGE_KEY = "ai-shopping-guide.prototype.v1"

type ClientState = {
  hydrated: boolean
  started: boolean
  needState: NeedUnderstandingState
  messages: Message[]
  question: Question | null
  publicCard: PublicNeedCard
  canConfirm: boolean
  provider: "mock" | "openai"
  loading: boolean
  error: string | null
}

type ClientAction =
  | { type: "hydrate"; payload?: Partial<ClientState> }
  | { type: "request"; userMessage?: Message }
  | { type: "response"; payload: ConversationTurnResponse; appendMessage?: boolean }
  | { type: "error"; message: string }
  | { type: "reset"; state: ClientState }

const seedState = createInitialState("pending")

const initialClientState: ClientState = {
  hydrated: false,
  started: false,
  needState: seedState,
  messages: [],
  question: null,
  publicCard: toPublicNeedCard(seedState),
  canConfirm: false,
  provider: "mock",
  loading: false,
  error: null,
}

const reducer = (state: ClientState, action: ClientAction): ClientState => {
  if (action.type === "hydrate") {
    const nextNeedState = action.payload?.needState ?? createInitialState()
    return {
      ...initialClientState,
      ...action.payload,
      needState: nextNeedState,
      publicCard: action.payload?.publicCard ?? toPublicNeedCard(nextNeedState),
      hydrated: true,
    }
  }
  if (action.type === "request") {
    return {
      ...state,
      started: true,
      loading: true,
      error: null,
      messages: action.userMessage
        ? [...state.messages, action.userMessage]
        : state.messages,
    }
  }
  if (action.type === "response") {
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: action.payload.assistantMessage,
    }
    return {
      ...state,
      needState: action.payload.state,
      publicCard: action.payload.publicCard,
      question: action.payload.question,
      canConfirm: action.payload.canConfirm,
      provider: action.payload.provider,
      loading: false,
      error: null,
      messages:
        action.appendMessage === false
          ? state.messages
          : [...state.messages, assistantMessage],
    }
  }
  if (action.type === "error") {
    return { ...state, loading: false, error: action.message }
  }
  return action.state
}

const phaseLabels: Record<NeedUnderstandingState["phase"], string> = {
  outline: "角色轮廓",
  direct_needs: "直接需求",
  cognition_gap: "认知补全",
  card_review: "卡片确认",
  complete: "已完成",
}

const eventContent = (event: ConversationEvent) => {
  if (event.type === "initial_message" || event.type === "answer") return event.text
  if (event.type === "select_options") {
    return [...event.options.map((item) => item.label), event.otherText]
      .filter(Boolean)
      .join("、")
  }
  return null
}

export function NeedUnderstandingApp() {
  const [state, dispatch] = useReducer(reducer, initialClientState)
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        dispatch({ type: "hydrate", payload: JSON.parse(saved) as Partial<ClientState> })
        return
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
    dispatch({ type: "hydrate" })
  }, [])

  useEffect(() => {
    if (!state.hydrated) return
    const snapshot = {
      started: state.started,
      needState: state.needState,
      messages: state.messages,
      question: state.question,
      publicCard: state.publicCard,
      canConfirm: state.canConfirm,
      provider: state.provider,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }, [state])

  const sendEvent = async (
    event: ConversationEvent,
    options: { appendUser?: boolean; appendAssistant?: boolean } = {},
  ) => {
    if (state.loading) return
    const content = eventContent(event)
    const userMessage =
      options.appendUser !== false && content
        ? ({ id: crypto.randomUUID(), role: "user", content } satisfies Message)
        : undefined
    const recentMessages = userMessage
      ? [...state.messages, userMessage]
      : state.messages

    dispatch({ type: "request", userMessage })
    try {
      const response = await fetch("/api/conversation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: state.needState,
          recentMessages: recentMessages.slice(-16),
          event,
        }),
      })
      const payload = (await response.json()) as ConversationTurnResponse | { error: string }
      if (!response.ok || !("state" in payload)) {
        throw new Error("error" in payload ? payload.error : "请求失败，请稍后重试。")
      }
      dispatch({
        type: "response",
        payload,
        appendMessage: options.appendAssistant,
      })
    } catch (error) {
      dispatch({
        type: "error",
        message: error instanceof Error ? error.message : "请求失败，请稍后重试。",
      })
    }
  }

  const reset = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    const needState = createInitialState()
    dispatch({
      type: "reset",
      state: {
        ...initialClientState,
        hydrated: true,
        needState,
        publicCard: toPublicNeedCard(needState),
      },
    })
    setEditorOpen(false)
  }

  const submitInitial = (text: string) =>
    sendEvent({ type: "initial_message", text })

  const submitAnswer = (text: string) => sendEvent({ type: "answer", text })

  const submitOptions = (options: QuestionOption[]) =>
    sendEvent({ type: "select_options", options })

  const saveEdits = async (edits: CardEdit[]) => {
    await sendEvent(
      { type: "edit_card", edits },
      { appendUser: false, appendAssistant: false },
    )
    setEditorOpen(false)
  }

  if (!state.hydrated) {
    return <main className="loading-screen">正在准备需求理解原型…</main>
  }

  if (!state.started) {
    return <StartScreen onSubmit={submitInitial} loading={state.loading} />
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={reset} aria-label="重新开始">
          <span className="brand-mark">N</span>
          <span>
            <strong>Need Lens</strong>
            <small>AI Shopping Guide</small>
          </span>
        </button>
        <div className="header-meta">
          <span className="phase-chip">{phaseLabels[state.needState.phase]}</span>
          <span className="provider-chip">
            {state.provider === "mock" ? "演示模型" : "OpenAI"}
          </span>
          <button className="text-button" onClick={reset}>重新开始</button>
        </div>
      </header>

      <section className="progress-strip" aria-label="需求理解进度">
        {Object.entries(phaseLabels).map(([phase, label], index) => {
          const phases = Object.keys(phaseLabels)
          const current = phases.indexOf(state.needState.phase)
          return (
            <span
              key={phase}
              className={index <= current ? "progress-step active" : "progress-step"}
            >
              <i>{index + 1}</i>{label}
            </span>
          )
        })}
      </section>

      <section className="workspace">
        <ConversationPanel
          messages={state.messages}
          question={state.question}
          loading={state.loading}
          error={state.error}
          completed={state.needState.phase === "complete"}
          onAnswer={submitAnswer}
          onSelectOptions={submitOptions}
          onRetry={() => sendEvent({ type: "continue_clarification" }, { appendUser: false })}
        />
        <NeedCard
          card={state.publicCard}
          state={state.needState}
          canConfirm={state.canConfirm}
          onEdit={() => setEditorOpen(true)}
          onConfirm={() =>
            sendEvent({ type: "confirm_card" }, { appendUser: false })
          }
          onContinue={() =>
            sendEvent({ type: "continue_clarification" }, { appendUser: false })
          }
        />
      </section>

      {editorOpen ? (
        <NeedCardEditor
          state={state.needState}
          onCancel={() => setEditorOpen(false)}
          onSave={saveEdits}
        />
      ) : null}
    </main>
  )
}

function StartScreen({
  onSubmit,
  loading,
}: {
  onSubmit: (text: string) => void
  loading: boolean
}) {
  const [text, setText] = useState("")
  const examples = [
    "我想给刚退休的爸爸买件东西，预算大约 2000 元，但不知道买什么。",
    "我想改善在家办公时总是腰酸的问题，但不知道应该买什么。",
  ]

  return (
    <main className="start-screen">
      <nav className="start-nav">
        <span className="brand-mark">N</span>
        <span className="start-brand">Need Lens</span>
        <span className="prototype-label">PROTOTYPE 0.1</span>
      </nav>
      <section className="hero">
        <p className="eyebrow">AI NEED UNDERSTANDING</p>
        <h1>先把需求<br />想清楚。</h1>
        <p className="hero-copy">
          不用知道商品名称。告诉我你想为谁解决什么问题，
          我们用几轮简短对话整理成一张需求卡片。
        </p>
        <form
          className="start-composer"
          onSubmit={(event) => {
            event.preventDefault()
            if (text.trim()) onSubmit(text.trim())
          }}
        >
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="例如：想给刚退休的爸爸买件东西，但还没想好买什么……"
            rows={4}
            autoFocus
          />
          <div className="composer-footer">
            <span>自然地说就好，不需要列参数</span>
            <button className="primary-button" disabled={!text.trim() || loading}>
              {loading ? "正在理解…" : "开始梳理"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <div className="example-list">
          <span>试试这些开场</span>
          {examples.map((example) => (
            <button key={example} onClick={() => setText(example)}>{example}</button>
          ))}
        </div>
      </section>
      <footer className="start-footer">
        <span>角色轮廓</span><i />
        <span>直接需求</span><i />
        <span>认知补全</span><i />
        <span>需求卡片</span>
      </footer>
    </main>
  )
}
