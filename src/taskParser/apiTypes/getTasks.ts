import { Status } from "./shared.js"
export interface ClickupResponse_GetTasks {
  tasks: Task[];
  last_page: boolean;
}

export interface Task {
  id: string;
  custom_id?: string;
  custom_item_id?: number;
  name: string;
  text_content?: string;
  description?: string;
  status?: Status;
  orderindex?: string;
  date_created?: string;
  date_updated?: string;
  date_closed?: string;
  date_done?: string;
  archived?: boolean;
  creator?: Creator;
  assignees: any[];
  group_assignees: any[];
  watchers?: Creator[];
  checklists?: any[];
  tags?: any[];
  parent: string;
  top_level_parent: string;
  priority: string;
  due_date: string;
  start_date: string;
  points?: string;
  time_estimate: string;
  custom_fields?: any[];
  dependencies?: any[];
  linked_tasks?: any[];
  locations?: any[];
  team_id: string;
  url: string;
  sharing?: Sharing;
  permission_level?: string;
  list: FolderInfo;
  project: FolderInfo;
  folder: FolderInfo;
  spaceId: string;
}

export interface Creator {
  id: number;
  username: string;
  color: string;
  email: string;
  profilePicture: null;
  initials?: string;
}

export interface FolderInfo {
  id: string;
  name: string;
  hidden?: boolean;
  access: boolean;
}

export interface Sharing {
  public: boolean;
  public_share_expires_on: string;
  public_fields: string[];
  token: string;
  seo_optimized: boolean;
}
