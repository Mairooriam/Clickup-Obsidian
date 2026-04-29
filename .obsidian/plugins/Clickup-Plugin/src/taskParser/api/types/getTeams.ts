// For internal use
export interface _Clickup_Teams {
	teams: _Clickup_Team[];
}

export interface _Clickup_Team {
	id: string;
	name: string;
	color: string;
	avatar: null;
	members: _Clickup_Member[];
}

export interface _Clickup_Member {
	user: _Clickup_User;
}

export interface _Clickup_User {
	id: number;
	username: string;
	email: string;
	color: string;
	profilePicture: null;
	initials: string;
	role: number;
	role_subtype: number;
	role_key: string;
	custom_role: null;
	last_active: string;
	date_joined: string;
	date_invited: string;
}
