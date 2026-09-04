"use client"

import { useState } from "react"
import {
  needDimensions,
  roleKeys,
  type CardEdit,
  type NeedDimension,
  type NeedItem,
  type NeedUnderstandingState,
  type RoleAssignments,
} from "@/domain/need-understanding/types"

const dimensionLabels: Record<NeedDimension, string> = {
  desired_outcome: "希望结果",
  budget_value: "预算与价值",
  usage_context: "使用情境",
  hard_constraint: "硬性限制",
  function_performance: "功能与性能",
  style_feeling: "风格与感受",
  usage_cost: "使用成本",
  quality_lifespan: "品质与寿命",
  risk_trust: "风险与信任",
  relationship_expression: "关系表达",
  time_limit: "时间限制",
  exclusion: "排除项",
}

const roleLabels: Record<keyof RoleAssignments, string> = {
  initiatorIds: "发起者",
  buyerIds: "购买者",
  payerIds: "付款者",
  decisionMakerIds: "决策者",
  recipientIds: "接收者",
  userIds: "使用者",
  coUserOrInfluencerIds: "共同使用或影响者",
}

export function NeedCardEditor({
  state,
  onCancel,
  onSave,
}: {
  state: NeedUnderstandingState
  onCancel: () => void
  onSave: (edits: CardEdit[]) => void
}) {
  const [goal, setGoal] = useState(state.purchaseGoal.value ?? "")
  const [budget, setBudget] = useState(state.budget.value?.preferred?.toString() ?? "")
  const [actors, setActors] = useState(state.actors)
  const [roles, setRoles] = useState(state.roles)
  const [needs, setNeeds] = useState(state.needs.filter((need) => need.status !== "unknown"))
  const [removedNeedIds, setRemovedNeedIds] = useState<string[]>([])
  const [removedCognitionIds, setRemovedCognitionIds] = useState<string[]>([])

  const updateNeed = (id: string, patch: Partial<NeedItem>) =>
    setNeeds((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )

  const addNeed = () =>
    setNeeds((current) => [
      ...current,
      {
        id: `user-need-${crypto.randomUUID()}`,
        dimension: "desired_outcome",
        statement: "",
        priority: "important",
        status: "confirmed",
        source: "user_explicit",
        updatedAtTurn: state.clarificationCount,
      },
    ])

  const save = () => {
    const edits: CardEdit[] = [
      { type: "purchase_goal", value: goal },
      {
        type: "budget_preferred",
        value: budget.trim() ? Number(budget) : null,
      },
      ...actors.map((actor) => ({
        type: "actor" as const,
        actorId: actor.id,
        label: actor.label,
        relationshipToConsumer: actor.relationshipToConsumer,
        identitySummary: actor.identitySummary,
      })),
      ...roleKeys.map((role) => ({
        type: "role" as const,
        role,
        actorIds: roles[role],
      })),
      ...needs
        .filter((need) => need.statement.trim())
        .map((item) => ({ type: "need_upsert" as const, item })),
      ...removedNeedIds.map((id) => ({ type: "need_delete" as const, id })),
      ...removedCognitionIds.map((id) => ({ type: "cognition_delete" as const, id })),
    ]
    onSave(edits)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header>
          <div>
            <p className="eyebrow">EDIT NEED CARD</p>
            <h2 id="editor-title">修改需求卡片</h2>
          </div>
          <button className="close-button" onClick={onCancel} aria-label="关闭">×</button>
        </header>

        <div className="editor-body">
          <fieldset>
            <legend>购买目标</legend>
            <label>这次想解决什么<textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} /></label>
            <label>预算参考（元）<input type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
          </fieldset>

          <fieldset>
            <legend>参与者与关系</legend>
            {actors.map((actor) => (
              <div className="actor-editor" key={actor.id}>
                <label>称呼<input value={actor.label} onChange={(event) => setActors((current) => current.map((item) => item.id === actor.id ? { ...item, label: event.target.value } : item))} /></label>
                <label>与你的关系<input value={actor.relationshipToConsumer} onChange={(event) => setActors((current) => current.map((item) => item.id === actor.id ? { ...item, relationshipToConsumer: event.target.value } : item))} /></label>
                <label>相关身份<input value={actor.identitySummary ?? ""} onChange={(event) => setActors((current) => current.map((item) => item.id === actor.id ? { ...item, identitySummary: event.target.value || null } : item))} /></label>
              </div>
            ))}
            <div className="role-grid">
              {roleKeys.map((role) => (
                <label key={role}>{roleLabels[role]}
                  <select
                    value={roles[role][0] ?? ""}
                    onChange={(event) => setRoles((current) => ({ ...current, [role]: event.target.value ? [event.target.value] : [] }))}
                  >
                    <option value="">待确认</option>
                    {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <div className="legend-row"><legend>已经明确的需求</legend><button type="button" onClick={addNeed}>＋ 添加</button></div>
            <div className="need-editor-list">
              {needs.map((need) => (
                <div className="need-editor-row" key={need.id}>
                  <select value={need.dimension} onChange={(event) => updateNeed(need.id, { dimension: event.target.value as NeedDimension })}>
                    {needDimensions.map((dimension) => <option key={dimension} value={dimension}>{dimensionLabels[dimension]}</option>)}
                  </select>
                  <input value={need.statement} onChange={(event) => updateNeed(need.id, { statement: event.target.value })} placeholder="需求内容" />
                  <button type="button" onClick={() => {
                    setNeeds((current) => current.filter((item) => item.id !== need.id))
                    setRemovedNeedIds((current) => [...current, need.id])
                  }} aria-label="删除需求">×</button>
                </div>
              ))}
            </div>
          </fieldset>

          {state.cognitionItems.some((item) => !item.resolved && !removedCognitionIds.includes(item.id)) ? (
            <fieldset>
              <legend>还需要确认</legend>
              {state.cognitionItems.filter((item) => !item.resolved && !removedCognitionIds.includes(item.id)).map((item) => (
                <div className="pending-editor-row" key={item.id}>
                  <span>{item.statement}</span>
                  <button type="button" onClick={() => setRemovedCognitionIds((current) => [...current, item.id])}>移除</button>
                </div>
              ))}
            </fieldset>
          ) : null}
        </div>

        <footer>
          <button className="secondary-button" onClick={onCancel}>取消</button>
          <button className="primary-button" onClick={save}>保存修改</button>
        </footer>
      </section>
    </div>
  )
}
