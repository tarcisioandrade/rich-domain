export const keysToExcludeOnCompare = [
  'metaHistory',
  'createdAt',
  'updatedAt',
  '_createdAt',
  '_updatedAt',
  'rulesIsLocked',
];

export function isEqualWithoutCompareSpecifiedKeys(
  _: any,
  __: any,
  key: string | symbol | number | undefined,
) {
  if (keysToExcludeOnCompare.includes(key as string)) {
    return true;
  }

  if (key?.toString().includes('metaHistory')) {
    return true;
  }
}
