import { createProjectRuntimeFiles } from './normalize'
import type { GeneratedProject } from './types'

export type ProjectExportFiles = Record<string, string>

/**
 * Build the complete, portable project tree without exposing host-only paths or configuration.
 * The runtime helper revalidates model-controlled files and owns scaffold/static
 * host policy so generated files cannot override it.
 */
export function createProjectExportFiles(project: GeneratedProject): ProjectExportFiles {
  return createProjectRuntimeFiles(project)
}

export function downloadProjectBundle(project: GeneratedProject): void {
  const files = createProjectExportFiles(project)
  const bundle = JSON.stringify({ schemaVersion: 1, files }, null, 2)
  const blob = new Blob([bundle], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${project.title.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '') || 'generated-project'}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
