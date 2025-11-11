/**
 * Formats a tool call response into a standardized structure
 * @param obj The object to format
 * @param isError Whether this is an error response
 * @returns Formatted response object
 */
export const formatToolCall = (obj: any, isError: boolean = false) => {
  const text = obj === undefined ? "undefined" : JSON.stringify(obj, null, 2);
  return {
    content: [{ type: "text", text, isError }],
  };
};
