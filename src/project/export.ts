import { createProjectRuntimeFiles } from './normalize'
import type { GeneratedProject } from './types'

export type ProjectExportFiles = Record<string, string>

/**
 * Build the complete, portable project tree without exposing host-only paths or configuration.
 * The runtime helper owns scaffold precedence so generated files cannot override host policy.
 */
export function createProjectExportFiles(project: GeneratedProject): ProjectExportFiles {
  return createProjectRuntimeFiles(project)
}
