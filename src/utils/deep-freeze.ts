export const deepFreeze = <T>(obj: T): Readonly<T> => {
  if (!obj || typeof obj !== 'object') return obj as any;

  for (const prop of Object.keys(obj)) {
    const value = obj[prop as keyof T] as any;

    if (typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value);
  }
  return Object.freeze(obj) as Readonly<T>;
};
