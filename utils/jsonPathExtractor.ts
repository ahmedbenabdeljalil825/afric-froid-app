/**
 * JSON Path Extractor Utility
 * 
 * Extracts values from nested JSON objects using dot notation and array indexing.
 * 
 * Examples:
 *   extractValue({ data: { temp: 25 } }, "data.temp") => 25
 *   extractValue({ sensors: [{ value: 42 }] }, "sensors[0].value") => 42
 *   extractValue({ a: { b: { c: "deep" } } }, "a.b.c") => "deep"
 */

export function extractValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    try {
        // Split path into segments, handling both dot notation and bracket notation
        const segments = path
            .replace(/\[(\d+)\]/g, '.$1') // Convert array[0] to array.0
            .split('.')
            .filter(segment => segment !== '');

        let current = obj;

        for (const segment of segments) {
            if (current === null || current === undefined) {
                return undefined;
            }

            // Handle array index
            const index = parseInt(segment, 10);
            if (!isNaN(index) && Array.isArray(current)) {
                current = current[index];
            } else {
                current = current[segment];
            }
        }

        return current;
    } catch (error) {
        console.error('Error extracting value from JSON path:', error);
        return undefined;
    }
}

/**
 * Validates if a JSON path is potentially valid
 * (Basic validation - doesn't check if path exists in actual data)
 */
export function isValidJsonPath(path: string): boolean {
    if (!path || typeof path !== 'string') return false;

    // Check for valid characters and structure
    const validPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\d+\])*$/;
    return validPattern.test(path);
}

/**
 * Creates a nested object with a value at the specified path
 * Useful for creating MQTT payloads for controlling widgets
 * 
 * Example:
 *   setValue("command.power", true) => { command: { power: true } }
 */
export function setValue(path: string, value: any): any {
    if (!path) return value;

    const segments = path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .filter(segment => segment !== '');

    const result: any = {};
    let current = result;

    for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        const nextSegment = segments[i + 1];
        const nextIsArray = !isNaN(parseInt(nextSegment, 10));

        current[segment] = nextIsArray ? [] : {};
        current = current[segment];
    }

    const lastSegment = segments[segments.length - 1];
    current[lastSegment] = value;

    return result;
}
