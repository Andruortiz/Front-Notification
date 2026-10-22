import { useParams } from 'react-router-dom';
import NotificationDetail from '../components/detail/NotificationDetail';

export default function Detalle() {
    const { id } = useParams();

    return <NotificationDetail id={id} variant="page" />;
}
