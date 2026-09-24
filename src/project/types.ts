export type ProjectKind = 'static' | 'web'

export interface ProjectFile {
  path: string
  content: string
}

export interface GeneratedProject {
  schemaVersion: 1
  kind: ProjectKind
  title: string
  summary: string
  files: ProjectFile[]
}

export interface GenerationOutput {
  raw: string
  project: GeneratedProject
  html: string
}
