import { _Clickup_Team, _Clickup_Teams } from "./getTeams.js"
import { _Clickup_Space, _Clickup_Spaces } from "./getSpaces.js"
import { _Clickup_Folder, _Clickup_Folders } from "./getFolders.js"
import { _Clickup_Task, _Clickup_Tasks } from "./getTasks.js"
import { _Clickup_List } from "./getLists.js"
import { Folder, List, Space, Task, Team } from "../../types.js"
import { Colors } from "../../../utils/colors.js"

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
	const t = new Task(task.id, 0, task.name, Colors.default, false);
	t.parent = task.parent ?? undefined;
	t.top_level_parent = task.top_level_parent ?? undefined;
	return t;
}

