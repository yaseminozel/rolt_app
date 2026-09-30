/**
 * The account-only action a guest tried before signing in (e.g. saving a route).
 * CLAUDE.md: "Guest için giriş gerekiyorsa seçilen rota korunur ve işlem girişten sonra tamamlanır."
 * `useRequireAccount` stores it; the root navigator replays it once the user can use the app
 * with a real session (after registration and permission screens for new accounts).
 * Kept in memory: an app restart in between drops it, which is acceptable for a bookmark.
 */
let pendingAction: (() => void) | null = null;

export function setPendingAccountAction(action: () => void) {
  pendingAction = action;
}

export function clearPendingAccountAction() {
  pendingAction = null;
}

/** Returns and clears the stored action. */
export function takePendingAccountAction() {
  const action = pendingAction;
  pendingAction = null;
  return action;
}
