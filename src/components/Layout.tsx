import { Link, Outlet, useLocation } from 'react-router-dom';

const NAV_LINKS = [
    { to: '/', label: 'Notificaciones' },
    { to: '/catalogo', label: 'Catálogo' },
];

export default function Layout() {
    const location = useLocation();

    return (
        <div className="app-shell">
            <nav className="app-nav">
                <div className="app-nav__brand">Notification-uco</div>
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={
                            location.pathname === link.to
                                ? 'app-nav__link app-nav__link--active'
                                : 'app-nav__link'
                        }
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
            <main className="app-main">
                <Outlet />
            </main>
        </div>
    );
}
