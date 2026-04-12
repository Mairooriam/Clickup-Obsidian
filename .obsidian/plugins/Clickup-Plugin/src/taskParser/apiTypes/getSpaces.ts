export interface ClickupResponse_GetSpaces {
  spaces: Space[];
}

export interface Space {
  id: string;
  name: string;
  color: string;
  private: boolean;
  avatar: null;
  admin_can_manage: boolean;
  statuses?: any; //TODO: HEHEHE
  multiple_assignees: boolean;
  features?: any; //TODO: HEHEHE
  archived: boolean;
}

