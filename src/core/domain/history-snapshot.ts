import { EntityProps, ISnapshot, SnapshotTrace } from '../interface/types';

export class Snapshot<T extends EntityProps> implements ISnapshot<T> {
  public readonly props: T;
  public trace: SnapshotTrace;
  public fromDeepWatch = false;
  public deepWatchPath: string | null = null;

  constructor(input: {
    props: T;
    trace: SnapshotTrace;
  }) {
    this.props = input.props;
    this.trace = input.trace;
  }

  hasChange(key: string): boolean {
    return this.trace.update.split('.').includes(key as string);
  }

  get timestamp(): Date {
    return this.trace.updatedAt;
  }
}
