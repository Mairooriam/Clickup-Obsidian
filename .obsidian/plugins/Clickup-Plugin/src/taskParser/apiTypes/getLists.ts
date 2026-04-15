export interface _Clickup_Lists {
	lists: _Clickup_List[];
}

export interface _Clickup_List {
	id: string;
	name: string;
	orderindex: number;
	content?: string;
	status?: string;
	priority?: string;
	assignee: string;
	task_count: number;
	due_date?: string;
	start_date?: string;
	folder: _Clickup_ListFolder;
	space: _Clickup_ListSpace;
	archived: boolean;
	override_statuses: boolean;
	permission_level: string;
}

export interface _Clickup_ListFolder {
	id: string;
	name: string;
	hidden?: boolean;
	archived: boolean;
	access: boolean;
}

export interface _Clickup_ListSpace {
	id: string;
	name: string;
	archived: boolean;
	access: boolean;
}

