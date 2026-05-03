import { _Clickup_Team, _Clickup_Teams } from "./getTeams.js"
import { _Clickup_Space, _Clickup_Spaces } from "./getSpaces.js"
import { _Clickup_Folder, _Clickup_Folders } from "./getFolders.js"
import { _Clickup_Task, _Clickup_Tasks } from "./getTasks.js"
import { _Clickup_List } from "./getLists.js"
import { Folder, List, Space, Task, Team } from "../../types.js"
import { Colors } from "../../../utils/colors.js"
import { StatusMapping } from "../../types.js"
import { Status } from "./shared.js"

// TEAMS 
export function ClickupTeamToTeam(team: _Clickup_Team): Team {
	return {
		id: team.id,
		name: team.name,
		spaces: [],
	};
}

// SPACES
export function ClickupSpaceToSpace(spaces: _Clickup_Space): Space {
	return {
		id: spaces.id,
		name: spaces.name,
		folders: [],
	}
}

// FOLDERS
export function ClickupFolderToFolder(folder: _Clickup_Folder): Folder {
	return {
		id: folder.id,
		name: folder.name,
		orderIndex: folder.orderindex,
		taskCount: folder.task_count,
		lists: (folder.lists ?? []).map(ClickupListToList)
	}
}

export function ClickupListToList(list: _Clickup_List): List {
	return {
		id: Number(list.id),
		name: list.name,
		orderIndex: list.orderindex,
		tasks: [],
	}
}

export function ClickupTaskToTask(task: _Clickup_Task): Task {
	// Set completed based on status type
	const t = new Task(task.id, 0, task.name, Colors.default, false, false);
	t.parent = task.parent ?? undefined;
	t.top_level_parent = task.top_level_parent ?? undefined;
	t.completed = task.status?.type === 'closed';
	return t;
}

export interface GetTasksOptions {
	order_by?: "id" | "created" | "updated" | "due_date"; // Order by specific fields
	reverse?: boolean; // Reverse the order
	subtasks?: boolean; // Include or exclude subtasks
	archived?: boolean; // Include archived tasks
	include_markdown_description?: boolean; // Return descriptions in Markdown
	page?: number; // Page number to fetch
	statuses?: string[]; // Filter by statuses
	include_closed?: boolean; // Include closed tasks
	include_timl?: boolean; // Include tasks in multiple lists
	assignees?: string[]; // Filter by assignees
	watchers?: string[]; // Filter by watchers
	tags?: string[]; // Filter by tags
	due_date_gt?: number; // Due date greater than (Unix time in ms)
	due_date_lt?: number; // Due date less than (Unix time in ms)
	date_created_gt?: number; // Date created greater than (Unix time in ms)
	date_created_lt?: number; // Date created less than (Unix time in ms)
	date_updated_gt?: number; // Date updated greater than (Unix time in ms)
	date_updated_lt?: number; // Date updated less than (Unix time in ms)
	date_done_gt?: number; // Date done greater than (Unix time in ms)
	date_done_lt?: number; // Date done less than (Unix time in ms)
	custom_fields?: string[]; // Filter by specific custom field values
	custom_field?: string[]; // Filter by one specific custom field
	custom_items?: number[]; // Filter by custom task types
}

export interface CreateTaskOptions {
	name: string;
	description?: string;
	assignees?: number[];
	status?: string;
	priority?: number | null;
	due_date?: number;
	due_date_time?: boolean;
	start_date?: number;
	start_date_time?: boolean;
	time_estimate?: number;
	points?: number;
	notify_all?: boolean;
	parent?: string | null;
	markdown_content?: string;
	tags?: string[];
	archived?: boolean;
	links_to?: string | null;
	custom_item_id?: number;
}
