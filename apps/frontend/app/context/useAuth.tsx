import { createContext, useContext, useEffect, useState } from "react";

const fetchData = async () => {
    try {
    const user = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/user`, {
        method: 'GET',
        headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    
    console.log(user);
    
    const userData = await user.json();

    if(!userData?.id) {
        window.location.href = '/log-in';
    }
    
    return userData;

    } catch (err) {
    console.log(err);
    return null;
    }
}

export const AuthContext = createContext<{ user: { name:string } | null, refetch: () => Promise<void> }>({ user: null, refetch: async () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<{ name:string } | null>(null);
    const refetch = async () => {
        const userData = await fetchData();
        setUser(userData);
    }
    useEffect(() => {
        refetch();
    }, [])

    return (
        <AuthContext.Provider value={{ user, refetch }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const { user, refetch } = useContext(AuthContext);
    return { user, refetch };
}