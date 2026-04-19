function snapshotArgs(args: unknown[]): string {
    return args.map(arg => {
        try {
            return typeof arg === "string"
                ? arg
                : JSON.stringify(arg, getCircularReplacer(), 2);
        } catch {
            return "[Unserializable object]";
        }
    }).join(" ");
}

function getCircularReplacer() {
    const seen = new WeakSet();
    return function (_key: string, value: unknown) {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value as object)) return "[Circular]";
            seen.add(value as object);
        }
        return value;
    };
}

export namespace Logger {
    export function log(message: string, ...args: unknown[]): void {
        const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
        console.log(`[LOG] ${message} ${snapshotArgs(args)}\n  called from: ${stack}`);
    }

    export function warn(message: string, ...args: unknown[]): void {
        const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
        console.warn(`[WARN] ${message} ${snapshotArgs(args)}\n  called from: ${stack}`);
    }

    export function error(message: string, ...args: unknown[]): void {
        const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
        console.error(`[ERROR] ${message} ${snapshotArgs(args)}\n  called from: ${stack}`);
    }
}
