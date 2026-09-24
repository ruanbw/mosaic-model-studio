import { nanoid } from 'nanoid'
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

const monoHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forma</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#111;color:#f2f0e9;font-family:Arial,sans-serif}.shell{min-height:100vh;padding:28px}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #383838;padding-bottom:24px}.brand{font-size:22px;font-weight:900}.status{font:12px monospace;color:#a8ff60}.hero{padding:90px 0 70px;display:grid;grid-template-columns:1.3fr .7fr;gap:40px}.kicker{font:12px monospace;color:#a8ff60;margin-bottom:24px}.hero h1{font-size:clamp(56px,9vw,128px);line-height:.86;letter-spacing:-.08em;margin:0}.hero h1 span{color:#666}.note{font:14px/1.7 monospace;color:#aaa;align-self:end;border-left:1px solid #a8ff60;padding-left:20px}.ticker{border-top:1px solid #383838;border-bottom:1px solid #383838;display:flex;overflow:hidden;white-space:nowrap}.ticker div{animation:move 18s linear infinite;font:12px monospace;padding:16px 0;color:#a8ff60}@keyframes move{to{transform:translateX(-50%)}}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#383838;margin-top:70px}.tile{background:#111;padding:34px;min-height:250px;transition:.25s}.tile:hover{background:#1b1b1b}.tile b{font:12px monospace;color:#666}.tile h2{font-size:32px;margin-top:70px}.tile p{color:#999;font-size:14px}@media(max-width:760px){.hero{grid-template-columns:1fr;padding-top:60px}.note{margin-top:30px}.grid{grid-template-columns:1fr}}
</style>
</head>
<body><main class="shell"><header class="top"><div class="brand">FORMA®</div><div class="status">● SYSTEM ONLINE / 2026</div></header><section class="hero"><div><div class="kicker">[ 001 — INDEPENDENT CREATOR SYSTEM ]</div><h1>MAKE<br><span>IT REAL.</span></h1></div><p class="note">一套为独立创作者设计的数字工作台。把策略、设计与交付放在同一个清晰的系统里。</p></section><div class="ticker"><div>STRATEGY — DESIGN — SHIP — MEASURE — STRATEGY — DESIGN — SHIP — MEASURE —&nbsp;</div></div><section class="grid"><article class="tile"><b>01 / PLAN</b><h2>方向清晰</h2><p>从模糊念头到可执行路线图。</p></article><article class="tile"><b>02 / MAKE</b><h2>制作迅速</h2><p>让设计、内容与开发保持同步。</p></article><article class="tile"><b>03 / GROW</b><h2>持续增长</h2><p>看见真正推动业务的信号。</p></article></section></main></body></html>`

const demoDocuments = [orbitHtml, monoHtml]

export const createDemoResult = (model: ModelOption, index = 0): GenerationResult => ({
  id: nanoid(12),
  providerId: model.providerId,
  providerName: model.providerName,
  model: model.model,
  accent: model.accent,
  status: 'success',
  html: demoDocuments[index % demoDocuments.length],
  raw: 'Demo document',
  elapsedMs: 820 + index * 460,
  createdAt: Date.now(),
  isDemo: true,
})

export const createInitialDemoResults = (models: ModelOption[]): GenerationResult[] =>
  models.slice(0, 2).map((model, index) => createDemoResult(model, index))
