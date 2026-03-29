export class SecurityController {
  constructor(maxAttempts = 5, lockoutMinutes = 15) {
    this.maxAttempts = maxAttempts;
    this.lockoutMS = lockoutMinutes * 60 * 1000;
    this.pinLength = 6; // ✨ Upgraded to 6 digits
  }

  // Check if the user is currently banned from trying
  getLockoutStatus() {
    const lockoutUntil = localStorage.getItem('security_lockout_until');
    if (!lockoutUntil) return { isLocked: false };

    const remaining = parseInt(lockoutUntil) - Date.now();
    if (remaining > 0) {
      return { isLocked: true, remaining: Math.ceil(remaining / 1000 / 60) };
    }

    // Lockout expired
    this.resetAttempts();
    return { isLocked: false };
  }

  recordFailedAttempt() {
    const attempts = parseInt(localStorage.getItem('security_attempts') || '0') + 1;
    localStorage.setItem('security_attempts', attempts.toString());

    if (attempts >= this.maxAttempts) {
      const until = Date.now() + this.lockoutMS;
      localStorage.setItem('security_lockout_until', until.toString());
      return true; // Now locked out
    }
    return false;
  }

  resetAttempts() {
    localStorage.removeItem('security_attempts');
    localStorage.removeItem('security_lockout_until');
  }

  verify(input, actual) {
    // Advanced: In a real prod env, 'actual' would be a hash, not plain text
    return input === actual;
  }
}