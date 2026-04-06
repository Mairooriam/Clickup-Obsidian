import { ClickupResponse_GetTeams, ClickupResponse_GetSpaces, ClickupResponse_GetFolders, ClickupResponse_GetTasks } from "./apiTypes/index.js";

export interface GetTasksOptions {
  order_by?: "id" | "created" | "updated" | "due_date"; // Order by specific fields
  reverse?: boolean; // Reverse the order
  subtasks?: boolean; // Include or exclude subtasks
  archived?: boolean; // Include archived tasks
  include_markdown_description?: boolean; // Return descriptions in Markdown
  page?: number; // Page number to fetch
  statuses?: string[]; // Filter by statuses
  include_closed?: boolean; // Include closed tasks
  include_timl?: boolean; // Include tasks in multiple lists
  assignees?: string[]; // Filter by assignees
  watchers?: string[]; // Filter by watchers
  tags?: string[]; // Filter by tags
  due_date_gt?: number; // Due date greater than (Unix time in ms)
  due_date_lt?: number; // Due date less than (Unix time in ms)
  date_created_gt?: number; // Date created greater than (Unix time in ms)
  date_created_lt?: number; // Date created less than (Unix time in ms)
  date_updated_gt?: number; // Date updated greater than (Unix time in ms)
  date_updated_lt?: number; // Date updated less than (Unix time in ms)
  date_done_gt?: number; // Date done greater than (Unix time in ms)
  date_done_lt?: number; // Date done less than (Unix time in ms)
  custom_fields?: string[]; // Filter by specific custom field values
  custom_field?: string[]; // Filter by one specific custom field
  custom_items?: number[]; // Filter by custom task types
}

export interface HttpResponse {
  json: any;
  status: number;
  text: string;
}

export class ApiService {
  private static instance: ApiService;
  private readonly token: string;

  private constructor(token: string) {
    this.token = token;
  }

  public static getInstance(token?: string): ApiService {
    if (!ApiService.instance) {
      if (!token) throw new Error("ApiService requires a token on first initialization");
      ApiService.instance = new ApiService(token);
    }
    return ApiService.instance;
  }
  private async fetcher(url: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<HttpResponse> {
    const resp = await fetch(`https://api.clickup.com/api/v2/${url}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body,
    });

    const text = await resp.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text}`);

    return { json, status: resp.status, text };
  }

  /**
   * 
   * @param options Takes in options and builds query out of them
   * meant to be used 
   * @returns 
   */
  private buildQueryParams(options?: Record<string, any>): string {
    const queryParams = new URLSearchParams();

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((item) => queryParams.append(`${key}[]`, item.toString()));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    return queryParams.toString();
  }
  //
  // public async getToken(input: string): Promise<string | undefined> {
  //   if (!input) return "MISSING_TOKEN";
  //
  //   let token = input.trim();
  //
  //   // Supports full JSON pasted from your Python callback:
  //   // {"access_token":"...","token_type":"Bearer"}
  //   try {
  //     const parsed = JSON.parse(token) as { access_token?: string };
  //     if (parsed?.access_token) token = parsed.access_token;
  //   } catch {
  //     // raw token, ignore
  //   }
  //
  //   try {
  //     localStorage.setItem("click_up_token", token);
  //
  //     // Validate token immediately
  //     const user = await this.getAuthorizedUser();
  //     if (!user?.id) throw new Error("Invalid token");
  //
  //     return token;
  //   } catch (error) {
  //     localStorage.removeItem("click_up_token");
  //     console.error("Error during getToken()", error);
  //     return undefined;
  //   }
  // }


  public async getAuthorizedUser() {
    const resp = await this.fetcher(`user`);
    const data = await resp.json;
    return data.user;
  }

  public async getTeams(): Promise<ClickupResponse_GetTeams> {
    const resp = await this.fetcher(`team`);
    return resp.json as ClickupResponse_GetTeams;
  }

  public async getSpaces(team_id: string): Promise<ClickupResponse_GetSpaces> {
    const response = await this.fetcher(`team/${team_id}/space`);
    const spaces = await response.json as ClickupResponse_GetSpaces;
    for (let i = 0; i < spaces.spaces.length; i++) {
      const space = spaces.spaces[i];
      //NOTE: if you need data from features or statuses add them
      delete space.features;
      delete space.statuses;
    }
    return spaces
  }

  public async getFolders(space_id: string): Promise<ClickupResponse_GetFolders> {
    const response = await this.fetcher(`space/${space_id}/folder`);
    const folders = await response.json as ClickupResponse_GetFolders;
    return folders;
  }

  public async getList(folder_id: string) {
    const response = await this.fetcher(`folder/${folder_id}/list`);
    const data = await response.json;
    return data.lists;
  }

  public async getFolderlessList(space_id: string) {
    const response = await this.fetcher(`space/${space_id}/list`);
    const data = await response.json;
    return data.lists;
  }

  public async getTasks(list_id: string, options?: GetTasksOptions): Promise<ClickupResponse_GetTasks> {
    const queryString = this.buildQueryParams(options);
    const url = `list/${list_id}/task?${queryString}`;
    const response = await this.fetcher(url);
    const tasks = response.json as ClickupResponse_GetTasks;
    for (let i = 0; i < tasks.tasks.length; i++) {
      const task = tasks.tasks[i];
      //NOTE: if you need data from features or statuses add them
      // add mapping function in future? TaskSLims etc.
  // return {
  //   id: task.id,
  //   name: task.name,
      delete task.custom_id;
      delete task.custom_item_id;
      delete task.description;
      delete task.status;
      delete task.orderindex;
      delete task.date_created;
      delete task.date_closed;
      delete task.date_done;
      delete task.date_updated;
      delete task.archived;
      delete task.creator;
      delete task.watchers;
      delete task.checklists;
      delete task.tags;
      delete task.points;
      delete task.custom_fields;
      delete task.dependencies;
      delete task.linked_tasks;
      delete task.locations;
      delete task.sharing;
      delete task.permission_level;
    }
    return tasks;
  }

  // public async getClickupLists(folderId: string): Promise<TAllLists[]> {
  // 	const response = await this.fetcher(`folder/${folderId}/list`);
  // 	const data = await response.json;
  // 	return data.lists;
  // }

  public async getWorkspaceUser(teamId: string, userId: string) {
    const response = await this.fetcher(`team/${teamId}/user/${userId}`);
    const data = await response.json;
    return data;
  }

  public async getAllFolders(space_id: string) {
    const response = await this.fetcher(`space/${space_id}/folder`);
    const data = await response.json;
    return data.folders;
  }

  // public async getListMembers(list_id: string): Promise<TMember[]> {
  // 	const response = await this.fetcher(`list/${list_id}/member`);
  // 	const data = await response.json;
  // 	return data.members;
  // }

  // public async createTask({
  // 	listId,
  // 	data,
  // }: {
  // 	listId: string;
  // 	data: TCreateTask;
  // }) {
  // 	const response = await this.fetcher(`list/${listId}/task`, {
  // 		method: "POST",
  // 		body: JSON.stringify(data),
  // 		headers: {
  // 			"Content-Type": "application/json",
  // 		},
  // 	});
  // 	const responseData = await response.json;
  // 	return responseData;
  // }


  public async showError(
    e: Error
  ): Promise<{ isAuth: boolean; message: string }> {
    console.log(e);
    if (e.message.includes("Oauth token not found")) {
      console.log("Erorr related to authorization");
      // new Notice(
      //   "Error related to authorization, please re-login",
      //   10000
      // );
      console.log("Error related to authorization, please re-login");
      return { isAuth: false, message: "no auth" };
    } else {
      // new Notice(`Error: ${e.message}`, 5000);
      console.log(`Error ${e.message}`, 5000);
      return { isAuth: true, message: e.message };
    }
  }
}
