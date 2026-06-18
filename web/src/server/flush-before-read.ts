import type { Container } from "./container";
import { runFlushCycle } from "./flush-service";

export async function flushPendingForRead(
  container: Pick<Container, "counters" | "ledger" | "users" | "campaigns">,
  context = "account-read",
): Promise<void> {
  try {
    const result = await runFlushCycle({
      counters: container.counters,
      ledger: container.ledger,
      users: container.users,
      campaigns: container.campaigns,
    });

    if (!result.flushed && result.error !== undefined) {
      console.warn(
        `[flush-before-read] pending flush failed for ${context}:`,
        result.error,
      );
    }
  } catch (error) {
    console.warn(
      `[flush-before-read] pending flush failed for ${context}:`,
      error,
    );
  }
}
