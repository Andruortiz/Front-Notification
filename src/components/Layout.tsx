import { Link, Outlet, useLocation } from 'react-router-dom';
import { logout, sessionModeUrl } from '../security/session';

const NAV_LINKS = [
    { to: '/', label: 'Notificaciones' },
    { to: '/notificaciones/nueva', label: 'Nueva notificación' },
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/seguridad', label: 'Seguridad' },
];

export default function Layout() {
    const location = useLocation();
    const pdpUrl = sessionModeUrl();

    return (
        <div className="app-shell">
            <nav className="app-nav">
                <div className="app-nav__brand">Notification-uco</div>
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        aria-current={location.pathname === link.to ? 'page' : undefined}
                        className={
                            location.pathname === link.to
                                ? 'app-nav__link app-nav__link--active'
                                : 'app-nav__link'
                        }
                    >
                        {link.label}
                    </Link>
                ))}
                {pdpUrl && (
                    <button
                        type="button"
                        className="app-nav__link app-nav__logout"
                        onClick={() => logout(pdpUrl)}
                    >
                        Cerrar sesión
                    </button>
                )}
            </nav>
            <main className="app-main">
                <div className="content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
