import { _Clickup_List } from "./getLists.js";

export interface _Clickup_Folders {
	folders: _Clickup_Folder[];
}

export interface _Clickup_Folder {
	id: string;
	name: string;
	orderindex: number;
	override_statuses: boolean;
	hidden: boolean;
	space: _Clickup_FolderSpace;
	task_count: string;
	archived: boolean;
	statuses: any[];
	lists: _Clickup_List[];
	permission_level: string;
}

export interface _Clickup_FolderSpace {
	id: string;
	name: string;
}



