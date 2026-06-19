export interface ImpressionProgress {
  developerId: string;
  campaignId: string;
  accumulatedViewDurationMs: number;
  updatedAtMs: number;
  /**
   * Server-stamped epoch millis when `/api/ad` first served this campaign to the
   * developer. Immutable for the life of one served impression: preserved across
   * accumulating track segments and only reset when a different campaign is
   * served. The settlement path derives a trusted `serverDwellMs = now -
   * servedAtMs` from it so the client-reported `viewDurationMs` can never alone
   * satisfy the 3-second viewability rule. Optional for backward compatibility
   * with records created before this field existed (those fall back to the
   * client-only gate).
   */
  servedAtMs?: number;
}

export interface AddImpressionProgressInput {
  developerId: string;
  campaignId: string;
  viewDurationMs: number;
  nowMs: number;
  /**
   * When set (by `/api/ad` on serve), stamps the immutable serve time on a newly
   * created or campaign-switched progress record. Omitted by `/api/track`
   * segments, which must preserve the existing serve time.
   */
  servedAtMs?: number;
}

export interface ImpressionProgressRepository {
  getByDeveloper(developerId: string): Promise<ImpressionProgress | null>;
  addDuration(input: AddImpressionProgressInput): Promise<ImpressionProgress>;
  clearDeveloper(developerId: string): Promise<void>;
}
