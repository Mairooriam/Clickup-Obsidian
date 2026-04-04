export interface ClickupResponse_GetFolders {
  folders: Folder[];

}

export interface Folder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: FolderSpace;
  task_count: string;
  archived: boolean;
  statuses: any[];
  lists: List[];
  permission_level: string;
}

export interface List {
  id: string;
  name: string;
  orderindex: number;
  status: null;
  priority: null;
  assignee: null;
  task_count: number;
  due_date: null;
  start_date: null;
  space: ListSpace;
  archived: boolean;
  override_statuses: boolean;
  statuses: Status[];
  permission_level: string;
  content?: string;
}

export interface ListSpace {
  id: string;
  name: string;
  archived: boolean;
  access: boolean;
}

export interface Status {
  id: string;
  status: string;
  orderindex: number;
  color: string;
  type: string;
  status_group: string;
}

export interface FolderSpace {
  id: string;
  name: string;
}



