import { apiRequest } from '@/lib/api';
import { DbInspectorData } from '../types/dbInspector.types';

export async function fetchDbInspectorData(): Promise<DbInspectorData> {
  return await apiRequest<DbInspectorData>('/api/db-inspector');
}
