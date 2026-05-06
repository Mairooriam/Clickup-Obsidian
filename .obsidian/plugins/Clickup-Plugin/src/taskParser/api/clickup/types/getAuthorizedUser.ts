export interface _Clickup_User {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
  initials: string;
  week_start_day: number | null;
  global_font_support: boolean;
  timezone: string;
}

export interface _Clickup_AuthorizedUser {
  user: _Clickup_User;
}
