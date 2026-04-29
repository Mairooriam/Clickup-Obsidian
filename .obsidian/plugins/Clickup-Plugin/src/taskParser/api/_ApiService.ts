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

	//TODO: make typed
	public async updateTaskParent(task_id: string, newParent: string) {
		return this.updateTask(task_id, { parent: newParent } as any);
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
}
