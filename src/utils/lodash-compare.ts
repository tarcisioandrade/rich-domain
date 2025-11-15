import lodash from 'lodash';
import { isEqualWithoutCompareSpecifiedKeys } from '../core/domain/entity-keys-to-exclude-on-compare';
import { EntityCompareResult } from '../core/interface/types';

export function lodashCompare(a: any, b: any) {
  const result = {
    different: [],
    missing_from_first: [],
    missing_from_second: [],
  } as EntityCompareResult;

  //
  (lodash as any).reduce(
    a,
    (result: any, value: any, key: any) => {
      if (b?.hasOwnProperty(key)) {
        if (
          lodash.isEqualWith(value, b[key], isEqualWithoutCompareSpecifiedKeys)
        ) {
          return result;
        } else {
          if (typeof a[key] !== typeof {} || typeof b[key] !== typeof {}) {
            result.different.push(key);
            return result;
          } else {
            const deeper = lodashCompare(a[key], b[key]);
            result.different = result.different.concat(
              lodash.map(deeper.different, (sub_path) => {
                return `${key}.${sub_path}`;
              }),
            );

            result.missing_from_second = result.missing_from_second.concat(
              lodash.map(deeper.missing_from_second, (sub_path) => {
                return `${key}.${sub_path}`;
              }),
            );

            result.missing_from_first = result.missing_from_first.concat(
              lodash.map(deeper.missing_from_first, (sub_path) => {
                return `${key}.${sub_path}`;
              }),
            );
            return result;
          }
        }
      } else {
        result.missing_from_second.push(key);
        return result;
      }
    },
    result,
  );

  lodash.reduce(
    b,
    (result, _, key) => {
      if (a.hasOwnProperty(key)) {
        return result;
      } else {
        result.missing_from_first.push(key);
        return result;
      }
    },
    result,
  );

  return result;
}
