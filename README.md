# Mosaic · Model Studio

一个在浏览器本地运行的 多模型网页生成器：输入同一段提示词，选择多个模型，并行生成 HTML 页面，再以多宫格对比结果。

## 功能

- 添加、编辑、删除多个模型提供商
- 支持 OpenAI、Anthropic、Google Gemini、OpenRouter 兼容接口和自定义 OpenAI-compatible Base URL
- API Key、提供商、模型、提示词和模型选择通过 Zustand persist 保存到当前浏览器 `localStorage`
- 多选模型并行运行，结果以响应式多宫格展示
- 每张结果卡右上角支持放大预览
- 生成结果使用 DOMPurify 清理，并在无脚本权限的 sandbox iframe 中渲染
- 无密钥时可打开「演示模式」预览完整体验
- 支持提示词模板、快捷键 `⌘/Ctrl + Enter` 和 `⌘/Ctrl + K`

## 技术栈

- TypeScript + Vite + React
- Zustand：本地持久化状态
- React Hook Form + Zod：提供商表单校验
- Radix UI：Dialog、Popover、Switch
- TanStack Query：异步生成任务状态
- Lucide React：图标
- OpenAI 官方 SDK、Anthropic 官方 SDK、Google `@google/genai` 官方 SDK
- OpenRouter 通过 OpenAI 官方 SDK 的兼容接口调用
- DOMPurify：模型输出 HTML 清理

## 开始使用

```bash
pnpm install
pnpm dev
```

打开终端输出的本地地址即可。生产构建：

```bash
pnpm run build
pnpm run preview
```

## 配置提供商

进入右侧 **Providers** 页面，点击「添加提供商」：

1. 选择接口协议
2. 填写 Base URL（如果默认值不合适）
3. 填入个人 API Key
4. 每行填写一个模型 ID

保存后，回到 Studio 的「对比模型」选择器中勾选一个或多个模型。

## 安全说明

这是一个 **BYOK（Bring Your Own Key）个人工具**，不是生产环境的密钥托管方案。浏览器 `localStorage` 对同源 JavaScript 可读，前端加密也不能抵御 XSS。官方供应商也不建议把服务端密钥暴露在客户端。

建议：

- 使用独立的测试密钥、低额度项目和明确的消费上限
- 定期撤销或轮换密钥
- 仅在可信的个人浏览器环境中使用
- 生产部署前增加自己的后端代理、认证、限流、额度控制和服务端密钥管理
- 供应商是否允许浏览器直连取决于其 CORS 策略；如果遇到跨域错误，应使用后端代理，而不是把密钥写进前端代码

模型输出会被视为不可信内容，虽然已经使用 DOMPurify 和 sandbox iframe 隔离，仍不要把它当作可信代码直接部署。

## 目录结构

```text
src/
├── api.ts                    # 官方 SDK 适配与 HTML 清理
├── demo.ts                   # 无密钥演示结果
├── prompts.ts                # 页面生成系统提示词与模板
├── store.ts                  # Zustand + localStorage
├── types.ts                  # 领域类型与默认提供商
├── App.tsx                   # 页面编排与生成任务
└── components/               # Studio、Provider、结果预览组件
```
