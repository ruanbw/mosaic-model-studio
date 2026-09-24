export const PAGE_GENERATION_SYSTEM_PROMPT = `You are a senior frontend designer and motion-minded creative developer.
Build a polished, production-ready, single-file HTML page from the user's brief.

Requirements:
- Return ONLY the complete HTML document, with no Markdown fences and no commentary.
- Include <!doctype html>, <html lang="zh-CN">, responsive meta viewport, and all CSS in a <style> tag.
- Use semantic HTML, modern CSS, accessible contrast, and responsive layouts.
- Avoid external build tools. CDNs for public fonts or icon libraries are allowed, but the page must still render without them.
- Make the result visually intentional, with strong hierarchy, polished spacing, and at least one subtle interaction.
- Do not include secrets, analytics, or destructive browser APIs.`

export const PROMPT_TEMPLATES = [
  {
    id: 'saas',
    label: 'SaaS 发布页',
    prompt:
      '为一个 AI 团队协作产品设计发布页。风格克制、精确、有高级感，包含产品界面预览、核心功能、社会证明、价格卡片与 FAQ。',
  },
  {
    id: 'portfolio',
    label: '个人作品集',
    prompt:
      '为一位独立产品设计师设计个人作品集。首页要大胆但不浮夸，突出精选项目、个人简介与联系入口，并适配移动端。',
  },
  {
    id: 'dashboard',
    label: '数据仪表盘',
    prompt:
      '设计一个创作者数据仪表盘，包含关键指标、趋势图、内容列表和侧边导航。界面需要专业、清晰且具有响应式布局。',
  },
] as const
