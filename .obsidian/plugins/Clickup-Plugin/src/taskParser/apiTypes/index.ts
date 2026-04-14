export * from "./getSpaces.js" //TODO: REMOVE IN FUTURE
export * from "./getTasks.js"//TODO: REMOVE IN FUTURE
export * from "./getFolders.js"//TODO: REMOVE IN FUTURE
export * from "./createTask.js"//TODO: REMOVE IN FUTURE
import { _Clickup_Team } from "./getTeams.js"
import { _Clickup_Space } from "./getSpaces.js"
import { _Clickup_Folder } from "./getFolders.js"


// TEAMS 
export function TeamToSlimTeam(team: _Clickup_Team): Team {
	return {
		id: team.id,
		name: team.name,
		spaces: [],
	};
}

export interface Team {
	id: string;
	name: string;
	spaces: Space[];
}

// SPACES
export function ClickupSpaceToSpace(team: _Clickup_Space): Space {
	return {
		id: team.id,
		name: team.name,
		folders: [],
	}
}

export interface Space {
	id: string;
	name: string;
	folders: Folder[];
}

// FOLDERS

export function ClickupFolderToFolder(f: _Clickup_Folder): Folder {
	return {
		id: f.id,
		name: f.name,
		orderindex: f.orderindex,
		taskCount: f.task_count,
	}

}

export interface Folder {
	id: string;
	name: string;
	orderindex: number;
	taskCount: string; //TODO: check if really string or if number is good?
}

