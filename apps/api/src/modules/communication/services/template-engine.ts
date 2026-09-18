export class TemplateEngine {
  /**
   * Escape potentially malicious HTML characters to prevent XSS/injection
   */
  public static sanitize(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  /**
   * Render a template string replacing {{variableName}} with values from variables dictionary
   */
  public static render(template: string, variables: Record<string, any> = {}): string {
    if (!template) return '';

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
      const value = variables[varName];
      if (value === undefined || value === null) {
        return '';
      }
      return String(value);
    });
  }

  /**
   * Extract all variable names used in a template
   */
  public static extractVariables(template: string): string[] {
    if (!template) return [];
    const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    const set = new Set<string>();
    for (const match of matches) {
      if (match[1]) set.add(match[1]);
    }
    return Array.from(set);
  }

  /**
   * Validate that all declared required variables are present
   */
  public static validateVariables(
    requiredVariables: string[],
    providedVariables: Record<string, any>
  ): { isValid: boolean; missingVariables: string[] } {
    const missingVariables: string[] = [];
    for (const reqVar of requiredVariables) {
      if (
        providedVariables[reqVar] === undefined ||
        providedVariables[reqVar] === null ||
        providedVariables[reqVar] === ''
      ) {
        missingVariables.push(reqVar);
      }
    }
    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }
}
