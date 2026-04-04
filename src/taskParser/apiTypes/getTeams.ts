export interface ClickupResponse_GetTeams {
    teams: Team[];
}

export interface Team {
    id:      string;
    name:    string;
    color:   string;
    avatar:  null;
    members: Member[];
}

export interface Member {
    user: User;
}

export interface User {
    id:             number;
    username:       string;
    email:          string;
    color:          string;
    profilePicture: null;
    initials:       string;
    role:           number;
    role_subtype:   number;
    role_key:       string;
    custom_role:    null;
    last_active:    string;
    date_joined:    string;
    date_invited:   string;
}
