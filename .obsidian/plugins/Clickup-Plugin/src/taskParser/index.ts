
import { ApiService } from "./api/ApiService.js";
import { Colors } from "./utils/colors.js";
import { getRemote, getColoredDiffMarkdown, setAllTasksColor, processDiffToPost, tokenizeAndLog, isTask, parseTask } from "./core.js";
import { TaskCache } from "./taskCache.js";


export { ApiService } from "./api/ApiService.js";

/*
 *	Contains Api types such as Task, spaces, etc.
 * */
export * from "./api/types.js";

/*
 * Contains custom errors to use in the application
 * */
export * as Errors from "./utils/error.js";


/**
 * Clickup uses userdefined statuses. user needs to map status in order to work with 
 * taskParser
 * Populate `availableStatuses` by fetching statuses from the API at runtime,
 * then let the user pick which status corresponds to each state.
 */
export type { StatusMapping } from "./api/types.js";

/*
 * Main interface 
 * */
export const TaskParser = {
	parseTask,
	isTask,
	getRemote,
	getColoredDiffMarkdown,
	setAllTasksColor,
	processDiffToPost,
	ApiService,
	TaskCache,
	Colors,
};

export const TaskParserDev = {
	tokenizeAndLog
}
