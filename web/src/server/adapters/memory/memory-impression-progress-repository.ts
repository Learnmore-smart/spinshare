import type {
  AddImpressionProgressInput,
  ImpressionProgress,
  ImpressionProgressRepository,
} from "../../ports/impression-progress-repository";

export class MemoryImpressionProgressRepository
  implements ImpressionProgressRepository
{
  private readonly progress = new Map<string, ImpressionProgress>();

  async getByDeveloper(
    developerId: string,
  ): Promise<ImpressionProgress | null> {
    const record = this.progress.get(developerId);
    return record ? { ...record } : null;
  }

  async addDuration(
    input: AddImpressionProgressInput,
  ): Promise<ImpressionProgress> {
    const existing = this.progress.get(input.developerId);
    const accumulatedViewDurationMs =
      existing && existing.campaignId === input.campaignId
        ? existing.accumulatedViewDurationMs + input.viewDurationMs
        : input.viewDurationMs;
    const record: ImpressionProgress = {
      developerId: input.developerId,
      campaignId: input.campaignId,
      accumulatedViewDurationMs,
      updatedAtMs: input.nowMs,
    };
    this.progress.set(input.developerId, record);
    return { ...record };
  }

  async clearDeveloper(developerId: string): Promise<void> {
    this.progress.delete(developerId);
  }
}
