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

export interface _Clickup_List {
	id: string;
	name: string;
	orderindex: number;
	status: string;
	priority: string;
	assignee: string;
	task_count: number;
	due_date: string;
	start_date: string;
	space: _Clickup_ListSpace;
	archived: boolean;
	override_statuses: boolean;
	statuses: _Clickup_Status[];
	permission_level: string;
	content?: string;
}

export interface _Clickup_ListSpace {
	id: string;
	name: string;
	archived: boolean;
	access: boolean;
}

export interface _Clickup_Status {
	id: string;
	status: string;
	orderindex: number;
	color: string;
	type: string;
	status_group: string;
}

export interface _Clickup_FolderSpace {
	id: string;
	name: string;
}



