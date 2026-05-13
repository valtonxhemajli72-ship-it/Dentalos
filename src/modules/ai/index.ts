export type AiReviewPolicy = "human_review_required" | "disabled";

export const defaultAiReviewPolicy: AiReviewPolicy = "human_review_required";

export type AiSuggestion = {
  tenantId: string;
  promptKey: string;
  outputPreview: string;
  reviewPolicy: AiReviewPolicy;
};
