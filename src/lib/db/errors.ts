export function isDatabaseUnavailableError(message: string) {
  return /DATABASE_URL|Environment variable not found|Can't reach database|database server|P1001|ECONNREFUSED|ENOTFOUND|connection refused|timed out/i.test(
    message,
  );
}
