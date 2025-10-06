import { describe, it, expect, vi } from 'vitest';
import { retry } from '../../src/utils/retry';

describe('retry', () => {
  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await retry(operation, { maxAttempts: 3 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await retry(operation, {
      maxAttempts: 3,
      initialDelayMs: 10
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retry(operation, {
      maxAttempts: 2,
      initialDelayMs: 10
    })).rejects.toThrow('Operation failed after 2 attempts');

    expect(operation).toHaveBeenCalledTimes(2);
  });
});
