import type { Task as PMTask } from '../types'
import { makeTask } from '../types'
import { TaskCache } from '../taskParser/core'
import { Task as ParserTask } from '../taskParser/api/types'
import { Colors } from '../taskParser/utils/colors'
import type { Task as ParserTaskType } from '../taskParser/api/types'

/**
 * Options that control how task statuses are mapped between the
 * TaskParser format (boolean `completed`) and the PM format (string `status`).
 */
export interface TaskParserBridgeOptions {
  /** PM status to assign when a parsed task is completed. Defaults to 'done'. */
  completedStatus?: string
  /** PM status to assign when a parsed task is not completed. Defaults to 'todo'. */
  activeStatus?: string
}

/**
 * Parse a TaskParser-format markdown string into an array of PM Task objects.
 *
 * The markdown format looks like:
 *   - [ ] Task name [id: abc123]
 *     - [x] Subtask name [id: def456] [parent:abc123]
 *
 * The returned tasks are fully formed (via `makeTask`) and preserve the
 * subtask hierarchy.  They are ready to be inserted into a project with
 * `addTaskToTree` / `ProjectStore.importTasksFromMarkdown`.
 *
 * @param md      - Markdown string in TaskParser format.
 * @param options - Status mapping options.
 * @returns       Flat top-level PM Task array (subtasks are nested inside).
 */
export function importTasksFromMarkdown(
  md: string,
  options: TaskParserBridgeOptions = {}
): PMTask[] {
  const { completedStatus = 'done', activeStatus = 'todo' } = options

  const cache = TaskCache.fromMarkdown(md)

  const convertNode = (parserTask: ParserTaskType): PMTask => {
    const children = cache.children.get(parserTask.id) ?? []
    return makeTask({
      id: parserTask.id,
      title: parserTask.name,
      status: parserTask.completed ? completedStatus : activeStatus,
      subtasks: children.map(convertNode),
    })
  }

  return cache.roots.map(convertNode)
}

/**
 * Serialize a PM Task tree into a TaskParser-format markdown string.
 *
 * Useful for exporting tasks to ClickUp or any system that consumes the
 * TaskParser markdown format.
 *
 * @param tasks   - Top-level PM tasks (with nested subtasks).
 * @param options - Status mapping options.
 * @returns       Markdown string in TaskParser format.
 */
export function exportTasksToMarkdown(
  tasks: PMTask[],
  options: TaskParserBridgeOptions = {}
): string {
  const { completedStatus = 'done' } = options

  const flatten = (pmTask: PMTask, parentId: string | undefined, level: number): ParserTaskType[] => {
    const parserTask = new ParserTask(
      pmTask.id,
      level,
      pmTask.title,
      Colors.default,
      /* strikethrough */ false,
      pmTask.status === completedStatus
    )
    parserTask.parent = parentId
    return [parserTask, ...pmTask.subtasks.flatMap((sub) => flatten(sub, pmTask.id, level + 1))]
  }

  const flat = tasks.flatMap((t) => flatten(t, undefined, 0))
  const cache = TaskCache.fromApi(flat)
  return cache.toString()
}
