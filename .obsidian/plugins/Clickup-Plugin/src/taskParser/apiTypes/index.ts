import { _Clickup_Team, _Clickup_Teams } from "./getTeams.js"
import { _Clickup_Space, _Clickup_Spaces } from "./getSpaces.js"
import { _Clickup_Folder, _Clickup_Folders } from "./getFolders.js"
import { _Clickup_Task, _Clickup_Tasks } from "./getTasks.js"
import { _Clickup_List } from "./getLists.js"

import { Colors, Color } from "./../utils/colors.js";
import { TaskCache } from "./../core.js"

export type { _Clickup_Teams } from "./getTeams.js"
export type { _Clickup_Spaces } from "./getSpaces.js"
export type { _Clickup_Folders } from "./getFolders.js"


// TEAMS 
export function ClickupTeamToTeam(team: _Clickup_Team): Team {
	return {
		id: team.id,
		name: team.name,
		spaces: [],
	};
}

// export function ClickupTeamsToTeams(teams: _Clickup_Teams): Team[] {
// 	return teams.teams.map(ClickupTeamToTeam);
// }

export interface Team {
	id: string;
	name: string;
	spaces: Space[];
}

// SPACES

export function ClickupSpaceToSpace(spaces: _Clickup_Space): Space {
	return {
		id: spaces.id,
		name: spaces.name,
		folders: [],
	}
}

// export function ClickupSpacesToSpaces(spaces: _Clickup_Spaces): Space[] {
// 	return spaces.Spaces.map(ClickupSpaceToSpace);
// }

export interface Space {
	id: string;
	name: string;
	folders: Folder[];
}

// FOLDERS
export function ClickupFolderToFolder(folder: _Clickup_Folder): Folder {
	return {
		id: folder.id,
		name: folder.name,
		orderIndex: folder.orderindex,
		taskCount: folder.task_count,
		lists: folder.lists.map(ClickupListToList)
	}
}

// export function ClickupFolderToFolders(folders: _Clickup_Folders): Folder[] {
// 	return folders.folders.map(ClickupFolderToFolder);
// }

export interface Folder {
	id: string;
	name: string;
	orderIndex: number;
	taskCount: string; //TODO: check if really string or if number is good?
	lists: List[];
}

// LISTS
export interface List {
	id: number;
	name: string;
	orderIndex: number;
	tasks: Task[];
}

export function ClickupListToList(list: _Clickup_List): List {
	return {
		id: Number(list.id),
		name: list.name,
		orderIndex: list.orderindex,
		tasks: [],
	}
}

// TASKS
export class Task {
	id: string;
	level: number; // used in display. not in clickup
	name: string;
	color: Color; // used in display. not in clickup
	parent?: string;
	top_level_parent?: string;

	constructor(id: string, level: number, name: string, color: Color = Colors.default) {
		this.id = id;
		this.level = level;
		this.name = name;
		this.color = color;
	}

	toString(): string {
		const indent = "\t".repeat(this.level);
		const parent = this.parent ? ` [parent:${this.parent}]` : "";
		const content = `${indent}- ${this.name} [id:${this.id}]${parent}`;

		if (this.color) {
			return `<span style="color:${this.color};white-space:pre">${content}</span>`;
		}
		return content;
	}
}

export function tasksToString(tasks: Task[]): string {
	return tasks.map(t => t.toString()).join("\n");
}

export function ClickupTaskToTask(task: _Clickup_Task): Task {
	const t = new Task(task.id, 0, task.name);
	t.parent = task.parent ?? undefined;
	t.top_level_parent = task.top_level_parent ?? undefined;
	return t;
}



/**
 * Serialize a full Team hierarchy (Team > Space > Folder > List > Tasks) to markdown.
 */
export function teamsToMarkdown(teams: Team[]): string {
	return teams.map(teamToMarkdown).join("\n");
}

export function teamToMarkdown(team: Team): string {
	const lines: string[] = [];
	lines.push(`## [teams] ${team.name} [id:${team.id}]`);
	for (const space of team.spaces) {
		lines.push(spaceToMarkdown(space));
	}
	return lines.join("\n");
}

function spaceToMarkdown(space: Space): string {
	const lines: string[] = [];
	lines.push(`### [spaces] ${space.name} [id:${space.id}]`);
	for (const folder of space.folders) {
		lines.push(folderToMarkdown(folder));
	}
	return lines.join("\n");
}

function folderToMarkdown(folder: Folder): string {
	const lines: string[] = [];
	lines.push(`#### [folders] ${folder.name} [id:${folder.id}]`);
	for (const list of folder.lists) {
		lines.push(listToMarkdown(list));
	}
	return lines.join("\n");
}

//TODO: make something nicer later not hpapy wthi this whole thing
function listToMarkdown(list: List): string {
	const lines: string[] = [];
	lines.push(`##### [lists] ${list.name} [id:${list.id}]`);
	// Convert tasks to TaskCache and use its toString for proper hierarchy
	if (list.tasks && list.tasks.length > 0 && typeof TaskCache !== "undefined") {
		const cache = TaskCache.fromApi(list.tasks);
		lines.push(cache.toString());
	}
	return lines.join("\n");
}
