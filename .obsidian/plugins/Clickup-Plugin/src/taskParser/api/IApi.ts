import { Team, Space, Folder, List, Task, StatusMapping } from "./types";

export interface IApi {
	statusMapping?: StatusMapping;
	setStatusMapping(mapping: StatusMapping): void;
	getStatusMappingOrThrow(): StatusMapping;
	getAuthorizedUser(): Promise<any>;
	getTasks(listId: number, options?: any): Promise<Task[]>;
	createTask(listId: number, task: any): Promise<any>;
	getTeams(): Promise<Team[]>;
	getSpaces(teamId: string): Promise<Space[]>;
	getSpace(spaceId: string): Promise<Space>;
	getFolders(spaceId: string): Promise<Folder[]>;
	getFolder(folderId: string): Promise<Folder>;
	getLists(folderId: string): Promise<List[]>;
	getList(listId: number): Promise<List>;
	updateTaskParent(taskId: string, newParent: string): Promise<any>;
	updateTask(taskId: string, task: Task): Promise<any>;
	deleteTask(taskId: string): Promise<any>;
	updateToken(token: string): void;
}
