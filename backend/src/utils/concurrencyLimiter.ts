/**
 * Limite le nombre de tâches coûteuses exécutées en même temps (ex. pages Chromium).
 * Au-delà de `maxQueued` tâches en attente, `run` rejette immédiatement avec `ConcurrencyLimitError`
 * pour que l'appelant bascule sur une voie moins coûteuse au lieu d'empiler les requêtes.
 */
export class ConcurrencyLimitError extends Error {
  constructor() {
    super('Trop de tâches en cours, réessayez plus tard.');
    this.name = 'ConcurrencyLimitError';
  }
}

export function createConcurrencyLimiter(maxConcurrent: number, maxQueued: number) {
  let running = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    running -= 1;
    const next = waiting.shift();
    if (next) {
      running += 1;
      next();
    }
  };

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (running >= maxConcurrent) {
        if (waiting.length >= maxQueued) throw new ConcurrencyLimitError();
        await new Promise<void>((resolve) => waiting.push(resolve));
      } else {
        running += 1;
      }
      try {
        return await task();
      } finally {
        release();
      }
    },
    stats() {
      return { running, queued: waiting.length };
    },
  };
}
