import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
      toast({
        title: "Success",
        description: isLogin ? "Welcome back!" : "Account created successfully.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to authenticate. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="glass-card p-8 shadow-2xl">
          {/* Toggle */}
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition-all ${isLogin ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition-all ${!isLogin ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-sm text-muted-foreground font-mono">Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      disabled={isSubmitting}
                      className="bg-secondary border-border focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm text-muted-foreground font-mono">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-secondary border-border focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm text-muted-foreground font-mono">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength={8}
                className="bg-secondary border-border focus:border-primary focus:ring-primary/20"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono mt-6">
              {isSubmitting ? (
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {isLogin ? "Sign In" : "Create Account"}
              {!isSubmitting && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4 font-mono">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={isSubmitting}
              className="text-primary ml-1 hover:underline disabled:opacity-50"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
