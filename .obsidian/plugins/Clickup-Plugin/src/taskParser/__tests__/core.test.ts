import { join } from "path";
import { ApiService } from "../api/ApiService";
import { ClickupApi } from "../api/clickup/ClickupApi";
import * as fs from "fs";
import { TaskCache } from "../taskCache";
import { Logger } from "../utils/logger";
import { ClickupTaskToTask } from "../api/clickup/types/index";
import { Task } from "../api/types";

Logger.setLevel("parser", "warn");
beforeEach(() => {
	// @ts-ignore
	ClickupApi.instance = undefined;
});
beforeAll(() => {
	Logger.setLevel("api", "none");
});

const mockResponse = JSON.parse(
	fs.readFileSync(join(__dirname, "getTasks-response.json"), "utf-8")
);
function createTestApi(mockFetcher: any) {
	return ClickupApi.getInstance("FAKE_TOKEN", mockFetcher);
}
function mockFetcher<T>(url: string, options?: any) {
	const result = {
		json: mockResponse,
		status: 200,
		text: JSON.stringify(mockResponse),
	};
	if (result.status < 200 || result.status >= 300) {
		return Promise.reject(new Error(`HTTP ${result.status}: ${result.text}`));
	}
	return Promise.resolve(result);
}
function createMockFetcher(responders: Record<string, (url: string, options?: any) => any>) {
	return function mockFetcher<T>(url: string, options?: any) {
		const responder = responders[url] || responders["*"];
		const result = responder ? responder(url, options) : { json: {}, status: 404, text: "{}" };
		if (result.status < 200 || result.status >= 300) {
			return Promise.reject(new Error(`HTTP ${result.status}: ${result.text}`));
		}
		return Promise.resolve(result);
	};
}
test("ApiService.getTasks => taskCache", async () => {
	// Properly reset the singleton before injecting the mock fetcher
	// @ts-ignore
	ClickupApi.instance = undefined;
	ClickupApi.getInstance("FAKE_TOKEN", mockFetcher);
	const api = new ApiService("clickup", "FAKE_TOKEN");
	const tasks = await api.getTasks(12345);

	// Validate the getTasks gets parents correctly
	expect(tasks).toBeInstanceOf(Array);
	expect(tasks.length).toBeGreaterThan(0);

	const task1 = tasks.find(task => task.id === "86c9d98j2");
	expect(task1).toBeDefined();
	expect(task1?.parent).toBe("86c9d98hk");

	const task2 = tasks.find(task => task.id === "86c9d98hm");
	expect(task2).toBeDefined();
	expect(task2?.parent).toBe("86c9d98hk");

	const task3 = tasks.find(task => task.id === "86c9d98hp");
	expect(task3).toBeDefined();
	expect(task3?.parent).toBe("86c9d98hm");


	// Check that cache is valid on creation

	const cache = TaskCache.fromApi(tasks);
	const cacheTask1 = cache.map.get("86c9d98j2");
	expect(cacheTask1).toBeDefined();
	expect(cacheTask1?.parent).toBe("86c9d98hk");

	const cacheTask2 = cache.map.get("86c9d98hm");
	expect(cacheTask2).toBeDefined();
	expect(cacheTask2?.parent).toBe("86c9d98hk");

	const cacheTask3 = cache.map.get("86c9d98hp");
	expect(cacheTask3).toBeDefined();
	expect(cacheTask3?.parent).toBe("86c9d98hm");
});


//TODO: these should really be made proper. curretly not doing anything.
const endpointResponses = {
	getAuthorizedUser: { json: { user: { id: 1, username: "test", email: "test@test.com", color: "#000", profilePicture: null } }, status: 200, text: '{}' },
	getTeams: { json: { teams: [] }, status: 200, text: '{"teams":[]}' },
	getSpaces: { json: { spaces: [] }, status: 200, text: '{"spaces":[]}' },
	getSpace: { json: {}, status: 200, text: '{}' },
	getFolders: { json: { folders: [] }, status: 200, text: '{"folders":[]}' },
	getFolder: { json: {}, status: 200, text: '{}' },
	getLists: { json: { lists: [] }, status: 200, text: '{"lists":[]}' },
	getList: { json: {}, status: 200, text: '{}' },
	getTasks: { json: { tasks: [] }, status: 200, text: '{"tasks":[]}' },
	createTask: { json: { id: "1", name: "test", url: "url", list: {}, date_created: "now" }, status: 200, text: '{}' },
	updateTaskParent: { json: {}, status: 200, text: '{}' },
	updateTask: { json: {}, status: 200, text: '{}' },
	deleteTask: { json: {}, status: 200, text: '{}' },
} as const;

type EndpointName = keyof typeof endpointResponses;

const dummyMapping = { completedStatus: "done", activeStatus: "open", availableStatuses: ["done", "open"] };
const endpoints: { name: EndpointName; call: (api: any) => Promise<any> }[] = [
	{ name: "getAuthorizedUser", call: (api: any) => api.getAuthorizedUser() },
	{ name: "getTeams", call: (api: any) => api.getTeams() },
	{ name: "getSpaces", call: (api: any) => api.getSpaces("teamid") },
	{ name: "getSpace", call: (api: any) => api.getSpace("spaceid") },
	{ name: "getFolders", call: (api: any) => api.getFolders("spaceid") },
	{ name: "getFolder", call: (api: any) => api.getFolder("folderid") },
	{ name: "getLists", call: (api: any) => api.getLists("folderid") },
	{ name: "getList", call: (api: any) => api.getList(123) },
	{ name: "getTasks", call: (api: any) => api.getTasks(123) },
	{ name: "createTask", call: (api: any) => api.createTask(123, { name: "test" }) },
	{ name: "updateTaskParent", call: (api: any) => { api.setStatusMapping(dummyMapping); return api.updateTaskParent("taskid", "parentid"); } },
	{ name: "updateTask", call: (api: any) => { api.setStatusMapping(dummyMapping); return api.updateTask("taskid", { name: "test" }); } },
	{ name: "deleteTask", call: (api: any) => api.deleteTask("taskid") },
];

describe("ApiService endpoints", () => {
	endpoints.forEach(({ name, call }) => {
		test(`${name} forwards fetcher errors`, async () => {
			const mockFetcher = jest.fn().mockRejectedValue(new Error("fail"));
			ClickupApi.getInstance("FAKE_TOKEN", mockFetcher);
			const api = new ApiService("clickup", "FAKE_TOKEN");
			await expect(call(api)).rejects.toThrow();
		});

		test(`${name} works on success`, async () => {
			const mockFetcher = jest.fn().mockResolvedValue(endpointResponses[name]);
			ClickupApi.getInstance("FAKE_TOKEN", mockFetcher);
			const api = new ApiService("clickup", "FAKE_TOKEN");
			await expect(call(api)).resolves.not.toThrow();
		});
	});
});
test("All ApiService public methods are explicitly tested", () => {
	ClickupApi.getInstance("FAKE_TOKEN", jest.fn());
	const api = new ApiService("clickup", "FAKE_TOKEN");
	const proto = Object.getPrototypeOf(api);

	const expectedMethods = [
		"getTasks",
		"createTask",
		"getTeams",
		"getSpaces",
		"getSpace",
		"getFolders",
		"getFolder",
		"getLists",
		"getList",
		"updateTaskParent",
		"updateTask",
		"deleteTask",
		"getAuthorizedUser",
		"setStatusMapping",
		"getStatusMappingOrThrow",
		"updateToken",
	];

	const ignoreFromEndpoints = ["updateToken", "setStatusMapping", "getStatusMappingOrThrow"];

	const actualMethods = Object.getOwnPropertyNames(proto)
		.filter(name =>
			typeof (api as any)[name] === "function" &&
			name !== "constructor" &&
			!name.startsWith("_") &&
			!["showError", "getInstance"].includes(name)
		);

	const missing = expectedMethods.filter(m => !actualMethods.includes(m));
	const extra = actualMethods.filter(m => !expectedMethods.includes(m) && !ignoreFromEndpoints.includes(m));

	expect(missing).toEqual([]);
	expect(extra).toEqual([]);

	const testedEndpointNames = endpoints.map(e => e.name as string);
	const notInEndpoints = expectedMethods
		.filter(m => !ignoreFromEndpoints.includes(m))
		.filter(m => !testedEndpointNames.includes(m));

	expect(notInEndpoints).toEqual([]);
});
it('Test that completed status gets applied correclty', () => {
	const response = require('./getTasks-response.json');
	let tasks: Task[] = [];
	tasks = response.tasks.map(ClickupTaskToTask);
	expect(tasks[0]?.completed).toBe(false);
});


it('task cache simple task parse', () => {
	let input = '- [x] Task 1 [id:abc123]';
	let cache = TaskCache.fromMarkdown(input);

	cache.map.forEach(t => {
		expect(t.completed).toBe(true);
	})

	input = '- [ ] Task 1 [id:abc123]';
	cache = TaskCache.fromMarkdown(input);

	cache.map.forEach(t => {
		expect(t.completed).toBe(false);
	})
});

