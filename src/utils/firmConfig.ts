/**
 * Funding Firm Configuration
 * 
 * Strategy-pattern configuration for firm-specific profit thresholds.
 * To add a new firm, simply add an entry to FUNDING_FIRMS.
 */

export type FundingFirmId = 'topstep' | 'apex' | 'alpha_futures';

export interface FirmConfig {
  id: FundingFirmId;
  label: string;
  /** Minimum net profit ($) for a day to count as a "Profit Day" */
  minProfitThreshold: number;
}

export const FUNDING_FIRMS: Record<FundingFirmId, FirmConfig> = {
  topstep: {
    id: 'topstep',
    label: 'Topstep',
    minProfitThreshold: 150,
  },
  apex: {
    id: 'apex',
    label: 'Apex Trader Funding',
    minProfitThreshold: 50,
  },
  alpha_futures: {
    id: 'alpha_futures',
    label: 'Alpha Futures',
    minProfitThreshold: 200,
  },
};

/** Ordered list for dropdowns */
export const FUNDING_FIRM_LIST: FirmConfig[] = Object.values(FUNDING_FIRMS);

/** Default threshold for Personal accounts or accounts without a recognized firm */
export const DEFAULT_PROFIT_THRESHOLD = 0;

/**
 * Returns the minimum profit threshold for a given firm and account type.
 * - Evaluation accounts always return the default (consistency rule is disabled for them).
 * - Live accounts use the firm-specific threshold.
 * - Personal accounts use the default (> $0).
 */
export function getProfitThreshold(
  firmId: FundingFirmId | string | null | undefined,
  accountType: string
): number {
  // Evaluation accounts: consistency rule not enforced
  if (accountType === 'evaluation') return DEFAULT_PROFIT_THRESHOLD;

  // Live accounts with recognized firm
  if (firmId && firmId in FUNDING_FIRMS) {
    return FUNDING_FIRMS[firmId as FundingFirmId].minProfitThreshold;
  }

  // Personal or unrecognized firm
  return DEFAULT_PROFIT_THRESHOLD;
}

/**
 * Gets the display label for a funding firm ID.
 */
export function getFirmLabel(firmId: FundingFirmId | string | null | undefined): string {
  if (firmId && firmId in FUNDING_FIRMS) {
    return FUNDING_FIRMS[firmId as FundingFirmId].label;
  }
  return '';
}
