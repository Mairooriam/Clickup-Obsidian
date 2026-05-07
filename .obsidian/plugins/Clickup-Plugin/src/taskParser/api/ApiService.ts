import { ClickupApi } from "./clickup/ClickupApi";
import { GetTasksOptions, CreateTaskOptions } from "./clickup/types";
import { _Clickup_CreateTask } from "./clickup/types/createTask";
import { Logger } from "../utils/logger";
import { Folder, List, Space, StatusMapping, Task, Team, User } from "./types.js";
import { IApi } from "./IApi";
import { catchError } from "../utils/error.js";

export type { GetTasksOptions, CreateTaskOptions };

export type SupportedApiType = "clickup";

export function createApi(type: SupportedApiType, token: string): IApi {
	if (type === "clickup") return ClickupApi.getInstance(token);
	throw new Error("Unknown API type");
}

export class ApiService implements IApi {
	private api: IApi;

	//TODO: make mapping needed to not have mistakes when u forget to supply it.
	constructor(type: SupportedApiType, token: string, mapping?: StatusMapping) {
		this.api = createApi(type, token);
		if (mapping) this.api.setStatusMapping(mapping);
	}

	//TODO: get rid of this? clickup api has status.type. closed and open for this purpose!
	public setStatusMapping(mapping: import("./types").StatusMapping) {
		this.api.setStatusMapping(mapping);
		Logger.log("api", "Api statusMapping was set to: ", mapping);
	}

	//TODO: get rid of this? clickup api has status.type. closed and open for this purpose!
	public getStatusMappingOrThrow(): StatusMapping {
		if (!this.api.statusMapping) throw new Error("StatusMapping not set on ClickupApi");
		return this.api.statusMapping;
	};

	public updateToken(token: string) {
		this.api.updateToken(token);
		Logger.log("api", "Api token updated.");
	}

	async getTasks(listId: number, options: GetTasksOptions = { subtasks: true, include_closed: true }): Promise<Task[]> {
		const [err, data] = await catchError(this.api.getTasks(listId, options));
		if (err) { Logger.error("api", "getTasks failed", err.message); throw err; }
		return data;
	}

	//TODO: add own abstraction of createTask type?
	async createTask(listId: number, task: CreateTaskOptions): Promise<_Clickup_CreateTask> {
		const [err, data] = await catchError(this.api.createTask(listId, task));
		if (err) { Logger.error("api", "createTask failed", err.message); throw err; }
		return data;
	}

	async getAuthorizedUser(): Promise<User> {
		const [err, data] = await catchError(this.api.getAuthorizedUser());
		if (err) { Logger.error("api", "getAuthorizedUser failed", err.message); throw err; }
		return data;
	}

	async getTeams(): Promise<Team[]> {
		const [err, data] = await catchError(this.api.getTeams());
		if (err) { Logger.error("api", "getTeams failed", err.message); throw err; }
		return data;
	}

	async getSpaces(teamId: string): Promise<Space[]> {
		const [err, data] = await catchError(this.api.getSpaces(teamId));
		if (err) { Logger.error("api", "getSpaces failed", err.message); throw err; }
		return data;
	}

	async getSpace(spaceId: string): Promise<Space> {
		const [err, data] = await catchError(this.api.getSpace(spaceId));
		if (err) { Logger.error("api", "getSpace failed", err.message); throw err; }
		return data;
	}

	async getFolders(spaceId: string): Promise<Folder[]> {
		const [err, data] = await catchError(this.api.getFolders(spaceId));
		if (err) { Logger.error("api", "getFolders failed", err.message); throw err; }
		return data;
	}

	async getFolder(folderId: string): Promise<Folder> {
		const [err, data] = await catchError(this.api.getFolder(folderId));
		if (err) { Logger.error("api", "getFolder failed", err.message); throw err; }
		return data;
	}

	async getLists(folderId: string): Promise<List[]> {
		const [err, data] = await catchError(this.api.getLists(folderId));
		if (err) { Logger.error("api", "getLists failed", err.message); throw err; }
		return data;
	}

	async getList(listId: number): Promise<List> {
		const [err, data] = await catchError(this.api.getList(listId));
		if (err) { Logger.error("api", "getList failed", err.message); throw err; }
		return data;
	}

	async updateTaskParent(taskId: string, newParent: string) {
		const [err, data] = await catchError(this.api.updateTaskParent(taskId, newParent));
		if (err) { Logger.error("api", "updateTaskParent failed", err.message); throw err; }
		return data;
	}

	async updateTask(taskId: string, task: any) {
		const [err, data] = await catchError(this.api.updateTask(taskId, task));
		if (err) { Logger.error("api", "updateTask failed", err.message); throw err; }
		return data;
	}

	async deleteTask(taskId: string) {
		const [err, data] = await catchError(this.api.deleteTask(taskId));
		if (err) { Logger.error("api", "deleteTask failed", err.message); throw err; }
		return data;
	}
}
