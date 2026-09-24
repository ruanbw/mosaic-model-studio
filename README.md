# Mosaic · Model Studio

[简体中文](#简体中文) | [English](#english)

Mosaic 是一个浏览器内的多模型工作台：使用同一段提示词选择多个模型，并行生成、比较和预览结果。

**在线演示 / Live demo:** https://mosaic-model-studio-ruanbws-projects.vercel.app

- **静态页面**：经过 DOMPurify 清理，并在受限 iframe 中预览。
- **Vite 交互工程**：通过单个 WebContainer 在浏览器中安装依赖并运行。

> WebContainer 仅用于浏览器内工程预览，不是生产后端，也不能替代服务端运行时、数据库、任务队列或密钥管理。

---

## 简体中文

### 功能

- 添加、编辑和删除 OpenAI、Anthropic、Google Gemini、OpenRouter 及自定义 OpenAI-compatible Provider
- 从 Provider 获取模型列表，也支持手动输入模型 ID
- 多选模型并行生成，结果支持排序、状态筛选、预览、重试和完整工程导出
- API Key、Provider、模型、提示词和选择状态保存在浏览器 `localStorage`
- 静态结果使用 DOMPurify、宿主 CSP、`sandbox=""` 和 `no-referrer`
- 交互工程复用一个 WebContainer，并提供启动阶段、日志、停止和重试
- 无密钥 Demo 模式
- Dark / Light / System 主题与中文 / English 界面
- Vitest 单元测试与 Playwright 核心 UI 流程测试
- 提示词模板以及 `⌘/Ctrl + Enter`、`⌘/Ctrl + K` 快捷键

### 技术栈

- TypeScript、Vite、React 19
- Tailwind CSS v4、Radix UI、Lucide React
- Zustand、React Hook Form、Zod、TanStack Query
- i18next / react-i18next
- OpenAI、Anthropic、Google GenAI SDK（按 Provider 动态加载）
- DOMPurify、WebContainer
- Vitest、Playwright

### 本地开发

环境要求：Node.js 22+、pnpm 12+，以及支持 WebContainer / SharedArrayBuffer 的现代浏览器。

```bash
pnpm install
pnpm dev
```

质量检查：

```bash
pnpm test
pnpm run typecheck:test
pnpm run typecheck
pnpm run build
pnpm exec playwright install chromium
pnpm test:e2e
```

生产预览：

```bash
pnpm run preview
```

### 环境变量

复制 `.env.example`：

```dotenv
VITE_WEBCONTAINER_API_KEY=
```

所有 `VITE_` 变量都会进入客户端产物。该变量只能使用受限的 WebContainer 客户端 key，绝不能放 Provider 服务端密钥。

### Provider 配置

1. 打开 **Providers** 页面。
2. 添加 Provider，选择协议并填写 Base URL。
3. 输入个人 API Key。
4. 点击 **获取模型**，或手动填写模型 ID。
5. 返回 Studio，选择一个或多个模型并生成。

| 协议 | 默认 Base URL | 默认 Origin |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `https://api.openai.com` |
| Anthropic | `https://api.anthropic.com` | `https://api.anthropic.com` |
| Google Gemini | `https://generativelanguage.googleapis.com` | `https://generativelanguage.googleapis.com` |
| OpenAI-compatible | `https://openrouter.ai/api/v1` | `https://openrouter.ai` |

### 取消、重试和历史

- 每批生成最多同时运行 3 个模型请求。
- “停止”会中止未完成请求，将结果标记为“已取消”，并阻止迟到响应覆盖结果。
- 重试优先使用该结果保存的 prompt 和 Demo 模式。
- 最近的运行记录保存在版本化、限量化的本地历史中，可恢复输入或清空。

### 浏览器与安全

WebContainer 需要跨源隔离。开发和 `vite preview` 已配置：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

生产环境也必须保留等价响应头。`vercel.json` 已为所有 Vercel 响应配置这些头。

Mosaic 是 BYOK 工具，不是生产密钥库。Provider key 保存在浏览器并直接发送给 Provider；请使用测试 key、设置额度并定期轮换。模型输出和 WebContainer 工程均应视为不可信代码。

### Vercel 部署与自动更新

仓库包含 `vercel.json`，固定：

- Framework：Vite
- Install：`pnpm install --frozen-lockfile`
- Build：`pnpm run build`
- Output：`dist`
- COOP / COEP / Permissions Policy 响应头

GitHub 仓库已关联 Vercel 项目，生产分支为 `main`：

- 每次 push 到 `main`：自动创建 Production Deployment
- 其他分支 push / PR：自动创建 Preview Deployment
- 无需再次运行 `vercel --prod`

首次 CLI 关联命令：

```bash
vercel link --yes --project mosaic-model-studio --scope ruanbws-projects
vercel git connect https://github.com/ruanbw/mosaic-model-studio
vercel --prod
```

部署后建议检查：

```bash
curl -I https://<your-deployment>.vercel.app
```

确认响应包含 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: credentialless`。

### 当前限制

- Vitest 是 Node 环境单元测试，不能替代真实 Provider CORS / WebContainer 验收。
- Playwright 覆盖本地 demo 和 UI 流程，不使用真实 Provider key。
- BYOK key 仍暴露给同源脚本；生产多租户应用应使用认证后端代理。
- WebContainer 运行时许可证、配额和商业生产条款需单独确认。

### 目录

```text
src/
├── api.ts                 # Provider SDK 与生成请求
├── App.tsx                # Studio 编排、取消、比较和历史
├── store.ts               # Zustand 持久化
├── project/               # 归一化、导出、历史
├── webcontainer/          # WebContainer 生命周期
├── components/            # UI、Provider、结果与预览
└── *.test.ts              # Vitest 单元测试

e2e/                      # Playwright 核心流程
docs/webcontainer.md      # WebContainer 安全与部署说明
vercel.json               # Vercel 构建及响应头
```

---

## English

Mosaic is a browser-based multi-model workspace. It sends one prompt to several models in parallel, then helps you compare, preview, retry, and export their results.

**Live demo:** https://mosaic-model-studio-ruanbws-projects.vercel.app

- **Static pages** are sanitized with DOMPurify and rendered inside a restricted iframe.
- **Vite projects** run through one shared WebContainer in the browser.

> WebContainer is a browser preview runtime, not a production backend. It does not replace server runtimes, databases, queues, or secret management.

### Features

- Add, edit, and remove OpenAI, Anthropic, Google Gemini, OpenRouter, and custom OpenAI-compatible providers
- Discover models through provider APIs or enter model IDs manually
- Run several models in parallel, then sort, filter, preview, retry, and export results
- Persist provider settings, API keys, prompts, model selection, and run history in browser `localStorage`
- Isolate static output with DOMPurify, a host CSP, `sandbox=""`, and `no-referrer`
- Reuse one WebContainer with staged status, logs, stop, and retry controls
- Run the complete UI without provider keys in Demo mode
- Dark, Light, and System themes with Chinese and English UI
- Vitest unit tests and Playwright core UI flows
- Prompt templates plus `⌘/Ctrl + Enter` and `⌘/Ctrl + K`

### Stack

- TypeScript, Vite, React 19
- Tailwind CSS v4, Radix UI, Lucide React
- Zustand, React Hook Form, Zod, TanStack Query
- i18next / react-i18next
- OpenAI, Anthropic, and Google GenAI SDKs loaded per provider
- DOMPurify and WebContainer
- Vitest and Playwright

### Local development

Requirements: Node.js 22+, pnpm 12+, and a modern browser that supports WebContainer / SharedArrayBuffer.

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm test
pnpm run typecheck:test
pnpm run typecheck
pnpm run build
pnpm exec playwright install chromium
pnpm test:e2e
```

Production preview:

```bash
pnpm run preview
```

### Environment variables

Copy `.env.example`:

```dotenv
VITE_WEBCONTAINER_API_KEY=
```

Every `VITE_` variable is exposed to the client. Use only a restricted WebContainer client key, never a provider server key.

### Provider setup

1. Open **Providers**.
2. Add a provider, choose its protocol, and enter a Base URL.
3. Enter a personal API key.
4. Click **Fetch models**, or enter model IDs manually.
5. Return to Studio, select models, and generate.

| Protocol | Default Base URL | Default origin |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `https://api.openai.com` |
| Anthropic | `https://api.anthropic.com` | `https://api.anthropic.com` |
| Google Gemini | `https://generativelanguage.googleapis.com` | `https://generativelanguage.googleapis.com` |
| OpenAI-compatible | `https://openrouter.ai/api/v1` | `https://openrouter.ai` |

### Cancellation, retry, and history

- Each run uses at most three concurrent model requests.
- Stop aborts unfinished requests, marks them as cancelled, and prevents late responses from overwriting results.
- Retry uses the prompt and Demo mode saved with that result.
- Recent runs are stored in a versioned, bounded local history that can restore inputs or be cleared.

### Browser and security requirements

WebContainer requires cross-origin isolation. Development and `vite preview` use:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

Production must preserve equivalent headers. `vercel.json` applies them to all Vercel responses.

Mosaic is a BYOK tool, not a production secret vault. Provider keys are stored in the browser and sent directly to the selected provider. Use test keys, enforce quotas, and rotate them regularly. Treat model output and WebContainer projects as untrusted code.

### Vercel deployment and automatic updates

The repository contains `vercel.json` with:

- Framework: Vite
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Output: `dist`
- COOP, COEP, and Permissions Policy headers

The GitHub repository is connected to the Vercel project with `main` as the production branch:

- Every push to `main` creates a Production Deployment automatically.
- Other branch pushes and pull requests create Preview Deployments.
- You do not need to run `vercel --prod` again.

Initial CLI linking commands:

```bash
vercel link --yes --project mosaic-model-studio --scope ruanbws-projects
vercel git connect https://github.com/ruanbw/mosaic-model-studio
vercel --prod
```

After deployment, verify:

```bash
curl -I https://<your-deployment>.vercel.app
```

The response should include `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`.

### Known limitations

- Vitest runs in Node and cannot replace real Provider CORS or WebContainer validation.
- Playwright covers local demo/UI flows and does not use real provider keys.
- BYOK keys remain available to same-origin scripts; use an authenticated backend proxy for multi-tenant production.
- Confirm WebContainer licensing, quotas, and commercial production terms separately.

### Project structure

```text
src/
├── api.ts                 # Provider SDKs and generation requests
├── App.tsx                # Studio orchestration, cancellation, comparison, history
├── store.ts               # Persisted Zustand state
├── project/               # Normalization, export, history
├── webcontainer/          # WebContainer lifecycle
├── components/            # UI, providers, results, previews
└── *.test.ts              # Vitest unit tests

e2e/                      # Playwright core flows
docs/webcontainer.md      # WebContainer security and deployment notes
vercel.json               # Vercel build and response headers
```
