import { IGradeThreshold } from '@edusphere/types';
import { BadRequestError } from '@edusphere/common';

export class GradingService {
  /**
   * Validates that grade thresholds do not have overlapping percentage ranges
   * and that percentages fall between 0 and 100.
   */
  public static validateGradingScheme(grades: IGradeThreshold[]): void {
    if (!grades || grades.length === 0) {
      throw new BadRequestError('Grading scheme must contain at least one grade tier.');
    }

    for (const g of grades) {
      if (g.minPercentage < 0 || g.maxPercentage > 100 || g.minPercentage > g.maxPercentage) {
        throw new BadRequestError(
          `Invalid grade range for grade '${g.grade}': ${g.minPercentage}% - ${g.maxPercentage}%. Min must be >= 0, Max <= 100, and Min <= Max.`
        );
      }
    }

    // Sort by minPercentage ascending to verify overlap
    const sorted = [...grades].sort((a, b) => a.minPercentage - b.minPercentage);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // If next minPercentage is less than current maxPercentage, there's an illegal overlap
      if (next.minPercentage < current.maxPercentage) {
        throw new BadRequestError(
          `Grading scheme has overlapping ranges: Grade '${current.grade}' (${current.minPercentage}-${current.maxPercentage}%) overlaps with Grade '${next.grade}' (${next.minPercentage}-${next.maxPercentage}%).`
        );
      }
    }
  }

  /**
   * Resolves percentage to appropriate grade and grade point from scheme thresholds.
   */
  public static resolveGrade(
    percentage: number,
    grades: IGradeThreshold[]
  ): { grade: string; gradePoint?: number; isPassing: boolean } {
    if (!grades || grades.length === 0) {
      // Default fallback if no scheme assigned
      const isPassing = percentage >= 33;
      return {
        grade: percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : percentage >= 33 ? 'E' : 'F',
        gradePoint: Math.max(0, Math.min(10, Math.round(percentage / 10))),
        isPassing,
      };
    }

    // Match grade threshold where minPercentage <= percentage <= maxPercentage
    // In case of exact boundary, pick the tier matching
    for (const g of grades) {
      if (percentage >= g.minPercentage && percentage <= g.maxPercentage) {
        return {
          grade: g.grade,
          gradePoint: g.gradePoint,
          isPassing: g.isPassing,
        };
      }
    }

    // Fallback: If below lowest minPercentage, assign lowest grade or F
    const sorted = [...grades].sort((a, b) => a.minPercentage - b.minPercentage);
    if (percentage < sorted[0].minPercentage) {
      return {
        grade: sorted[0].grade,
        gradePoint: sorted[0].gradePoint,
        isPassing: sorted[0].isPassing,
      };
    }

    // If above highest maxPercentage, assign highest grade
    const highest = sorted[sorted.length - 1];
    return {
      grade: highest.grade,
      gradePoint: highest.gradePoint,
      isPassing: highest.isPassing,
    };
  }

  /**
   * Calculates subject percentage and grade based on obtained marks and max marks.
   */
  public static calculateSubjectScore(
    marksObtained: number | null | undefined,
    maxMarks: number,
    passMarks: number,
    status: string,
    grades: IGradeThreshold[] = []
  ): {
    percentage: number;
    grade: string;
    gradePoint?: number;
    isPassed: boolean;
  } {
    if (status === 'ABSENT') {
      return {
        percentage: 0,
        grade: 'AB',
        gradePoint: 0,
        isPassed: false,
      };
    }

    if (status === 'EXEMPT') {
      return {
        percentage: 100,
        grade: 'EX',
        gradePoint: undefined,
        isPassed: true,
      };
    }

    const marks = marksObtained ?? 0;
    const percentage = maxMarks > 0 ? Math.round(((marks / maxMarks) * 100) * 100) / 100 : 0;
    const gradeInfo = this.resolveGrade(percentage, grades);
    const isPassed = marks >= passMarks && gradeInfo.isPassing;

    return {
      percentage,
      grade: gradeInfo.grade,
      gradePoint: gradeInfo.gradePoint,
      isPassed,
    };
  }
}
