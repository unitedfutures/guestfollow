import type { SurveyConfig } from '@/app/survey/[qr_slug]/survey-form'

// アンケート設問の既定値。施設に保存が無い項目はこちらを使う。
export const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  standard: {
    overall: true, cleanliness: true, facilities: true,
    location: true, revisit: true, comment: true, highlights: true,
  },
  custom: [],
}

/** 施設に保存された設定を既定値に重ねる */
export function mergeSurveyConfig(saved: unknown): SurveyConfig {
  const cfg = (saved ?? {}) as Partial<SurveyConfig>
  return {
    ...DEFAULT_SURVEY_CONFIG,
    ...cfg,
    standard: { ...DEFAULT_SURVEY_CONFIG.standard, ...(cfg.standard ?? {}) },
    custom: cfg.custom ?? [],
  }
}
