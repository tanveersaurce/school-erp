import { IReportColumnDefinition } from '@edusphere/types';

export class CsvGeneratorService {
  /**
   * Escape an individual cell according to RFC 4180 rules.
   */
  private escapeCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    let stringVal: string;
    if (value instanceof Date) {
      stringVal = value.toISOString();
    } else if (typeof value === 'object') {
      stringVal = JSON.stringify(value);
    } else {
      stringVal = String(value);
    }

    // Check if escaping is necessary: contains comma, quote, or newline
    const needsQuotes =
      stringVal.includes(',') ||
      stringVal.includes('"') ||
      stringVal.includes('\n') ||
      stringVal.includes('\r');

    if (needsQuotes) {
      // Escape existing double quotes with double double-quotes
      const escaped = stringVal.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return stringVal;
  }

  /**
   * Generates an RFC 4180-compliant CSV string from column definitions and record rows.
   */
  generateCsv(columns: IReportColumnDefinition[], data: Record<string, any>[]): string {
    const headerRow = columns.map((col) => this.escapeCell(col.header || col.id)).join(',');

    const dataRows = data.map((row) => {
      return columns
        .map((col) => {
          const colKey = col.id || col.key || '';
          const val = colKey ? row[colKey] : '';
          return this.escapeCell(val);
        })
        .join(',');
    });

    return [headerRow, ...dataRows].join('\r\n');
  }
}

export const csvGeneratorService = new CsvGeneratorService();
