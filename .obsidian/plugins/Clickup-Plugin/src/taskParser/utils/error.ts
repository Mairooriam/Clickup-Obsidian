// https://www.youtube.com/watch?v=AdmGHwvgaVs&t=72s
export async function catchError<T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> {
	return promise.then(data => {
		return [undefined, data] as [undefined, T]
	}).catch((error: Error) => {
		return [error];
	})
}

export class AuthError extends Error {
	readonly code = "AUTH_REQUIRED";
	readonly status: number;
	constructor(status: number = 401, cause?: Error) {
		super("401: Authentication failed. Check your API token.", { cause });
		this.name = "AuthError";
		this.status = status;
	}
}
