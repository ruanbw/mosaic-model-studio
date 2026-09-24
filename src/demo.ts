import { nanoid } from 'nanoid'
import type { GeneratedProject } from './project/types'
import type { GenerationResult, ModelOption } from './types'

const orbitHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orbit</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f1e8;color:#171915;font-family:Arial,sans-serif}.wrap{max-width:1120px;margin:auto;padding:28px}.nav{display:flex;align-items:center;justify-content:space-between}.logo{font-weight:900;letter-spacing:-.06em;font-size:25px}.links{display:flex;gap:26px;font-size:13px}.pill{border:1px solid #b9b8ad;border-radius:99px;padding:11px 17px}.hero{min-height:640px;display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.18em;font-weight:800}.hero h1{font-size:clamp(64px,9vw,132px);line-height:.78;letter-spacing:-.09em;margin:28px 0 34px;max-width:700px}.hero h1 em{font-family:Georgia,serif;font-weight:400}.copy{font-size:18px;line-height:1.6;max-width:500px;color:#57594f}.actions{display:flex;gap:12px;margin-top:32px}.btn{border:0;border-radius:99px;padding:15px 22px;font-weight:800}.dark{background:#171915;color:white}.light{background:#deddd2}.visual{position:relative;min-height:500px}.orb{position:absolute;inset:5% 0 0 4%;border-radius:50%;background:#ff6b45;box-shadow:inset -50px -30px 100px #ae2f23}.ring{position:absolute;border:2px solid #171915;border-radius:50%;width:390px;height:390px;left:0;top:80px}.satellite{position:absolute;width:88px;height:88px;background:#d7ff54;border:2px solid #171915;border-radius:50%;right:2%;top:4%;display:grid;place-items:center;font-weight:900}.card{position:absolute;background:#171915;color:white;border-radius:18px;padding:20px;width:210px;bottom:0;right:5%;box-shadow:16px 16px 0 #d7ff54}.card small{color:#aead9f}.card strong{display:block;font-size:30px;margin-top:8px}@media(max-width:760px){.links{display:none}.hero{grid-template-columns:1fr;padding:60px 0}.visual{min-height:430px}.orb{inset:0 8% 0 8%}}
</style>
</head>
<body><main class="wrap"><nav class="nav"><div class="logo">orbit/</div><div class="links"><span>产品</span><span>案例</span><span>定价</span></div><button class="pill">开始使用 ↗</button></nav><section class="hero"><div><div class="eyebrow">为独立创作者而生</div><h1>把想法<br>送上<em>轨道</em></h1><p class="copy">一个安静、强大的创作空间。收集灵感，组织工作，并把你的下一个好想法推向世界。</p><div class="actions"><button class="btn dark">免费开始</button><button class="btn light">观看短片</button></div></div><div class="visual"><div class="orb"></div><div class="ring"></div><div class="satellite">AI</div><div class="card"><small>本周专注时长</small><strong>28.4h ↗</strong></div></div></section></main></body></html>`

const orbitProject: GeneratedProject = {
  schemaVersion: 1,
  kind: 'static',
  title: 'Orbit launch page',
  summary: 'A responsive editorial launch page for an independent creative workspace.',
  files: [{ path: 'index.html', content: orbitHtml }],
}

const formaMain = `import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function App() {
  const [launched, setLaunched] = useState(false)
  return (
    <main class="shell">
      <nav><strong>FORMA°</strong><span>LOCAL DEMO / 001</span></nav>
      <section>
        <p class="eyebrow">A PROJECT YOU CAN ACTUALLY RUN</p>
        <h1 className={launched ? 'launched' : ''}>Ideas into<br /><em>shipping.</em></h1>
        <p class="copy">This fixed Vite demo runs inside the shared WebContainer. The card stays lightweight; the active project opens here.</p>
        <button onClick={() => setLaunched(true)}>Ship something <span>↗</span></button>
      </section>
      <div class="cards"><article><small>01</small><strong>Plan</strong><p>Turn intent into a clear direction.</p></article><article><small>02</small><strong>Build</strong><p>Keep every useful detail in one place.</p></article><article><small>03</small><strong>Ship</strong><p>Run the project and see the result.</p></article></div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
`

const formaStyle = `*{box-sizing:border-box}body{margin:0;background:#0b0c10;color:#f3f0e8;font-family:Arial,sans-serif}.shell{min-height:100vh;padding:30px;background:radial-gradient(circle at 80% 20%,#283b2c,transparent 33%)}nav{display:flex;justify-content:space-between;border-bottom:1px solid #31353a;padding-bottom:22px;font:12px monospace;color:#9ca79f}nav strong{color:#b7ff6c;font-size:17px}section{display:grid;min-height:560px;align-content:center;padding:50px 0}.eyebrow{font:11px monospace;color:#b7ff6c;letter-spacing:.16em}h1{margin:22px 0;font-size:clamp(58px,10vw,132px);line-height:.82;letter-spacing:-.08em}h1 em{color:#b7ff6c;font-family:Georgia,serif;font-weight:400}h1.launched em{color:#fff}.copy{max-width:540px;color:#9ba19d;font:15px/1.7 monospace}button{margin-top:20px;border:1px solid #b7ff6c;background:#b7ff6c;padding:13px 18px;font-weight:700;cursor:pointer}button span{margin-left:20px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#31353a}.cards article{min-height:180px;padding:24px;background:#0b0c10}.cards small{color:#6e7671;font:10px monospace}.cards strong{display:block;margin-top:65px}.cards p{color:#7d857f;font-size:12px}@media(max-width:720px){.shell{padding:20px}.cards{grid-template-columns:1fr}.cards strong{margin-top:35px}}`

const formaProject: GeneratedProject = {
  schemaVersion: 1,
  kind: 'web',
  title: 'Forma creator console',
  summary: 'A fixed Vite + TypeScript demo that can be installed, started and previewed in the shared WebContainer.',
  files: [
    { path: 'src/main.tsx', content: formaMain },
    { path: 'src/style.css', content: formaStyle },
  ],
}

const demoProjects = [orbitProject, formaProject]

export const createDemoResult = (model: ModelOption, index = 0): GenerationResult => {
  const project = demoProjects[index % demoProjects.length] ?? orbitProject
  return {
    id: nanoid(12),
    providerId: model.providerId,
    providerName: model.providerName,
    model: model.model,
    accent: model.accent,
    status: 'success',
    project,
    html: project.kind === 'static' ? project.files[0]?.content ?? '' : '',
    raw: project.kind === 'static' ? 'Demo static document' : JSON.stringify(project, null, 2),
    elapsedMs: 820 + index * 460,
    createdAt: Date.now(),
    isDemo: true,
  }
}

export const createInitialDemoResults = (models: ModelOption[]): GenerationResult[] =>
  models.slice(0, 2).map((model, index) => createDemoResult(model, index))
