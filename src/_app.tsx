import { AppsInToss } from '@apps-in-toss/framework';
import type { InitialProps } from '@granite-js/react-native';
import { type PropsWithChildren, useEffect } from 'react';
import { context } from '../require.context';
import { bootstrapGameRuntime } from './features/game-cache/bootstrapGameRuntime';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  useEffect(() => {
    void bootstrapGameRuntime().catch(() => {
      // 운영 모드에서 mTLS 또는 서버 연결에 실패하면 캐시는 ready가 되지 않아
      // 보상형 행동이 실행되지 않습니다. 테스트 모드는 로컬 캐시를 초기화합니다.
    });
  }, []);
  return <>{children}</>;
}

export default AppsInToss.registerApp(AppContainer, { context });
