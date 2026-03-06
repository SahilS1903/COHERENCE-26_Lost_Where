import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token in localStorage on mount
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");
    
    if (storedToken) {
      setTokenState(storedToken);
      
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          // ignore parsing error
        }
      }
      
      if (!storedUser) {
        // Decode JWT for demo purposes (real app uses /me)
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          setUser({ id: payload.userId, email: "user@example.com", name: "Demo User" });
        } catch (e) {
          setUser({ id: "1", email: "mock@example.com", name: "Mock User" });
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (data: any) => {
    const res: any = await api.auth.login(data);
    localStorage.setItem("auth_token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));
    setTokenState(res.token);
    setUser(res.user);
    navigate("/dashboard");
  };

  const register = async (data: any) => {
    const res: any = await api.auth.register(data);
    localStorage.setItem("auth_token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));
    setTokenState(res.token);
    setUser(res.user);
    navigate("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setTokenState(null);
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
