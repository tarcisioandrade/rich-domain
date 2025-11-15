export class ConverterAnyBase {
  public srcAlphabet: string | string[];
  public dstAlphabet: string | string[];

  constructor(srcAlphabet: string | string[], dstAlphabet: string | string[]) {
    if (
      !srcAlphabet ||
      !dstAlphabet ||
      !srcAlphabet.length ||
      !dstAlphabet.length
    ) {
      throw new Error('Bad alphabet');
    }
    this.srcAlphabet = srcAlphabet;
    this.dstAlphabet = dstAlphabet;
  }

  isValid(number: any) {
    let i = 0;
    for (; i < number.length; ++i) {
      if (this.srcAlphabet.indexOf(number[i]) === -1) {
        return false;
      }
    }
    return true;
  }
  convert(number: any) {
    let i: number,
      divide: number,
      newlen: number,
      numberMap: any = {},
      fromBase = this.srcAlphabet.length,
      toBase = this.dstAlphabet.length,
      length = number.length,
      result = typeof number === 'string' ? '' : [];

    if (!this.isValid(number)) {
      throw new Error(
        `Number "${number}" contains of non-alphabetic digits (${this.srcAlphabet})`,
      );
    }

    if (this.srcAlphabet === this.dstAlphabet) {
      return number;
    }

    for (i = 0; i < length; i++) {
      numberMap[i] = this.srcAlphabet.indexOf(number[i]);
    }
    do {
      divide = 0;
      newlen = 0;
      for (i = 0; i < length; i++) {
        divide = divide * fromBase + numberMap[i];
        if (divide >= toBase) {
          numberMap[newlen++] = Number.parseInt((divide / toBase) as any, 10);
          divide = divide % toBase;
        } else if (newlen > 0) {
          numberMap[newlen++] = 0;
        }
      }
      length = newlen;
      result = this.dstAlphabet
        .slice(divide, divide + 1)
        .concat(result as any) as any;
    } while (newlen !== 0);

    return result;
  }
}
