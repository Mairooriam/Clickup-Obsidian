export class Stack<T> {
	private stack: T[] = []

	top(): T | undefined {
		return this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
	}

	size(): number {
		return this.stack.length;
	}

	pop(): T | undefined {
		return this.stack.pop();
	}

	push(item: T): void {
		this.stack.push(item);
	}

	empty(): boolean {
		return this.stack.length === 0;
	}

	clear(): void {
		this.stack = [];
	}
}
