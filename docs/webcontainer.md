# WebContainer 架构与部署说明

## 目标与边界

Mosaic 接受自然语言生成的静态页面或 Vite 工程。静态页面继续使用 DOMPurify 清理和 `sandbox` iframe；只有需要依赖、开发服务器或客户端交互的 Vite 工程进入 WebContainer。

WebContainer 是浏览器内的 Node.js 兼容执行环境，适合预览和 POC，不是生产后端。它不提供生产级持久化、认证、密钥托管、任务调度、审计或隔离保证。生成代码和安装的依赖均应按不可信输入处理。

## 架构

```text
Prompt + selected providers
          │
          ▼
  Browser-side generation
          │
          ├── static HTML ──► DOMPurify ──► sandbox iframe
          │
          └── Vite project ──► validation/preparation
                                      │
                                      ▼
                         one shared WebContainer
                                      │
                         install dependencies
                                      │
                                      ▼
                              start Vite server
                                      │
                                      ▼
                            interactive preview
```

- 模型提供商 SDK 在浏览器中按 BYOK 模式调用；跨域受限时必须改走后端代理。
- 静态路径不启动 Node.js，保留无脚本权限的沙箱边界。
- 交互路径复用单个 WebContainer。依赖安装和开发服务器都发生在这个实例内，不能把每个预览结果当作独立运行时。
- `@webcontainer/api` 在生产构建中归入 `webcontainer-vendor` 分包，避免 WebContainer SDK 与普通应用界面共同更新。
- WebContainer 的可选 key 与模型 provider key 是两类不同凭据，不能互相替代。

## 生命周期状态机

交互预览应串行驱动以下状态；同一时刻最多一个状态执行有副作用的操作：

```text
idle
  │ activate project
  ▼
booting ──failure/timeout──► error
  │ mount validated files
  ▼
mounting ──failure──► error
  │ install dependencies
  ▼
installing ──failure/cancel/timeout──► error
  │ start Vite
  ▼
starting ──failure/timeout──► error
  │ server ready
  ▼
ready
  │ replace project
  ├──────────────► booting（复用实例）
  │ close / stop
  ▼
stopping ──cleanup──► idle
```

运行规则：

1. `idle` 和 `error` 可以接收新的工程激活请求；重试必须先清理失败状态，不能假定半启动的服务仍可用。
2. `booting` 期间等待受限的 WebContainer 启动超时；`mounting` 仅写入已校验的最小文件集合，不接受任意服务端路径或宿主机文件。
3. `booting`、`mounting`、`installing`、`starting` 期间串行化重复启动请求。依赖安装或服务启动较慢时展示阶段状态，不虚构耗时。
4. `ready` 后才把 Vite 预览地址交给预览 UI。
5. 替换工程时先使旧激活失效并终止旧开发服务器，再清理旧工程目录并复用同一个容器实例。
6. 关闭预览、显式停止、卸载页面或发生不可恢复错误时终止活动进程并回到 `idle` 或 `error`。迟到的启动结果不得覆盖更新的工程状态。

> 状态名描述架构契约；UI 可以合并展示阶段，但不得跳过实例互斥和服务清理。

## 单实例限制

- 页面只拥有一个活动 WebContainer。所有结果卡如果需要交互预览，必须选择当前工程，而不是同时启动多个容器。
- 打开另一个工程是“替换”，不是“并行打开”。旧工程地址在替换完成后立即失效。
- 不把 WebContainer 实例放入可序列化业务状态；浏览器对象、进程句柄和 `serverUrl` 只能在当前运行时持有。
- 路由切换或组件重挂载不得重复 `boot`。初始化调用应由受控生命周期管理，并防止 React Strict Mode 等开发场景触发并发启动。
- 若未来需要多工程并行，必须重新评估资源、许可证和隔离模型；当前设计不支持该场景。

## 安全边界

1. **生成内容不可信。** 文件路径、依赖名、脚本、环境变量读取和网络请求都可能在浏览器进程权限范围内执行。不要把 provider 密钥、部署凭据或宿主数据写入生成工程。
2. **静态与交互路径不同。** `sandbox` iframe 面向静态 HTML；WebContainer 面向可执行工程。WebContainer 预览 URL 必须与主应用异源，manager 会拒绝同源 URL；其 iframe 仅额外允许 `allow-same-origin` 以启用官方 Service Worker 引导，仍不允许表单、弹窗或顶层导航。不要把交互工程伪装成经过 DOMPurify 的静态页面，也不要暗示 WebContainer 已被生产安全审计。
3. **客户端环境变量公开。** 所有 `VITE_` 变量都进入客户端 bundle，源码、Network 面板和用户都能读取。
4. **BYOK 风险仍在。** 浏览器端 provider key 可被同源脚本读取；正式产品应使用自己的认证后端代理，并让 provider 密钥只存在于服务端。
5. **资源仍是应用责任。** 依赖安装会访问包注册表并消耗网络、配额和运行时资源。生产使用需要滥用防护、依赖治理、审计和撤销流程。
6. **跨源隔离不是安全认证。** COOP/COEP 启用浏览器能力，不会让生成代码、依赖或客户端 key 变可信。

## 跨源隔离与部署头

WebContainer 需要应用处于跨源隔离状态。开发服务器和 Vite preview 由 `vite.config.ts` 提供以下头：

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

生产静态托管必须由 CDN、边缘代理或 Web 服务器在 HTML 及相关应用响应上配置等价响应头，不能只在 Vite 开发服务器上配置。修改代理后应清理 CDN 缓存，并从最终公开 URL 验证响应头。

`credentialless` 会影响跨源子资源。应用依赖的外部资源必须能适配该策略；遇到资源被阻止时，先检查浏览器控制台和 Network 面板中的 CORS/CORP 提示，不要通过关闭 COOP/COEP 掩盖问题。若托管平台无法提供等价头，交互预览不可用，但静态 sandbox 路径仍可保留。

## `VITE_WEBCONTAINER_API_KEY`

`.env.example` 保留以下空变量：

```dotenv
VITE_WEBCONTAINER_API_KEY=
```

仅在 WebContainer 服务明确要求且已经配置相应 origin/配额时填写受限客户端 key。变量名中的 `VITE_` 表示它会公开给浏览器：

- 不填写时，按 WebContainer 默认公开服务策略评估是否可用。
- 填写值只能是 WebContainer 签发的受限客户端 key，并遵守其授权范围。
- 不填写 OpenAI、Anthropic、Google 或其他模型 provider 的服务端密钥。
- 不把 key 提交到仓库；轮换客户端 key 后重新构建部署。
- 环境变量只在构建时注入，部署后修改 `.env` 不会自动改变已有静态资源。

## 故障排查

### 页面提示缺少跨源隔离或 `SharedArrayBuffer` 不可用

1. 从浏览器 Network 面板检查最终 HTML 响应是否同时包含 COOP `same-origin` 和 COEP `credentialless`。
2. 检查反向代理、CDN 和平台配置是否覆盖或删除了 Vite 头；清理旧缓存后重试。
3. 确认没有另一个 Document 响应破坏顶层文档隔离，也不要在 opener 关系和嵌入策略之间制造冲突。
4. 使用支持 WebContainer 的现代浏览器；扩展干扰时用无扩展环境复现。

### WebContainer 无法启动

- 确认 `@webcontainer/api` 已安装并能进入客户端构建。
- 检查浏览器控制台的首个异常，而不是只看最终通用错误提示。
- 确认页面运行在安全上下文：`localhost` 或 HTTPS。
- 确认浏览器支持 SharedArrayBuffer/WebContainer，且没有被企业策略禁用。
- 检查混合内容、代理和网络过滤是否阻止 WebContainer 运行时资源。

### 依赖安装失败或长时间没有完成

- 确认包管理器、依赖名和项目文件完整，查看终端状态和浏览器网络请求。
- 检查 npm registry、DNS、代理和网络策略。
- 不要用任意性能数字判断“正常”；保留阶段状态，并允许用户取消或重试。
- 重试前先清理旧实例状态，避免两个启动流程竞争。

### 预览地址失效或新工程仍显示旧内容

- 确认代码遵守单实例串行切换：旧服务器停止后才能启动新工程。
- 丢弃旧 `serverUrl` 和迟到的启动回调，不要把它们持久化到 `localStorage`。
- 刷新当前工程后再检查 Vite 启动输出；仍异常时重建容器。
- 检查浏览器控制台中的端口、origin 和跨源加载错误。

### 启动后 API key 或 provider 密钥泄露

立即撤销受影响 key，并从源码、构建日志、CI 产物和部署平台检查来源。`VITE_` 变量及浏览器端 BYOK 都不是秘密存储；改为服务端代理、服务端密钥管理和用户认证。清理历史产物不能替代撤销凭据。

## 验证清单

### 本地配置

- [ ] `pnpm typecheck` 通过。
- [ ] `pnpm build` 通过，并存在 `webcontainer-vendor` 分包。
- [ ] `pnpm dev` 的 HTML 响应包含 COOP `same-origin` 和 COEP `credentialless`。
- [ ] `pnpm preview` 的 HTML 响应包含相同两项头。
- [ ] `.env.local` 未被提交，仓库只保留 `.env.example` 中的空变量。

### 功能

- [ ] 静态 HTML 经 DOMPurify 清理并在 `sandbox` iframe 中运行。
- [ ] Vite 工程完成依赖安装、服务器启动和真实客户端交互。
- [ ] 连续打开两个交互工程时复用单实例，旧服务器和地址被清理。
- [ ] 快速重复点击不会并发 `boot`、安装或启动服务器。
- [ ] 关闭、失败和重试路径没有残留进程或过期预览地址。

### 安全与部署

- [ ] 最终部署 URL 返回正确跨源隔离头。
- [ ] 构建产物中没有 provider 服务端密钥。
- [ ] 如配置 `VITE_WEBCONTAINER_API_KEY`，确认它是受限客户端 key，并已配置 origin 和配额。
- [ ] 不将 WebContainer 用作生产 API、数据库或密钥保管服务。
- [ ] 正式商业生产前已根据 [StackBlitz WebContainer Enterprise](https://webcontainers.io/enterprise) 确认并取得所需商业许可。
