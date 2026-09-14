# Grading Scheme Engine & Evaluation Scales

## 1. Overview
The Grading System translates percentage scores and marks into standardized letter grades, grade points (GPA), and passing evaluations. Grading schemes are customizable per school and tenant, allowing CBSE, ICSE, IB, Cambridge, and custom regional scales.

## 2. Grading Scheme Schema (`GradingScheme`)
```typescript
export interface IGradeThreshold {
  grade: string;              // e.g. "A+", "A", "B", "F"
  minPercentage: number;      // e.g. 90
  maxPercentage: number;      // e.g. 100
  gradePoint?: number;        // e.g. 10.0
  description?: string;       // e.g. "Outstanding"
  isPassing: boolean;         // e.g. true (false for "F")
}

export interface IGradingScheme {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  isDefault: boolean;
  grades: IGradeThreshold[];
}
```

## 3. Boundary & Non-Overlapping Invariants
Before a grading scheme is saved, the grading engine validates:
1. **Range Bounds**: Every grade must satisfy $0 \le \text{minPercentage} \le \text{maxPercentage} \le 100$.
2. **Zero Overlap**: No two grade intervals can overlap (e.g. 70–85% and 80–100% is strictly rejected with `400 Bad Request`).
3. **Deterministic Lookup**: Any calculated percentage maps to exactly one grade tier.

## 4. Default 10-Point CBSE/Universal Scale
When no custom scheme is specified, the system defaults to:
- **A+** (90–100%): 10.0 GP &bull; Passing
- **A** (80–89.99%): 9.0 GP &bull; Passing
- **B+** (70–79.99%): 8.0 GP &bull; Passing
- **B** (60–69.99%): 7.0 GP &bull; Passing
- **C** (50–59.99%): 6.0 GP &bull; Passing
- **D** (33–49.99%): 4.0 GP &bull; Passing
- **F** (0–32.99%): 0.0 GP &bull; Failing
