import { MarkdownView, Plugin, Notice, TFile, Editor } from 'obsidian'
import { DEFAULT_SETTINGS, PMSettings, Project } from './obsidian-pm/types'
import { flattenTasks } from './obsidian-pm/store/TaskTreeOps'
import { ProjectStore } from './obsidian-pm/store'
import { MIR_DEFAULT_SETTINGS, PMSettingTab } from './settings'
import { ProjectView, PM_PROJECT_VIEW_TYPE } from './obsidian-pm/views/ProjectView'
import { DashboardView, PM_DASHBOARD_VIEW_TYPE } from './obsidian-pm/views/DashboardView'
import { PMViewRouter } from './obsidian-pm/views/PMViewRouter'
import { openProjectModal, openTaskModal, openProjectPicker, openTaskPicker, openImportModal } from './obsidian-pm/ui/ModalFactory'
import { Notifier } from './obsidian-pm/components/Notifier'
import { migrateProjects } from './obsidian-pm/migration'
import { safeAsync } from './obsidian-pm/utils'
import { exportTasksToMarkdown } from './obsidian-pm/store/TaskParserBridge'



//NOTE: MIRO IMPORTS
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { cmdAskAndSetClickupSettings, cmdCheckDiff, cmdGetRemote, cmdRemoveSelectionColor, cmdTokenize } from 'commands';
import { ApiService, TaskParser } from "taskParser";

//NOTE: MIRO
const DEFAULT_STATUS_MAPPING = {
	completedStatus: "completed",
	activeStatus: "not started",
	availableStatuses: ["completed", "not started"]
};
export default class PMPlugin extends Plugin {
	settings: PMSettings = { ...DEFAULT_SETTINGS }
	store!: ProjectStore
	notifier!: Notifier
	router!: PMViewRouter
	undoStack: Array<{ undo: () => Promise<void>; redo: () => Promise<void> }> = []
	redoStack: Array<{ undo: () => Promise<void>; redo: () => Promise<void> }> = []

	MirSettings: MyPluginSettings = { ...MIR_DEFAULT_SETTINGS };  //NOTE: MIRO
	api: ApiService;//NOTE: MIRO
	static useColor: boolean = true;//NOTE: MIRO

	pushUndo(entry: { undo: () => Promise<void>; redo: () => Promise<void> }): void {
		this.undoStack.push(entry)
		if (this.undoStack.length > 20) this.undoStack.shift()
		this.redoStack = []
	}

	async undoLastAction(): Promise<void> {
		const entry = this.undoStack.pop()
		if (entry) {
			await entry.undo()
			this.redoStack.push(entry)
		}
	}

	async redoLastAction(): Promise<void> {
		const entry = this.redoStack.pop()
		if (entry) {
			await entry.redo()
			this.undoStack.push(entry)
		}
	}

	async onload(): Promise<void> {
		await this.loadSettings(); //NOTE: Miro
		if (this.MirSettings.apiKey) {
			this.api = new ApiService("clickup", this.MirSettings.apiKey, this.MirSettings.statusMapping || DEFAULT_STATUS_MAPPING); //NOTE: Miro
		} else {
			new Notice("API key not set. Please enter it in the plugin settings.");
		}

		await this.loadSettings()
		this.store = new ProjectStore(this.app, () => this.settings.statuses)
		this.notifier = new Notifier(this)
		this.router = new PMViewRouter(this)

		this.registerView(PM_PROJECT_VIEW_TYPE, (leaf) => new ProjectView(leaf, this))
		this.registerView(PM_DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this))

		this.app.workspace.onLayoutReady(
			safeAsync(async () => {
				await migrateProjects(this)
			})
		)

		this.addRibbonIcon('chart-gantt', 'Project manager', async () => {
			await this.router.openDashboard()
		})

		//NOTE: MIRO START
		this.addCommand({
			id: 'get-remote',
			name: 'get remote',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const apiKey = this.MirSettings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.MirSettings.apiKey, this.MirSettings.statusMapping || DEFAULT_STATUS_MAPPING);

				cmdGetRemote(this, editor, view);

			}
		});

		this.addCommand({
			id: 'tokenize',
			name: 'tokenize selection',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				cmdTokenize(this, editor, view);
			}
		});

		this.addCommand({
			id: 'check-diff',
			name: 'DiffChecker',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.MirSettings.apiKey, this.MirSettings.statusMapping || DEFAULT_STATUS_MAPPING);
				cmdCheckDiff(this, editor, view);
			}
		});
		this.addCommand({
			id: 'test-parse-md',
			name: 'Clickup Remove color',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.MirSettings.apiKey, this.MirSettings.statusMapping || DEFAULT_STATUS_MAPPING);

				cmdRemoveSelectionColor(this, editor, view);
			}
		});
		this.addCommand({
			id: 'set-settings',
			name: 'Set settings',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.MirSettings.apiKey, this.MirSettings.statusMapping || DEFAULT_STATUS_MAPPING);
				cmdAskAndSetClickupSettings(this, editor, view);
			}
		});


		this.addCommand({
			id: 'push-new',
			name: 'push new',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				//TODO: get rid of this? clickup api has status.type. closed and open for this purpose!
				this.settings.statusMapping = DEFAULT_STATUS_MAPPING;
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.MirSettings.apiKey, this.MirSettings.statusMapping || DEFAULT_STATUS_MAPPING);
				console.log(this.api);


				let selection = editor.getSelection();
				const newMd = await TaskParser.processDiffToPost(selection, this.settings.list.selected, this.api);
				if (newMd) {
					editor.replaceSelection(newMd);
				}
			}
		});
		//NOTE: MIRO END


		this.addCommand({
			id: 'open-projects',
			name: 'Open projects pane',
			callback: () => {
				void this.router.openDashboard()
			}
		})

		this.addCommand({
			id: 'new-project',
			name: 'Create new project',
			callback: () => {
				openProjectModal(this, {
					onSave: async (project) => {
						await this.router.openProjectByPath(project.filePath)
					}
				})
			}
		})

		this.addCommand({
			id: 'new-task',
			name: 'Create new task',
			callback: () => {
				void this.pickProjectThenCreateTask(null)
			}
		})

		this.addCommand({
			id: 'new-subtask',
			name: 'Create new subtask',
			callback: () => {
				void this.pickProjectThenCreateTask('pick-parent')
			}
		})

		this.addCommand({
			id: 'undo-last-action',
			name: 'Undo last action',
			callback: () => {
				void this.undoLastAction()
			}
		})

		this.addCommand({
			id: 'redo-last-action',
			name: 'Redo last action',
			callback: () => {
				void this.redoLastAction()
			}
		})

		this.addCommand({
			id: 'import-notes-as-tasks',
			name: 'Import notes as tasks',
			callback: () => {
				void this.importNotes()
			}
		})

		this.addCommand({
			id: 'import-markdown-tasks',
			name: 'Mir: Import active file as TaskParser tasks',
			callback: () => {
				void this.importActiveFileAsTasks()
			}
		})

		this.addCommand({
			id: 'export-tasks-to-markdown',
			name: 'Mir: Export current project tasks to markdown',
			callback: () => {
				void this.exportCurrentProjectToMarkdown()
			}
		})

		this.addCommand({
			id: 'import-selection-as-tasks',
			name: 'Mir Import selection as tasks',
			editorCheckCallback: (checking, editor) => {
				const selection = editor.getSelection()
				if (!selection.trim()) return false
				if (checking) return true
				void this.importSelectionAsTasks(selection)
				return true
			}
		})

		this.addCommand({
			id: 'insert-project-tasks-at-cursor',
			name: 'Mir: Insert project tasks at cursor',
			editorCheckCallback: (checking, editor) => {
				if (checking) return true
				void this.insertProjectTasksAtCursor(editor)
				return true
			}
		})

		this.addCommand({
			id: 'open-current-as-project',
			name: 'Open current file as project',
			checkCallback: (checking: boolean) => {
				const md = this.app.workspace.getActiveViewOfType(MarkdownView)
				const file = md?.file
				if (!file) return false
				const cache = this.app.metadataCache.getFileCache(file)
				if (cache?.frontmatter?.['pm-project'] !== true) return false
				if (checking) return true
				void md.leaf.setViewState({ type: PM_PROJECT_VIEW_TYPE, state: { filePath: file.path } })
				return true
			}
		})

		this.addSettingTab(new PMSettingTab(this.app, this))
		this.notifier.start()
	}

	onunload(): void {
		this.notifier.stop()
	}

	async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) as Partial<PMSettings> | null
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {})
		this.mirSettings = Object.assign({}, MIR_DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
		if (!saved?.statuses?.length) this.settings.statuses = DEFAULT_SETTINGS.statuses
		if (!saved?.priorities?.length) this.settings.priorities = DEFAULT_SETTINGS.priorities

		let migrated = false
		for (const s of this.settings.statuses) {
			if (s.complete === undefined) {
				s.complete = s.id === 'done' || s.id === 'cancelled'
				migrated = true
			}
		}
		if (migrated) await this.saveSettings()
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings)
	}

	showNotice(msg: string, duration = 3000): void {
		new Notice(msg, duration)
	}

	/** Show project picker, then open TaskModal to create a task (optionally pick parent for subtask) */
	private async pickProjectThenCreateTask(mode: null | 'pick-parent'): Promise<void> {
		const projects = await this.store.loadAllProjects(this.settings.projectsFolder)
		if (!projects.length) {
			this.showNotice('No projects yet. Create a project first.')
			return
		}
		openProjectPicker(this, projects, (project) => {
			if (mode === 'pick-parent') {
				const flat = flattenTasks(project.tasks)
				if (!flat.length) {
					this.showNotice('No tasks in this project. Create a task first.')
					return
				}
				openTaskPicker(
					this,
					flat.map((f) => f.task),
					(parentTask) => {
						this.openTaskModalForProject(project, parentTask.id)
					}
				)
			} else {
				this.openTaskModalForProject(project, null)
			}
		})
	}

	private openTaskModalForProject(project: Project, parentId: string | null): void {
		openTaskModal(this, project, {
			parentId,
			onSave: async () => {
				await this.store.saveProject(project)
				await this.router.openProjectByPath(project.filePath)
			}
		})
	}

	/**
	 * Read the active markdown file and import its task list (TaskParser format)
	 * into a user-selected project.
	 */
	private async importActiveFileAsTasks(): Promise<void> {
		const mdView = this.app.workspace.getActiveViewOfType(MarkdownView)
		const file = mdView?.file
		if (!file) {
			this.showNotice('Open a markdown file first.')
			return
		}

		const md = await this.app.vault.read(file)
		const projects = await this.store.loadAllProjects(this.settings.projectsFolder)
		if (!projects.length) {
			this.showNotice('No projects yet. Create a project first.')
			return
		}

		openProjectPicker(this, projects, async (project) => {
			const imported = await this.store.importTasksFromMarkdown(project, md)
			this.showNotice(`Imported ${imported.length} task(s) from "${file.basename}" into "${project.title}".`)
			await this.router.openProjectByPath(project.filePath)
		})
	}

	/**
	 * Export the active project's tasks as a TaskParser-format markdown file
	 * next to the project file (e.g. MyProject_export.md).
	 */
	private async exportCurrentProjectToMarkdown(): Promise<void> {
		const activeLeaves = this.app.workspace.getLeavesOfType(PM_PROJECT_VIEW_TYPE)
		let activeProject: Project | null = null
		for (const leaf of activeLeaves) {
			if (leaf.view instanceof ProjectView && leaf.view.project) {
				activeProject = leaf.view.project
				break
			}
		}

		if (!activeProject) {
			this.showNotice('No project is currently open.')
			return
		}

		const md = exportTasksToMarkdown(activeProject.tasks)
		const exportPath = activeProject.filePath.replace(/\.md$/, '_export.md')
		const existing = this.app.vault.getAbstractFileByPath(exportPath)
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, md)
		} else {
			await this.app.vault.create(exportPath, md)
		}
		this.showNotice(`Exported tasks to "${exportPath}".`)
	}

	/**
	 * Parse the current editor selection as TaskParser-format markdown and
	 * import the resulting tasks into a user-selected project.
	 */
	private async importSelectionAsTasks(selection: string): Promise<void> {
		const projects = await this.store.loadAllProjects(this.settings.projectsFolder)
		if (!projects.length) {
			this.showNotice('No projects yet. Create a project first.')
			return
		}

		openProjectPicker(this, projects, async (project) => {
			const imported = await this.store.importTasksFromMarkdown(project, selection)
			this.showNotice(`Imported ${imported.length} task(s) into "${project.title}".`)
			await this.router.openProjectByPath(project.filePath)
		})
	}

	/**
	 * Serialize the open project's tasks as TaskParser markdown and insert
	 * the text at the current cursor position in the active editor.
	 */
	private async insertProjectTasksAtCursor(editor: Editor): Promise<void> {
		const activeLeaves = this.app.workspace.getLeavesOfType(PM_PROJECT_VIEW_TYPE)
		let activeProject: Project | null = null
		for (const leaf of activeLeaves) {
			if (leaf.view instanceof ProjectView && leaf.view.project) {
				activeProject = leaf.view.project
				break
			}
		}

		if (!activeProject) {
			// No project view open — let user pick one
			const projects = await this.store.loadAllProjects(this.settings.projectsFolder)
			if (!projects.length) {
				this.showNotice('No projects yet. Create a project first.')
				return
			}
			openProjectPicker(this, projects, (project) => {
				const md = exportTasksToMarkdown(project.tasks)
				editor.replaceSelection(md)
			})
			return
		}

		const md = exportTasksToMarkdown(activeProject.tasks)
		editor.replaceSelection(md)
	}

	private async importNotes(): Promise<void> {
		const activeLeaves = this.app.workspace.getLeavesOfType(PM_PROJECT_VIEW_TYPE)
		let activeProject: Project | null = null

		for (const leaf of activeLeaves) {
			if (!(leaf.view instanceof ProjectView)) continue
			if (leaf.view.project) {
				activeProject = leaf.view.project
				break
			}
		}

		if (activeProject) {
			const project = activeProject
			const onImportComplete = async () => {
				await this.router.openProjectByPath(project.filePath)
			}
			openImportModal(this, activeProject, onImportComplete)
			return
		}

		const projects = await this.store.loadAllProjects(this.settings.projectsFolder)
		if (!projects.length) {
			this.showNotice('No projects yet. Create a project first.')
			return
		}

		openProjectPicker(this, projects, (project) => {
			const onImportComplete = async () => {
				await this.router.openProjectByPath(project.filePath)
			}
			openImportModal(this, project, onImportComplete)
		})
	}
}
