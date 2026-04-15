// For internal use
export interface _Clickup_Spaces {
	Spaces: _Clickup_Space[];
}

export interface _Clickup_Space {
	id: string;
	name: string;
	color: string;
	private: boolean;
	avatar: null;
	admin_can_manage: boolean;
	statuses?: any; //TODO: Not full type
	multiple_assignees: boolean;
	features?: any; //TODO: Not full type
	archived: boolean;
}

