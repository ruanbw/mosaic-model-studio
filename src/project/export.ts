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
