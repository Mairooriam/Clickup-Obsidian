import { Logger } from "./utils/logger.js";

type HexColor = string & { __brand: "HexColor" };

export const Colors = {
    default: "" as "",
    Red: "#ff0000" as HexColor,
    Green: "#00ff00" as HexColor,
    Blue: "#0000ff" as HexColor,
} as const;

export type Color = "" | HexColor;

export function toColor(value: string): HexColor | null {
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
        return value as HexColor;
    }
    Logger.warn(`toColor: invalid hex color`, value);
    return null;
}
