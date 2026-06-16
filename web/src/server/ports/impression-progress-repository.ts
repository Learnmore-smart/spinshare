export interface ImpressionProgress {
  developerId: string;
  campaignId: string;
  accumulatedViewDurationMs: number;
  updatedAtMs: number;
}

export interface AddImpressionProgressInput {
  developerId: string;
  campaignId: string;
  viewDurationMs: number;
  nowMs: number;
}

export interface ImpressionProgressRepository {
  getByDeveloper(developerId: string): Promise<ImpressionProgress | null>;
  addDuration(input: AddImpressionProgressInput): Promise<ImpressionProgress>;
  clearDeveloper(developerId: string): Promise<void>;
}
