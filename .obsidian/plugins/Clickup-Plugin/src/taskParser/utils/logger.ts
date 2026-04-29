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

export type LoggerKey =
	| "taskParser.index"
	| "parser"
	| "api"
	| "cache"
	| "diff"
	| "ui"
	| "settings"
	| "tasks"
	| "lexer"
	| "default"
	| "core"
	| "colors";

type LogLevel = "none" | "error" | "warn" | "log";

type LoggerConfig = {
	[K in LoggerKey]?: LogLevel;
};

const defaultLevel: LogLevel = "log";

const logLevels: Record<LogLevel, number> = {
	none: 0,
	error: 1,
	warn: 2,
	log: 3,
};

let config: LoggerConfig = {};

//TODO: make logger differnelty since formatting bad for this logger.
export namespace Logger {
	/**
	 * Set the logging level for a specific key.
	 * Example: Logger.setLevel("api", "warn");
	 */
	export function setLevel(key: LoggerKey, level: LogLevel) {
		config[key] = level;
	}

	/**
	 * Set multiple logging levels at once.
	 */
	export function setLevels(newConfig: LoggerConfig) {
		config = { ...config, ...newConfig };
	}

	function shouldLog(key: LoggerKey, level: LogLevel): boolean {
		const keyLevel = config[key] ?? defaultLevel;
		return logLevels[level] <= logLevels[keyLevel];
	}

	export function log(key: LoggerKey, message: string, ...args: unknown[]): void {
		if (!shouldLog(key, "log")) return;
		const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
		console.log(`[${key.toUpperCase()}][LOG] ${message} ${snapshotArgs(args)}\n  called from: ${stack}`);
	}

	export function warn(key: LoggerKey, message: string, ...args: unknown[]): void {
		if (!shouldLog(key, "warn")) return;
		const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
		console.warn(`[${key.toUpperCase()}][WARN] ${message} ${snapshotArgs(args)}\n  called from: ${stack}`);
	}

	export function error(key: LoggerKey, message: string, ...args: unknown[]): void {
		if (!shouldLog(key, "error")) return;
		const stack = new Error().stack?.split("\n")[2]?.trim() ?? "unknown";
		console.error(`[${key.toUpperCase()}][ERROR] ${message} ${snapshotArgs(args)}\n  called from: ${stack}`);
	}
}
