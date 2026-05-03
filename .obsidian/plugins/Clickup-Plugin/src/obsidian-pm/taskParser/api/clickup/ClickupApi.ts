import { _Clickup_List, _Clickup_Lists } from "./types/getLists";
import { _Clickup_Tasks } from "./types/getTasks";
import { ClickupTaskToTask, ClickupListToList, GetTasksOptions, CreateTaskOptions } from "./types/index"
import { ClickupTeamToTeam, ClickupSpaceToSpace, ClickupFolderToFolder } from "./types/index"
import { _Clickup_CreateTask } from "./types/createTask";
import { _Clickup_Space, _Clickup_Spaces } from "./types/getSpaces";
import { _Clickup_Folder, _Clickup_Folders } from "./types/getFolders";
import { Folder, List, Space, Task, Team, TaskSchema, StatusMapping } from "../types";
import { _Clickup_Teams } from "./types/getTeams";
import { IApi } from "../IApi";

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
export class ClickupApi implements IApi {
	private static instance: ClickupApi;
	private readonly token: string;
	private tempID: number;
	private fetcherOverride?: <T>(url: string, options?: any) => Promise<HttpResponse<T>>;


	private constructor(token: string, fetcherOverride?: <T>(url: string, options?: any) => Promise<HttpResponse<T>>) {
		this.token = token;
		this.tempID = 0;
		this.fetcherOverride = fetcherOverride;
	}
	//TODO: get rid of this? clickup api has status.type. closed and open for this purpose!
	public statusMapping?: StatusMapping;
	public setStatusMapping(mapping: StatusMapping) {
		this.statusMapping = mapping;
	}

	//TODO: get rid of this? clickup api has status.type. closed and open for this purpose!
	public getStatusMappingOrThrow(): StatusMapping {
		if (!this.statusMapping) throw new Error("StatusMapping not set on ClickupApi");
		return this.statusMapping;
	};
	public static getInstance(token?: string, fetcherOverride?: <T>(url: string, options?: any) => Promise<HttpResponse<T>>): ClickupApi {
		if (!ClickupApi.instance) {
			if (!token) throw new Error("ClickupApi requires a token on first initialization");
			ClickupApi.instance = new ClickupApi(token, fetcherOverride);
		}
		return ClickupApi.instance;
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

	public async updateTaskParent(task_id: string, newParent: string): Promise<any> {
		return this.updateTask(task_id, { parent: newParent } as Task);
	}



	public async updateTask(task_id: string, task: Task): Promise<any> {
		const mapping = this.getStatusMappingOrThrow();
		const url = `task/${task_id}`;
		const parsed = TaskSchema.pick({ name: true, parent: true }).partial().parse(task);
		const payload: Record<string, any> = { ...parsed };
		payload.status = task.completed ? mapping.completedStatus : mapping.activeStatus;
		console.log("payload", payload);
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
