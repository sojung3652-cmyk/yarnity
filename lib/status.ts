// Status of a saved work. Older saves have none: 100% progress = 완성, otherwise 뜨는 중.
import { plan } from "./pattern";
import type { Project } from "./types";

export type Status = "knitting" | "paused" | "done";
export const STATUS_KO: Record<Status, string> = { knitting: "뜨는 중", paused: "중단", done: "완성" };

export function statusOf(p: Project): Status {
  if (p.status) return p.status;
  return (p.current || 0) >= plan(p).rows.length ? "done" : "knitting";
}
/** fill in status / updatedAt for older saves */
export const withStatus = (p: Project): Project => ({ ...p, status: statusOf(p), updatedAt: p.updatedAt ?? p.created });
