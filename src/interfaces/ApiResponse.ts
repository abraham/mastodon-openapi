interface ApiResponse {
  statusCode: string;
  description?: string;
  example?: string; // Raw JSON string
  parsedExample?: any; // Parsed JSON object
}

export { ApiResponse };
