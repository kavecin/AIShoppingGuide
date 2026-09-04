# AI Shopping Guide

面向消费需求不够清晰的用户，通过简短多轮对话形成结构化需求卡片的 AI 智能导购项目。

## 背景

很多人并不是「明确知道要买哪一件商品」，而是带着模糊目标：送礼、换季、提升生活品质、预算有限但想买得值。传统电商更擅长按关键词检索，对「还没想清楚要什么」的用户帮助有限。

## 需求

当前功能阶段聚焦「AI 需求理解」：帮助用户把模糊消费意图整理成一张可确认、可修改的需求卡片。本原型止于需求卡片，不进入商品推荐、比较或购买环节。

典型场景包括：

- 需求不明确：只知道场景、预算或对象，不知道具体品类
- 选择过多：同类商品太多，难以判断取舍
- 决策成本高：担心买错、买贵、买了用不上

## 目标

通过 3–5 个高信息增益问题，逐步理解目标者轮廓、未表达的直接需求和高影响认知缺口。

本仓库用于该智能导购能力的研发。

## 运行原型

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。默认使用内置的确定性演示模型，无需 API Key。若要接入 OpenAI，请复制 `.env.example` 为 `.env.local`，将 `MODEL_PROVIDER` 改为 `openai`，并填写 `OPENAI_API_KEY` 与 `OPENAI_MODEL`。

验证命令：

```bash
npm run typecheck
npm test
npm run build
```

## 项目文档

- [项目立项](PROJECT_INITIATION.md)
- [产品研发流程](PRODUCT_DEVELOPMENT_PROCESS.md)
- [产品假设与阶段决策](docs/PRODUCT_HYPOTHESES_AND_DECISIONS.md)
- [MVP 产品与体验设计](docs/MVP_PRODUCT_DESIGN.md)
- [AI 需求理解初步原型设计](docs/AI_NEED_UNDERSTANDING_PROTOTYPE.md)
- [AI 需求理解初步实现方案](docs/AI_NEED_UNDERSTANDING_IMPLEMENTATION.md)
