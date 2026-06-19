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
    const sameCampaign = existing && existing.campaignId === input.campaignId;
    const accumulatedViewDurationMs = sameCampaign
      ? existing.accumulatedViewDurationMs + input.viewDurationMs
      : input.viewDurationMs;
    // Preserve the immutable serve time on accumulating segments; reset it when a
    // new campaign is served. Only `/api/ad` passes `servedAtMs`; plain track
    // segments leave it untouched (and undefined on a fresh record).
    const servedAtMs = sameCampaign ? existing.servedAtMs : input.servedAtMs;
    const record: ImpressionProgress = {
      developerId: input.developerId,
      campaignId: input.campaignId,
      accumulatedViewDurationMs,
      updatedAtMs: input.nowMs,
      ...(servedAtMs !== undefined ? { servedAtMs } : {}),
    };
    this.progress.set(input.developerId, record);
    return { ...record };
  }

  async clearDeveloper(developerId: string): Promise<void> {
    this.progress.delete(developerId);
  }
}
