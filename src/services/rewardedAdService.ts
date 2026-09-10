import {
  type LoadFullScreenAdParams,
  type ShowFullScreenAdParams,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/framework';

/** 앱인토스 공식 문서의 개발용 보상형 광고 그룹 ID입니다. */
export const REWARDED_AD_TEST_ID = 'ait.dev.43daa14da3ae487b';

type FullScreenAdGateway = {
  isLoadSupported(): boolean;
  isShowSupported(): boolean;
  load(params: LoadFullScreenAdParams): () => void;
  show(params: ShowFullScreenAdParams): () => void;
};

const appsInTossGateway: FullScreenAdGateway = {
  isLoadSupported: () => loadFullScreenAd.isSupported(),
  isShowSupported: () => showFullScreenAd.isSupported(),
  load: (params) => loadFullScreenAd(params),
  show: (params) => showFullScreenAd(params),
};

export interface RewardedAdResult {
  unitType: string;
  unitAmount: number;
  /** 서버 검증용 식별자가 SDK에서 제공될 때만 존재합니다. */
  completionId?: string;
}

export class RewardedAdService {
  constructor(
    private readonly gateway: FullScreenAdGateway = appsInTossGateway,
  ) {}

  isSupported(): boolean {
    return this.gateway.isLoadSupported() && this.gateway.isShowSupported();
  }

  load(): Promise<void> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('REWARDED_AD_NOT_SUPPORTED'));
    }

    return new Promise((resolve, reject) => {
      let unregister = () => {};
      unregister = this.gateway.load({
        options: { adGroupId: REWARDED_AD_TEST_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            unregister();
            resolve();
          }
        },
        onError: (error) => {
          unregister();
          reject(adError('REWARDED_AD_LOAD_FAILED', error));
        },
      });
    });
  }

  show(): Promise<RewardedAdResult> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('REWARDED_AD_NOT_SUPPORTED'));
    }

    return new Promise((resolve, reject) => {
      let reward: RewardedAdResult | undefined;
      let unregister = () => {};
      unregister = this.gateway.show({
        options: { adGroupId: REWARDED_AD_TEST_ID },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') {
            reward = event.data;
          } else if (event.type === 'failedToShow') {
            unregister();
            reject(new Error('REWARDED_AD_FAILED_TO_SHOW'));
          } else if (event.type === 'dismissed') {
            unregister();
            if (reward) resolve(reward);
            else reject(new Error('REWARDED_AD_DISMISSED_WITHOUT_REWARD'));
          }
        },
        onError: (error) => {
          unregister();
          reject(adError('REWARDED_AD_SHOW_FAILED', error));
        },
      });
    });
  }
}

export const rewardedAdService = new RewardedAdService();

function adError(code: string, cause: unknown): Error {
  const detail = readableError(cause);
  return new Error(detail ? `${code}: ${detail}` : code);
}

function readableError(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value == null ? '' : String(value);
}
