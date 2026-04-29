import { _Clickup_List, _Clickup_Lists } from "./types/getLists";
import { _Clickup_Tasks } from "./types/getTasks";
import { Team, Space, Folder, Task, ClickupTaskToTask, List, ClickupListToList } from "./types/index"
import { _Clickup_Teams, _Clickup_Spaces, _Clickup_Folders } from "./types/index"
import { ClickupTeamToTeam, ClickupSpaceToSpace, ClickupFolderToFolder } from "./types/index"
import { _Clickup_CreateTask } from "./types/createTask";
import { _Clickup_Space } from "./types/getSpaces";
import { _Clickup_Folder } from "./types/getFolders";

//TODO: think of something else?
function cleanObject<T, K extends keyof T>(obj: T, keys: K[]): Partial<Pick<T, K>> {
	const result: Partial<Pick<T, K>> = {};
	for (const key of keys) {
		const value = obj[key];
		if (value !== undefined && value !== null) {
			result[key] = value;
		}
	}
	return result;
}

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

export interface CreateTaskOptions {
	name: string;
	description?: string;
	assignees?: number[];
	status?: string;
	priority?: number | null;
	due_date?: number;
	due_date_time?: boolean;
	start_date?: number;
	start_date_time?: boolean;
	time_estimate?: number;
	points?: number;
	notify_all?: boolean;
	parent?: string | null;
	markdown_content?: string;
	tags?: string[];
	archived?: boolean;
	links_to?: string | null;
	custom_item_id?: number;
}


export interface HttpResponse<T> {
	json: T;
	status: number;
	text: string;
}
interface FetcherOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	body?: string;
	headers?: Record<string, string>;
	// Add more fields if needed (e.g., credentials, mode, etc.)
}
/*
 * MEANT FOR INTERNAL USE OR IF U DONT WANT LOGGING
 * */
export class _ApiService {
	private static instance: _ApiService;
	private readonly token: string;
	private tempID: number;
	private fetcherOverride?: <T>(url: string, options?: any) => Promise<HttpResponse<T>>;

	private constructor(token: string, fetcherOverride?: <T>(url: string, options?: any) => Promise<HttpResponse<T>>) {
		this.token = token;
		this.tempID = 0;
		this.fetcherOverride = fetcherOverride;
	}

	public static getInstance(token?: string, fetcherOverride?: <T>(url: string, options?: any) => Promise<HttpResponse<T>>): _ApiService {
		if (!_ApiService.instance) {
			if (!token) throw new Error("_ApiService requires a token on first initialization");
			_ApiService.instance = new _ApiService(token, fetcherOverride);
		}
		return _ApiService.instance;
	}

	private async fetcher<T>(url: string, options: FetcherOptions = {}): Promise<HttpResponse<T>> {
		if (this.fetcherOverride) {
			return this.fetcherOverride<T>(url, options);
		}
		// const stack = new Error().stack?.split('\n').slice(2, 5).join('\n') ?? "no stack";
		// console.log(`[API] ${options.method ?? "GET"} ${url}\nCalled from:\n${stack}`);

		const resp = await fetch(`https://api.clickup.com/api/v2/${url}`, {
			method: options.method ?? "GET",
			headers: {
				Authorization: this.token,
				"Content-Type": "application/json",
				...options.headers,
			},
			...(options.body !== undefined && { body: options.body }),
		});

		const text = await resp.text();
		let json: T = null as T;
		try { json = JSON.parse(text); } catch { json = null as T; }

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

	public async getAuthorizedUser() {
		const response = await this.fetcher(`user`);
		const data = await response.json as any;
		return data.user;
	}

	public async getTeams(): Promise<Team[]> {
		const response = await this.fetcher<_Clickup_Teams>(`team`);
		const teams = response.json.teams ?? [];
		return teams.map(ClickupTeamToTeam);
	}

	public async getSpaces(teamId: string): Promise<Space[]> {
		const response = await this.fetcher<_Clickup_Spaces>(`team/${teamId}/space`);
		const spaces = response.json.spaces ?? [];
		return spaces.map(ClickupSpaceToSpace);
	}

	public async getSpace(spaceId: string): Promise<Space> {
		const response = await this.fetcher<_Clickup_Space>(`space/${spaceId}`);
		return ClickupSpaceToSpace(response.json);
	}

	public async getFolders(space_id: string): Promise<Folder[]> {
		const response = await this.fetcher<_Clickup_Folders>(`space/${space_id}/folder`);
		const folders = response.json.folders ?? [];
		return folders.map(ClickupFolderToFolder);
	}

	public async getFolder(folderId: string): Promise<Folder> {
		const response = await this.fetcher<_Clickup_Folder>(`folder/${folderId}`);
		return ClickupFolderToFolder(response.json);
	}



	public async getLists(folder_id: string): Promise<List[]> {
		const response = await this.fetcher<_Clickup_Lists>(`space/${folder_id}/folder`);
		const lists = response.json.lists ?? [];
		return lists.map(ClickupListToList);
	}

	public async getList(listId: number): Promise<List> {
		const response = await this.fetcher<_Clickup_List>(`list/${listId}`);
		return ClickupListToList(response.json);
	}

	public async getTasks(list_id: number, options?: GetTasksOptions): Promise<Task[]> {
		const queryString = this.buildQueryParams(options);
		const url = `list/${list_id}/task?${queryString}`;
		const response = await this.fetcher<_Clickup_Tasks>(url);
		const tasks = response.json.tasks ?? [];
		return tasks.map(ClickupTaskToTask);
	}

	public async updateTaskParent(task_id: string, newParent: string) {
		const url = `task/${task_id}`;
		const response = await this.fetcher<any>(url, {
			method: "PUT",
			body: JSON.stringify({ parent: newParent }),
			headers: {
				"Content-Type": "application/json",
			},
		});
		return response.json;
	}



	//TODO: make typejd
	public async updateTask(task_id: string, task: Task) {
		const url = `task/${task_id}`;
		const fieldsToSend: (keyof Task)[] = [
			"name", "parent"
		];
		const payload = cleanObject(task, fieldsToSend);
		const response = await this.fetcher<any>(url, {
			method: "PUT",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
			},
		});
		return response.json;
	}

	//TODO: make typed
	public async deleteTask(task_id: string) {
		const url = `task/${task_id}`;
		const response = await this.fetcher<any>(url, { method: "DELETE", });
		return response.json;
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




	// public async getList(folder_id: string) {
	// 	const response = await this.fetcher(`folder/${folder_id}/list`);
	// 	const data = await response.json as any;
	// 	return data.lists;
	// }
	//
	// public async getFolderlessList(space_id: string) {
	// 	const response = await this.fetcher(`space/${space_id}/list`);
	// 	const data = await response.json as any;
	// 	return data.lists;
	// }
	//
	//

	//TODO: make proper return type instead of internal type
	public async createTask(listId: number, task: CreateTaskOptions): Promise<_Clickup_CreateTask> {
		const response = await this.fetcher<_Clickup_CreateTask>(`list/${listId}/task`, {
			method: "POST",
			body: JSON.stringify(task),
		});
		const d = response.json;
		return {
			id: d.id,
			name: d.name,
			url: d.url,
			list: d.list,
			date_created: d.date_created,
		};
	}
	//
	// public async createTaskTemp(listId: number, task: CreateTaskOptions) {
	// 	void (listId)
	// 	return {
	// 		id: this.tempID++,
	// 		name: task.name,
	// 		parent: task.parent,
	// 	};
	// }
	//
	// // public async getClickupLists(folderId: string): Promise<TAllLists[]> {
	// // 	const response = await this.fetcher(`folder/${folderId}/list`);
	// // 	const data = await response.json;
	// // 	return data.lists;
	// // }
	//
	// public async getWorkspaceUser(teamId: string, userId: string) {
	// 	const response = await this.fetcher(`team/${teamId}/user/${userId}`);
	// 	const data = await response.json;
	// 	return data;
	// }
	//
	// public async getAllFolders(space_id: string) {
	// 	const response = await this.fetcher(`space/${space_id}/folder`);
	// 	const data = await response.json as any;
	// 	return data.folders;
	// }

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
