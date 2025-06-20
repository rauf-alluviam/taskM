/**
 * Debounce function to prevent rapid successive function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function to limit function calls to at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Creates a function that prevents rapid successive calls to the same API endpoint
 */
export function createApiCallLimiter() {
  const callTimes = new Map<string, number>();
  const MIN_INTERVAL = 1000; // Minimum 1 second between calls to same endpoint
  
  return function shouldAllowCall(endpoint: string): boolean {
    const now = Date.now();
    const lastCall = callTimes.get(endpoint);
    
    if (!lastCall || now - lastCall >= MIN_INTERVAL) {
      callTimes.set(endpoint, now);
      return true;
    }
    
    console.warn(`API call to ${endpoint} blocked - too frequent (last call ${now - lastCall}ms ago)`);
    return false;
  };
}
