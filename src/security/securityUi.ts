import { requireSession } from './session';

interface SecurityUiOptions {
    applicationName: string;
    apiBaseUrl: string;
    allowApplicationLifecycleManagement: boolean;
    theme: { accent: string; fontFamily: string; radius: string };
}

interface SecurityUiModule {
    mount: (container: HTMLElement, options: SecurityUiOptions) => unknown;
}

export async function mountSecurityUi(container: HTMLElement): Promise<void> {
    const pdpUrl = import.meta.env.VITE_PDP_URL;
    const bundleUrl = import.meta.env.VITE_SECURITY_UI_URL;
    const applicationName = import.meta.env.VITE_APPLICATION_NAME;

    if (!pdpUrl || !bundleUrl || !applicationName) {
        throw new Error(
            'Falta configurar VITE_PDP_URL, VITE_SECURITY_UI_URL y VITE_APPLICATION_NAME.',
        );
    }

    if (!(await requireSession(pdpUrl))) {
        return;
    }

    const remote = (await import(/* @vite-ignore */ bundleUrl)) as SecurityUiModule;
    remote.mount(container, {
        applicationName,
        apiBaseUrl: pdpUrl,
        allowApplicationLifecycleManagement: false,
        theme: { accent: '#116149', fontFamily: 'system-ui, sans-serif', radius: '12px' },
    });
}
