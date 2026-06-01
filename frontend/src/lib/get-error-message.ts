export function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { message?: string } } }).response
      ?.data?.message === 'string'
  ) {
    return (err as { response: { data: { message: string } } }).response.data
      .message;
  }
  return fallback;
}
