import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

// Precomputed dummy bcrypt hash (cost 12) for timing attack equalization when email is not found
const DUMMY_HASH = '$2a$12$e8wR80B7jX9Fm.fR0x8f7O86D491.5K8i3M6n/l0N9wZ3hC3E4R7u';

export interface PasswordPolicyResult {
  isValid: boolean;
  issues: string[];
}

export class PasswordService {
  /**
   * Hashes a plaintext password using bcrypt with cost factor 12.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Compares a plaintext password against a stored bcrypt hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Performs a dummy bcrypt comparison to ensure non-existent user queries
   * consume equivalent CPU time, mitigating user enumeration timing attacks.
   */
  async dummyCompare(): Promise<boolean> {
    try {
      await bcrypt.compare('dummy_timing_padding_password_123', DUMMY_HASH);
    } catch {
      // Ignored
    }
    return false;
  }

  /**
   * Validates a password against production enterprise complexity requirements:
   * - At least 8 characters
   * - At least one uppercase letter (A-Z)
   * - At least one lowercase letter (a-z)
   * - At least one number (0-9)
   * - At least one special character (!@#$%^&*(),.?":{}|<>)
   */
  validatePasswordPolicy(password: string): PasswordPolicyResult {
    const issues: string[] = [];

    if (!password || password.length < 8) {
      issues.push('Password must be at least 8 characters long.');
    }
    if (password.length > 128) {
      issues.push('Password cannot exceed 128 characters.');
    }
    if (!/[A-Z]/.test(password)) {
      issues.push('Password must contain at least one uppercase letter (A-Z).');
    }
    if (!/[a-z]/.test(password)) {
      issues.push('Password must contain at least one lowercase letter (a-z).');
    }
    if (!/[0-9]/.test(password)) {
      issues.push('Password must contain at least one number (0-9).');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      issues.push('Password must contain at least one special character.');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

export const passwordService = new PasswordService();
