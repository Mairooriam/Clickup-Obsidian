import { Logger } from "./logger.js";

export type HexColor = string & { __brand: "HexColor" };

export const Colors = {
    default: "" as "",
    Red: "#ff0000" as HexColor,
    Green: "#00ff00" as HexColor,
    Blue: "#0000ff" as HexColor,
} as const;

const namedColors = ["red", "green", "blue", "orange", "purple", "yellow", "pink", "black", "white"] as const;
export type NamedColor = typeof namedColors[number];
export type Color = "" | HexColor | NamedColor;

export function toColor(value: string): HexColor | NamedColor | null {
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
        return value as HexColor;
    }
    if ((namedColors as readonly string[]).includes(value.toLowerCase())) {
        return value.toLowerCase() as NamedColor;
    }
    Logger.warn(`toColor: invalid color`, value);
    return null;
}
