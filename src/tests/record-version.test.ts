import { expect, it } from "vitest";
import { assertRecordVersion, RecordConflictError } from "@/lib/record-version";
it("allows the same snapshot", () => expect(() => assertRecordVersion("v1", "v1")).not.toThrow());
it("blocks missing or stale snapshots", () => {
  for (const expected of ["", "v0"]) expect(() => assertRecordVersion("v1", expected)).toThrow(RecordConflictError);
});
