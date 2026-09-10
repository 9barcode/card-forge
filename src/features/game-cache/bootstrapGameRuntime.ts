import { createUserService } from '../../services/userService';
import { createAppsInTossGameUserIdentityProvider } from '../user';
import { createHttpUserRepository } from '../user';
import { gameRuntime } from './gameRuntime';
import { createHttpGameServerGateway } from './httpGameServerGateway';
import {
  LOCAL_GAMEPLAY_TEST_MODE,
  createLocalGameplayTestGateway,
} from './localGameplayTestGateway';

export const GAME_API_BASE_URL =
  'https://nmbdwukrvwfaxpasbppj.supabase.co/functions/v1/game-api';

let pending: Promise<void> | null = null;

export function bootstrapGameRuntime(): Promise<void> {
  if (pending) return pending;
  if (LOCAL_GAMEPLAY_TEST_MODE) {
    gameRuntime.configure(createLocalGameplayTestGateway());
    pending = gameRuntime.initialize('local-gameplay-test');
    return pending;
  }
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: GAME_API_BASE_URL,
  });
  const users = createUserService({
    gameUserIdentityProvider: createAppsInTossGameUserIdentityProvider(),
    userRepository: createHttpUserRepository({ apiBaseUrl: GAME_API_BASE_URL }),
  });
  gameRuntime.configure(gateway);
  pending = users
    .initializeCurrentUser()
    .then((session) => gameRuntime.initialize(session.accessToken))
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}
