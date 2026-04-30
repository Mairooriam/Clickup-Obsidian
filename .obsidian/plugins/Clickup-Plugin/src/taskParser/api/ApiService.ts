import { ClickupApi, GetTasksOptions, CreateTaskOptions } from "./clickup/ClickupApi";
import { Logger } from "../utils/logger";
import { Folder, List, Space, Task, Team } from "./types.js";
import { _Clickup_CreateTask } from "./clickup/types/createTask";

export type { GetTasksOptions, CreateTaskOptions };

export class ApiService {
	private api: ClickupApi;

	constructor(api: ClickupApi) {
		this.api = api;
	}
	/**
	 * Get an ApiService instance using a ClickUp API token.
	 * @param token The ClickUp API token.
	 * @param fetcherOverride Optional fetcher for testing/mocking.
	 */
	static getInstance(token: string, fetcherOverride?: <T>(url: string, options?: any) => Promise<any>): ApiService {
		const api = ClickupApi.getInstance(token, fetcherOverride);
		return new ApiService(api);
	}

	async getTasks(listId: number, options?: GetTasksOptions): Promise<Task[]> {
		try {
			return await this.api.getTasks(listId, options);
		} catch (err) {
			Logger.error("api", "getTasks failed", err);
			throw err;
		}
	}

	//TODO: add own abstraction of createTask type?
	async createTask(listId: number, task: CreateTaskOptions): Promise<_Clickup_CreateTask> {
		try {
			return await this.api.createTask(listId, task);
		} catch (err) {
			Logger.error("api", "createTask failed", err);
			throw err;
		}
	}

	async getTeams(): Promise<Team[]> {
		try {
			return await this.api.getTeams();
		} catch (err) {
			Logger.error("api", "getTeams failed", err);
			throw err;
		}
	}

	async getSpaces(teamId: string): Promise<Space[]> {
		try {
			return await this.api.getSpaces(teamId);
		} catch (err) {
			Logger.error("api", "getSpaces failed", err);
			throw err;
		}
	}

	async getSpace(spaceId: string): Promise<Space> {
		try {
			return await this.api.getSpace(spaceId);
		} catch (err) {
			Logger.error("api", "getSpace failed", err);
			throw err;
		}
	}

	async getFolders(spaceId: string): Promise<Folder[]> {
		try {
			return await this.api.getFolders(spaceId);
		} catch (err) {
			Logger.error("api", "getFolders failed", err);
			throw err;
		}
	}

	async getFolder(folderId: string): Promise<Folder> {
		try {
			return await this.api.getFolder(folderId);
		} catch (err) {
			Logger.error("api", "getFolder failed", err);
			throw err;
		}
	}

	async getLists(folderId: string): Promise<List[]> {
		try {
			return await this.api.getLists(folderId);
		} catch (err) {
			Logger.error("api", "getLists failed", err);
			throw err;
		}
	}

	async getList(listId: number): Promise<List> {
		try {
			return await this.api.getList(listId);
		} catch (err) {
			Logger.error("api", "getList failed", err);
			throw err;
		}
	}

	async updateTaskParent(taskId: string, newParent: string) {
		try {
			return await this.api.updateTaskParent(taskId, newParent);
		} catch (err) {
			Logger.error("api", "updateTaskParent failed", err);
			throw err;
		}
	}

	async updateTask(taskId: string, task: any) {
		try {
			return await this.api.updateTask(taskId, task);
		} catch (err) {
			Logger.error("api", "updateTask failed", err);
			throw err;
		}
	}

	async deleteTask(taskId: string) {
		try {
			return await this.api.deleteTask(taskId);
		} catch (err) {
			Logger.error("api", "deleteTask failed", err);
			throw err;
		}
	}

	// Add other methods as needed...
}
