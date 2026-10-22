import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushTokenButton from './PushTokenButton';
import { PushTokenError, type FirebaseWebConfig } from '../../lib/firebaseWeb';
import type * as FirebaseWebModule from '../../lib/firebaseWeb';

const readFirebaseConfig = vi.fn();
const requestBrowserPushToken = vi.fn();

vi.mock('../../lib/firebaseWeb', async (importOriginal) => {
    const original = await importOriginal<typeof FirebaseWebModule>();
    return {
        ...original,
        readFirebaseConfig: (): FirebaseWebConfig | null =>
            readFirebaseConfig() as FirebaseWebConfig | null,
        requestBrowserPushToken: (...args: unknown[]): Promise<string> =>
            requestBrowserPushToken(...args) as Promise<string>,
    };
});

const config = {
    apiKey: 'k',
    authDomain: 'd',
    projectId: 'p',
    messagingSenderId: 's',
    appId: 'a',
    vapidKey: 'v',
};

afterEach(() => {
    readFirebaseConfig.mockReset();
    requestBrowserPushToken.mockReset();
});

describe('PushTokenButton', () => {
    it('no se muestra si Firebase no está configurado', () => {
        readFirebaseConfig.mockReturnValue(null);
        render(<PushTokenButton onToken={vi.fn()} />);

        expect(screen.queryByRole('button', { name: 'Usar este navegador' })).toBeNull();
    });

    it('entrega el token obtenido', async () => {
        readFirebaseConfig.mockReturnValue(config);
        requestBrowserPushToken.mockResolvedValue('device-token-9');
        const onToken = vi.fn();
        render(<PushTokenButton onToken={onToken} />);

        await userEvent.click(screen.getByRole('button', { name: 'Usar este navegador' }));

        expect(onToken).toHaveBeenCalledWith('device-token-9');
        expect(await screen.findByText(/Token de este navegador cargado/)).toBeInTheDocument();
    });

    it('muestra el motivo cuando el permiso se rechaza', async () => {
        readFirebaseConfig.mockReturnValue(config);
        requestBrowserPushToken.mockRejectedValue(
            new PushTokenError('denied', 'El navegador no dio permiso.'),
        );
        const onToken = vi.fn();
        render(<PushTokenButton onToken={onToken} />);

        await userEvent.click(screen.getByRole('button', { name: 'Usar este navegador' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('El navegador no dio permiso.');
        expect(onToken).not.toHaveBeenCalled();
    });
});
