export class RecordConflictError extends Error {
  constructor() { super("This profile changed after you opened it. Your edits have not been saved. Keep a copy of your changes, reload the latest record, and review before saving again."); }
}
export function assertRecordVersion(current: string, expected: string) {
  if (!expected || current !== expected) throw new RecordConflictError();
}
