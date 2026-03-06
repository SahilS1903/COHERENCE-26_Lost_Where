import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "signup") {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [location.search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/3 blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-foreground glow-text">OutreachAI</h1>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Toggle */}
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition-all ${isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition-all ${!isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="name" className="text-sm text-muted-foreground font-mono">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 bg-secondary border-border focus:border-primary focus:ring-primary/20"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground font-mono">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-secondary border-border focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm text-muted-foreground font-mono">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-secondary border-border focus:border-primary focus:ring-primary/20"
              />
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono mt-2">
              {isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4 font-mono">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary ml-1 hover:underline"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
