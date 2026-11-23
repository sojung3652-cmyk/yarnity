// 고치기 (Kim: 그냥 3D창만): a saved work opened straight into the 3D work screen, the book never seen - it opens
// hidden underneath (the class keeps it out of sight) and goes away again if the 3D is closed without finishing.
import { store } from "@/lib/store";

export function startEdit3d() {
  store.set("iyarn.edit3d", 1);
  try { document.documentElement.classList.add("y-edit3d"); } catch { /* */ }
}
export function endEdit3d() {
  try { document.documentElement.classList.remove("y-edit3d"); } catch { /* */ }
}
