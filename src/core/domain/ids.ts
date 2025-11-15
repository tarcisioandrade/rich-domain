import { randomUUID } from 'node:crypto';
import ShortUUID from 'short-uuid';
import { IdImplementation } from '../interface/types';

/**
 * @description Identity to Entity and Aggregates
 * @method create
 * @param value as string
 */
const short = ShortUUID();
export class Id implements IdImplementation {
  private _value: string;
  private _isNew: boolean;

  constructor(id?: string, isNew?: boolean) {
    if (typeof id === 'undefined') {
      const uuid = randomUUID();
      this._value = short.fromUUID(uuid);
      this._isNew = true;
    } else {
      const isString = typeof id === 'string';
      this._value = isString ? id : String(id);
      this._isNew = false;
    }

    if (typeof isNew === 'boolean') {
      this._isNew = isNew;
    }
  }

  public static generate(): Id {
    return new Id();
  }

  public setAsNew(): void {
    this._isNew = true;
  }

  public setAsOld(): void {
    this._isNew = false;
  }

  get value(): string {
    return this._value;
  }
  get longValue(): string {
    return short.toUUID(this._value);
  }

  isNew(): boolean {
    return this._isNew;
  }

  isEqual(id: Id): boolean {
    return this.value === id.value;
  }

  cloneAsNew(): Id {
    const newUUID = new Id(this._value);
    newUUID.setAsNew();
    return newUUID;
  }

  clone(): Id {
    return new Id(this._value) as unknown as Id;
  }
}
