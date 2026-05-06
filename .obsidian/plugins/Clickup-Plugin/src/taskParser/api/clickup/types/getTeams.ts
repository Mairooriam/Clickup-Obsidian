import { _Clickup_User } from "./getAuthorizedUser";

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


