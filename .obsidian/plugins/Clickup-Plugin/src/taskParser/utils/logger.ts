export namespace Logger {
    export function log(message: string, ...args: unknown[]): void {
        const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
        console.log(`[LOG] ${message}`, ...args, `\n  called from: ${stack}`);
    }

    export function warn(message: string, ...args: unknown[]): void {
        const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
        console.warn(`[WARN] ${message}`, ...args, `\n  called from: ${stack}`);
    }

    export function error(message: string, ...args: unknown[]): void {
        const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
        console.error(`[ERROR] ${message}`, ...args, `\n  called from: ${stack}`);
    }
}
