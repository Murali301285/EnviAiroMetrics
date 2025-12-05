import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role && user.role !== role) {
        // If user is admin, allow access to user routes
        if (user.role === 'admin' && role === 'user') {
            return children;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
