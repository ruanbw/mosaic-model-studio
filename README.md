# Mosaic · Model Studio

一个在浏览器中运行的自然语言多模型工作台：用同一段提示词选择多个模型，并行生成和比较结果。产品支持两类输出：

- **静态页面**：清理后继续放在受限的安全沙箱中预览。
- **Vite 交互工程**：在页面内启动**单个 WebContainer** 预览，运行依赖安装、Vite 开发服务器和交互界面。

WebContainer 用于浏览器内的工程预览，不是生产应用后端，也不能替代服务端运行时、数据库、任务队列或密钥管理。

## 功能

- 添加、编辑、删除多个模型提供商
- 支持 OpenAI、Anthropic、Google Gemini、OpenRouter 兼容接口和自定义 OpenAI-compatible Base URL
- 通过各官方 SDK 的模型列表接口自动获取可用模型；手动输入作为不支持模型列表时的兜底
- API Key、提供商、模型、提示词和模型选择通过 Zustand persist 保存到当前浏览器 `localStorage`
- 多选模型并行生成静态页面或 Vite 工程，并以响应式多宫格展示结果
- 静态结果使用 DOMPurify 清理，并在无脚本权限的 sandbox iframe 中渲染
- 交互工程共用一个 WebContainer；切换或替换工程时复用该实例
- 无密钥时可打开「演示模式」预览完整体验
- 支持暗黑、明亮、跟随系统三种主题，以及中文 / English 切换
- 支持提示词模板、快捷键 `⌘/Ctrl + Enter` 和 `⌘/Ctrl + K`

## 技术栈

- TypeScript + Vite + React
- WebContainer：Vite 工程的浏览器内 Node.js 运行环境
- Tailwind CSS v4：全部界面样式与响应式布局
- Zustand：本地持久化状态
- React Hook Form + Zod：提供商表单校验
- Radix UI：Dialog、Popover、Switch
- TanStack Query：异步生成任务状态
- i18next / react-i18next：中文与 English
- Lucide React：图标
- OpenAI 官方 SDK、Anthropic 官方 SDK、Google `@google/genai` 官方 SDK
- OpenRouter 通过 OpenAI 官方 SDK 的兼容接口调用
- DOMPurify：模型输出 HTML 清理

## 开始使用

环境要求：Node.js 22+、pnpm 12+，并使用支持 WebContainer 和跨源隔离的现代浏览器。

```bash
pnpm install
pnpm dev
```

打开终端输出的本地地址即可。生产构建与本地预览：

```bash
pnpm run typecheck
pnpm run build
pnpm run preview
```

Vite 的开发服务器和 `preview` 都会返回跨源隔离响应头。WebContainer 首次启动以及 Vite 工程首次安装依赖时需要下载和准备工作，因此交互预览可能比静态页面慢；后续复用同一实例不代表可以绕过网络、浏览器或许可证限制。

### 环境变量

复制 `.env.example` 为本地环境文件后，可按需设置：

```dotenv
VITE_WEBCONTAINER_API_KEY=
```

所有 `VITE_` 变量都会进入客户端构建产物。若 WebContainer 服务要求 key，只能使用为其签发的受限客户端 key，并遵守对应配额和 origin 限制；**绝不能把 OpenAI、Anthropic、Google 或其他 provider 的服务端密钥写入 `VITE_` 变量**。Provider key 仍属于后文所述的 BYOK 风险。

## 预览模式与浏览器要求

### 静态页面

静态 HTML 先经过 DOMPurify 清理，再由 `sandbox` iframe 渲染。该路径不需要启动 Node.js，适合快速、安全地检查页面外观和基础行为。

### Vite 交互工程

需要依赖、Vite 开发服务器或客户端交互的工程由 WebContainer 运行。整个页面只允许一个活动 WebContainer：打开新工程前应停止或替换旧工程，不能为每张结果卡并行创建实例。预览生命周期和安全边界见 [`docs/webcontainer.md`](docs/webcontainer.md)。

WebContainer 依赖跨源隔离能力。仓库中的 Vite 配置为开发服务器和预览服务器设置：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

自建部署也必须在**最终公开 HTML 响应**上保留等价响应头；只配置 Vite 开发服务器、只检查重定向前的响应，或让 CDN 覆盖/删除响应头都不够。生产使用 HTTPS，并在修改代理后清理 CDN 缓存。若浏览器、扩展、反向代理、跨域资源或内容安全策略阻止 WebContainer 启动，静态沙箱仍可工作，但交互工程无法运行。部署头、最终 URL 检查和故障排查见 [`docs/webcontainer.md`](docs/webcontainer.md)。

## 配置模型提供商

进入右侧 **Providers** 页面，点击「添加提供商」：

1. 选择接口协议
2. 填写 Base URL（如果默认值不合适）
3. 填入个人 API Key
4. 点击「获取模型」通过官方 SDK 读取模型列表；如果服务不支持模型列表接口，再手动填写模型 ID（每行一个）

保存后，回到 Studio 的「对比模型」选择器中勾选一个或多个模型。

Provider 的默认地址如下；origin 不包含路径中的 `/v1` 或 `/v1beta`。自定义 Base URL 会替换默认地址，浏览器仍从最终应用 origin 直连 Provider，因此必须验证目标服务的 CORS 策略：

| 协议 | 默认 Base URL | 默认 origin |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `https://api.openai.com` |
| Anthropic | `https://api.anthropic.com` | `https://api.anthropic.com` |
| Google Gemini | `https://generativelanguage.googleapis.com` | `https://generativelanguage.googleapis.com` |
| OpenAI-compatible（默认 OpenRouter） | `https://openrouter.ai/api/v1` | `https://openrouter.ai` |

### 取消与重试

生成期间 Studio 的“停止”按钮会中止当前模型请求，并将尚未完成的结果标记为“已取消”；关闭或停止 WebContainer 只停止工程运行时。失败或取消结果卡上的“重试”会针对同一个 provider/model 发起全新请求，优先复用该结果保存的 prompt 与演示模式输入，保留其他结果，不续传部分输出，也不会自动重试其他模型。WebContainer 的停止、替换和重新打开按单实例状态机串行清理，详见 [`docs/webcontainer.md`](docs/webcontainer.md)。

## 安全与生产边界

这是一个 **BYOK（Bring Your Own Key）工具**，不是生产环境的密钥托管方案。浏览器 `localStorage` 对同源 JavaScript 可读，前端加密也不能抵御 XSS。官方供应商也不建议把服务端密钥暴露在客户端。`VITE_WEBCONTAINER_API_KEY` 同样会公开给客户端，不能被当作秘密。

建议：

- 使用独立的测试密钥、低额度项目和明确的消费上限
- 定期撤销或轮换密钥
- 仅在可信的个人浏览器环境中使用
- 生产部署前增加自己的后端代理、认证、限流、额度控制和服务端密钥管理
- 供应商是否允许浏览器直连取决于其 CORS 策略；如果遇到跨域错误，应使用后端代理，而不是把密钥写进前端代码

模型输出会被视为不可信内容。归一化后的静态结果会经过 DOMPurify、宿主生成的 CSP、`sandbox=""` iframe 和 `referrerPolicy="no-referrer"` 隔离，仍不要把它当作可信代码直接部署；demo fixture 是可信的本地示例，不等同于不可信模型输出。生产若统一设置 CSP，必须分别验证静态预览和 WebContainer 预览，不能用移除 sandbox 的方式排错。WebContainer 提供浏览器内的 Node.js 兼容运行环境，不代表代码通过了生产安全审计；生成的工程仍可能消耗配额、访问网络或包含有漏洞的依赖。WebContainer 不是生产后端，不要用它承载生产 API、持久数据或保密服务。

## POC 与商业生产许可

本仓库当前面向 **POC、开发验证和内部评估**。POC 中使用 WebContainer，不代表可以把它直接用于商业生产。StackBlitz 官方要求商业生产使用具备相应商业许可；正式上线前必须确认使用场景、用户规模和部署方式，并按官方条款取得许可。许可详情见 [StackBlitz WebContainer Enterprise](https://webcontainers.io/enterprise)。

生产发布还应补齐认证、服务端密钥管理、滥用防护、可观测性、依赖治理，以及供应商和浏览器兼容性评估。

## 目录结构

```text
src/
├── api.ts                    # 官方 SDK 生成、模型列表与 HTML 清理
├── demo.ts                   # 无密钥演示结果
├── prompts.ts                # 页面生成系统提示词与模板
├── i18n.ts                   # 中英文资源
├── index.css                 # Tailwind 入口与主题变量
├── store.ts                  # Zustand + localStorage
├── types.ts                  # 领域类型与默认提供商
├── App.tsx                   # 页面编排与生成任务
└── components/               # Studio、Provider、结果预览组件
```
