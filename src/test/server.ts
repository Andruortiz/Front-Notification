import { setupServer } from 'msw/node';
import { handlers } from './handlers/notifications';

export const server = setupServer(...handlers);
