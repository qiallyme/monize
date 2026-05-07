import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateRange } from './useDateRange';

describe('useDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 15)); // Jan 15, 2025
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns default date range', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '3m' }));
    expect(result.current.dateRange).toBe('3m');
    expect(result.current.isValid).toBe(true);
  });

  it('resolves 1w range', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '1w' }));
    expect(result.current.resolvedRange.start).toBe('2025-01-08');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 1w range with month alignment uses day-level dates', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: '1w', alignment: 'month' })
    );
    // Short ranges always use day-level precision (today as end)
    expect(result.current.resolvedRange.start).toBe('2025-01-08');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 1m range as 30 days ago', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '1m' }));
    expect(result.current.resolvedRange.start).toBe('2024-12-16');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 1m range with month alignment uses day-level dates', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: '1m', alignment: 'month' })
    );
    // 1m always uses day-level: 30 days ago, end = today
    expect(result.current.resolvedRange.start).toBe('2024-12-16');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 3m range as 90 days ago', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '3m' }));
    expect(result.current.resolvedRange.start).toBe('2024-10-17');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 3m range with month alignment uses day-level dates', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: '3m', alignment: 'month' })
    );
    // 3m always uses day-level: 90 days ago, end = today
    expect(result.current.resolvedRange.start).toBe('2024-10-17');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 1y range', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '1y' }));
    expect(result.current.resolvedRange.start).toBe('2024-01-15');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 1y range with month alignment uses day-level dates', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: '1y', alignment: 'month' })
    );
    // 1y uses day-level: exactly 1 year ago, end = today
    expect(result.current.resolvedRange.start).toBe('2024-01-15');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves ytd range', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: 'ytd' }));
    expect(result.current.resolvedRange.start).toBe('2025-01-01');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves ytd range with month alignment uses day-level dates', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: 'ytd', alignment: 'month' })
    );
    expect(result.current.resolvedRange.start).toBe('2025-01-01');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 2y range with month alignment snaps to month boundaries', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: '2y', alignment: 'month' })
    );
    // Long ranges still use month alignment
    expect(result.current.resolvedRange.start).toBe('2023-02-01');
    expect(result.current.resolvedRange.end).toBe('2025-01-31');
  });

  it('resolves all range with empty start', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: 'all' }));
    expect(result.current.resolvedRange.start).toBe('');
  });

  it('custom range uses user-set dates', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: 'custom' }));
    expect(result.current.isValid).toBe(false); // no dates set

    act(() => {
      result.current.setStartDate('2025-01-01');
      result.current.setEndDate('2025-01-31');
    });
    expect(result.current.isValid).toBe(true);
    expect(result.current.resolvedRange.start).toBe('2025-01-01');
    expect(result.current.resolvedRange.end).toBe('2025-01-31');
  });

  it('setDateRange changes the active range', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '3m' }));
    act(() => {
      result.current.setDateRange('6m');
    });
    expect(result.current.dateRange).toBe('6m');
  });

  it('resolves 5y range without month alignment', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '5y' }));
    // 5 years ago from Jan 15, 2025 = Jan 15, 2020
    expect(result.current.resolvedRange.start).toBe('2020-01-15');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 5y range with month alignment snaps to month boundaries', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: '5y', alignment: 'month' })
    );
    // 59 months ago from Jan 15, 2025 = start of Feb 2020
    expect(result.current.resolvedRange.start).toBe('2020-02-01');
    expect(result.current.resolvedRange.end).toBe('2025-01-31');
  });

  it('resolves 2y range without month alignment', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '2y' }));
    // 2 years ago from Jan 15, 2025 = Jan 15, 2023
    expect(result.current.resolvedRange.start).toBe('2023-01-15');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves unknown range using default (3m fallback)', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: 'unknown-range' }));
    // Default falls back to subMonths(now, 3) = Oct 15 2024 (not subDays)
    expect(result.current.resolvedRange.start).toBe('2024-10-15');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 6m range without month alignment', () => {
    const { result } = renderHook(() => useDateRange({ defaultRange: '6m' }));
    // 6 months before Jan 15, 2025 = Jul 15, 2024
    expect(result.current.resolvedRange.start).toBe('2024-07-15');
    expect(result.current.resolvedRange.end).toBe('2025-01-15');
  });

  it('resolves 6m range with month alignment snaps to month boundaries', () => {
    const { result } = renderHook(() =>
      useDateRange({ defaultRange: '6m', alignment: 'month' })
    );
    // Start of 5 months ago from Jan = Aug 1 2024, end = Jan 31, 2025
    expect(result.current.resolvedRange.start).toBe('2024-08-01');
    expect(result.current.resolvedRange.end).toBe('2025-01-31');
  });
});
