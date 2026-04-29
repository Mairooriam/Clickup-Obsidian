
// https://www.youtube.com/watch?v=AdmGHwvgaVs&t=72s
export async function catchError<T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> {
	return promise.then(data => {
		return [undefined, data] as [undefined, T]
	}).catch(error => {
		return [error];
	})
} 
