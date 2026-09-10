import { createServerDatabase } from '../_shared/database.ts';
import { json } from '../_shared/http.ts';
import { parseGameInventory } from './inventory-domain.ts';
import { requireSessionUser } from './membership.ts';

export async function handleInventory(
  request: Request,
  path: string,
): Promise<Response | null> {
  if (request.method !== 'GET' || !path.endsWith('/api/v1/inventory')) return null;

  const userId = await requireSessionUser(request);
  const database = createServerDatabase();
  const { data, error } = await database.rpc('get_game_inventory', {
    p_user_id: userId,
  });
  if (error) throw new Error('INVENTORY_LOOKUP_FAILED');
  if (data === null) throw new Error('INVENTORY_USER_NOT_FOUND');

  return json({
    ...parseGameInventory(data),
    syncedAt: new Date().toISOString(),
  });
}
