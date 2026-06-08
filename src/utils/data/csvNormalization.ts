export const normalizeCsvHeader = (header: string): string =>
  String(header ?? '')
    .trim()
    .toLowerCase();
