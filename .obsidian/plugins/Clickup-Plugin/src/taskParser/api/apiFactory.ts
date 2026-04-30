// apiFactory.ts
import { ClickupApi } from "./clickup/ClickupApi";
import { IApi } from "./IApi";

export type SupportedApiType = "clickup";

export function createApi(type: SupportedApiType, token: string): IApi {
	if (type === "clickup") return ClickupApi.getInstance(token);
	throw new Error("Unknown API type");
}
