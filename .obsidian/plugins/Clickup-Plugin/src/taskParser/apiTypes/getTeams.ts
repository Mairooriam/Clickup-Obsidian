export interface ClickupResponseSlim_GetTeams {
    teams: TeamSlim[];
}

export interface ClickupResponse_GetTeams {
    teams: Team[];
}

function TeamToSlimTeam(team: Team): TeamSlim {
    return {
        id: team.id,
        name: team.name,
    };
}
export function TeamsToSlim(response: ClickupResponse_GetTeams): ClickupResponseSlim_GetTeams {
    return {
        teams: response.teams.map(TeamToSlimTeam),
    };
}

export interface TeamSlim {
	id: string;
	name: string;
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
