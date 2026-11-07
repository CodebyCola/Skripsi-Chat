import type http from 'node:http';
import { AdminController } from '../controllers/admin.controller.ts';

export function handleAdminRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  urlObj: URL
): boolean {
  if (method === 'POST' && pathname === '/api/admin/provision-user') {
    AdminController.provisionUser(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/admin/assign-supervisor') {
    AdminController.assignSupervisor(req, res);
    return true;
  }
  if (method === 'POST' && pathname === '/api/admin/deactivate-user') {
    AdminController.deactivateUser(req, res);
    return true;
  }
  if (method === 'GET' && pathname === '/api/admin/audit-logs') {
    AdminController.listAuditLogs(req, res, urlObj);
    return true;
  }

  return false;
}
