let counter = 0;

//TODO: imrpove just placeholder quikc.
export function generateId(prefix: string = "id"): string {
	return `${prefix}_${counter++}`;
}

export function resetIdCounter(): void {
	counter = 0;
}
