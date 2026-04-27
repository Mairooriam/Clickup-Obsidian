import { join } from "path";
import { ApiService } from "../ApiService";
import * as fs from "fs";
import { TaskCache, tasksResolveParents } from "../core";

const mockResponse = JSON.parse(
	fs.readFileSync(join(__dirname, "getTasks-response.json"), "utf-8")
);

function mockFetcher<T>(url: string, options?: any) {
	return Promise.resolve({
		json: mockResponse,
		status: 200,
		text: JSON.stringify(mockResponse),
	});
}

test("ApiService.getTasks => taskCache", async () => {
	const api = ApiService.getInstance("FAKE_TOKEN", mockFetcher);
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
