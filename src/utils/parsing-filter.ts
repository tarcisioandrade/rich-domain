export function parseQueryWithDots(field: string, verb: string, value: any) {
  const fieldMap = field.split('.');
  const m = {};
  fieldMap.reduce((acc, curr, index) => {
    if (index === fieldMap.length - 1) {
      acc[curr] = { [verb]: value };
    } else {
      acc[curr] = {};
    }

    return acc[curr];
  }, m as any);
  return m;
}
