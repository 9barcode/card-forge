export type AdPurpose = 'PACK' | 'ENHANCEMENT' | 'SALE';

export interface AdAttempt {
  adAttemptId: string;
  purpose: AdPurpose;
  status: 'PENDING' | 'REWARDED' | 'CONSUMED' | 'EXPIRED' | 'REJECTED';
  issuedAt: string;
  notBefore: string;
  expiresAt: string;
}
