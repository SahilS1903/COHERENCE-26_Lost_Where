import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  ChevronRight, 
  FileSpreadsheet, 
  Workflow, 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  ArrowRight, 
  Star, 
  Menu, 
  X,
  Target,
  Mail,
  Repeat,
  CheckSquare
} from "lucide-react";

// Particle component for the hero section background
const Particles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/40 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 1000),
            opacity: Math.random() * 0.5 + 0.1,
          }}
          animate={{
            y: [null, Math.random() * -200 - 100],
            opacity: [null, Math.random() * 0.5 + 0.1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default function Index() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 100]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-foreground font-body selection:bg-primary/30">
      {/* Navbar */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#111318]/90 backdrop-blur-md border-b border-[#1E2535] py-4" : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 md:px-12 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-xl text-white tracking-tight">OutreachAI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-[#1E2535] hover:text-white">Login</Button>
            </Link>
            <Link to="/login?mode=signup">
              <Button className="bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#00b8e6] font-semibold border-none shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#111318] border-b border-[#1E2535] px-6 py-4"
            >
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
                <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                <div className="flex flex-col gap-2 pt-4 border-t border-[#1E2535]">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-center text-white hover:bg-[#1E2535]">Login</Button>
                  </Link>
                  <Link to="/login?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#00b8e6] font-semibold">Get Started</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Section 1 - Hero */}
      <section className="relative pt-32 md:pt-48 pb-20 md:pb-32 overflow-hidden flex items-center justify-center min-h-[90vh]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
        <Particles />
        
        <motion.div 
          style={{ opacity: heroOpacity, y: heroY }}
          className="container mx-auto px-6 text-center relative z-10 max-w-5xl"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>OutreachSpark Studio 2.0 is live</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-heading font-extrabold text-white tracking-tight leading-tight mb-6"
          >
            Close More Deals. <br className="hidden md:block"/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-blue-500 glow-text">On Autopilot.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10"
          >
            AI-powered outreach that writes, sends, and follows up like your best salesperson — at 100x the scale.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/login?mode=signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#00b8e6] font-semibold text-base h-14 px-8 shadow-[0_0_25px_rgba(0,212,255,0.4)] hover:shadow-[0_0_35px_rgba(0,212,255,0.6)] transition-all">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/#features" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-[#1E2535] text-white hover:bg-[#111318] h-14 px-8 font-medium">
                Watch Demo
              </Button>
            </Link>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm font-medium text-muted-foreground border-y border-[#1E2535] py-4 max-w-2xl mx-auto"
          >
            <span>Trusted by 500+ sales teams</span>
            <span className="hidden sm:inline text-[#1E2535]">•</span>
            <span>2M+ messages sent</span>
            <span className="hidden sm:inline text-[#1E2535]">•</span>
            <span className="text-[#00D4FF]">18% avg reply rate</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 2 - How It Works */}
      <section id="how-it-works" className="py-24 bg-[#0A0A0F] relative border-t border-[#1E2535]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-4">From List to Leads in 3 Steps</h2>
            <p className="text-muted-foreground text-lg">Set up your entire outbound engine in under 10 minutes.</p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 relative"
          >
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-[100px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#1E2535] to-transparent z-0" />
            
            {/* Step 1 */}
            <motion.div variants={fadeIn} className="relative z-10 glass-card p-8 rounded-2xl bg-[#111318] border border-[#1E2535] flex flex-col items-center text-center">
              <div className="absolute -top-4 w-8 h-8 rounded-full bg-[#00D4FF] text-[#0A0A0F] font-bold flex items-center justify-center font-heading border-4 border-[#0A0A0F]">1</div>
              <div className="w-16 h-16 rounded-2xl bg-[#1E2535]/50 flex items-center justify-center mb-6 text-white group hover:bg-[#1E2535] transition-colors">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white mb-3">Upload Your Leads</h3>
              <p className="text-muted-foreground">Import your client list via CSV or Excel mapping custom fields in seconds.</p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeIn} className="relative z-10 glass-card p-8 rounded-2xl bg-[#111318] border border-[#1E2535] flex flex-col items-center text-center">
              <div className="absolute -top-4 w-8 h-8 rounded-full bg-[#00D4FF] text-[#0A0A0F] font-bold flex items-center justify-center font-heading border-4 border-[#0A0A0F]">2</div>
              <div className="w-16 h-16 rounded-2xl bg-[#1E2535]/50 flex items-center justify-center mb-6 text-white group hover:bg-[#1E2535] transition-colors">
                <Workflow className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white mb-3">Build Your Workflow</h3>
              <p className="text-muted-foreground">Design your multi-channel outreach sequence visually — no code required.</p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeIn} className="relative z-10 glass-card p-8 rounded-2xl bg-[#111318] border border-[#1E2535] flex flex-col items-center text-center">
              <div className="absolute -top-4 w-8 h-8 rounded-full bg-[#00D4FF] text-[#0A0A0F] font-bold flex items-center justify-center font-heading border-4 border-[#0A0A0F]">3</div>
              <div className="w-16 h-16 rounded-2xl bg-[#1E2535]/50 flex items-center justify-center mb-6 text-white group hover:bg-[#1E2535] transition-colors">
                <Bot className="w-8 h-8 text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white mb-3">AI Does the Rest</h3>
              <p className="text-muted-foreground">Personalized messages sent automatically with human-like timing and replies detection.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 3 - Features Grid */}
      <section id="features" className="py-24 bg-[#111318] border-t border-[#1E2535]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-4">Everything You Need to Scale</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Built from the ground up to maximize deliverability and conversion rates without the manual work.</p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Features Array mapped to cards */}
            {[
              { icon: Sparkles, title: "AI Message Generation", desc: "Gemini writes personalized emails for every lead based on their role and industry.", accent: "text-purple-400", bg: "bg-purple-400/10" },
              { icon: Repeat, title: "Visual Workflow Builder", desc: "Drag and drop nodes to design multi-step, multi-channel outreach sequences.", accent: "text-blue-400", bg: "bg-blue-400/10" },
              { icon: ShieldCheck, title: "Safety & Compliance", desc: "Built-in throttling, jitter delays, opt-out detection and rate limiting out of the box.", accent: "text-green-400", bg: "bg-green-400/10" },
              { icon: BarChart3, title: "Live Dashboard", desc: "Track every lead's position in your workflow and reply rates in real time.", accent: "text-amber-400", bg: "bg-amber-400/10" },
              { icon: FileSpreadsheet, title: "Excel Import", desc: "Upload structured lead data mapping custom variables and start outreach under 2 mins.", accent: "text-emerald-400", bg: "bg-emerald-400/10" },
              { icon: Target, title: "Predictive Scoring", desc: "AI scores each lead by reply probability before you even hit send.", accent: "text-rose-400", bg: "bg-rose-400/10" },
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                variants={fadeIn}
                className="bg-[#0A0A0F] border border-[#1E2535] rounded-2xl p-6 hover:border-[#303B54] transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-6 h-6 ${feature.accent}`} />
                </div>
                <h3 className="text-xl font-heading font-semibold text-white mb-2 group-hover:text-[#00D4FF] transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section 4 - Pricing */}
      <section id="pricing" className="py-24 bg-[#0A0A0F] border-y border-[#1E2535]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-6">Simple Pricing. Powerful Automation.</h2>
            
            {/* Toggle */}
            <div className="inline-flex items-center p-1 bg-[#111318] border border-[#1E2535] rounded-full mx-auto relative">
              <div 
                className="absolute inset-y-1 bg-[#252C3E] rounded-full transition-all duration-300 shadow-sm"
                style={{
                  width: 'calc(50% - 4px)',
                  left: isAnnual ? 'calc(50% + 2px)' : '4px',
                }}
              />
              <button 
                className={`relative px-6 py-2 rounded-full text-sm font-medium z-10 transition-colors ${!isAnnual ? "text-white" : "text-muted-foreground"}`}
                onClick={() => setIsAnnual(false)}
              >
                Monthly
              </button>
              <button 
                className={`relative px-6 py-2 rounded-full text-sm font-medium z-10 transition-colors flex gap-2 items-center ${isAnnual ? "text-white" : "text-muted-foreground"}`}
                onClick={() => setIsAnnual(true)}
              >
                Annually
                <span className="text-xs bg-[#FFB800]/20 text-[#FFB800] px-2 py-0.5 rounded-full font-bold">20% off</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            {/* Free */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#111318] border border-[#1E2535] rounded-3xl p-8 h-full flex flex-col"
            >
              <h3 className="text-xl font-heading font-medium text-white mb-2">Free Trial</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> 5 Nodes</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> 50 Leads</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Email only channels</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> 100 AI Messages / mo</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Community Support</li>
              </ul>
              <Link to="/login?mode=signup" className="w-full">
                <Button variant="outline" className="w-full border-[#1E2535] text-white hover:bg-[#1E2535]">Get Started</Button>
              </Link>
            </motion.div>

            {/* Basic */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#111318] border border-[#1E2535] rounded-3xl p-8 h-full flex flex-col"
            >
              <h3 className="text-xl font-heading font-medium text-white mb-2">Basic</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${isAnnual ? 24 : 29}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> 15 Nodes</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> 500 Leads</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Email + LinkedIn</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> 1,000 AI Messages / mo</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Email Support</li>
              </ul>
              <Link to="/login?mode=signup" className="w-full">
                <Button variant="outline" className="w-full border-[#1E2535] text-white hover:bg-[#1E2535]">Get Started</Button>
              </Link>
            </motion.div>

            {/* Pro - Highlighted */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#111318] border-2 border-[#00D4FF] rounded-3xl p-8 lg:scale-105 shadow-[0_0_30px_rgba(0,212,255,0.15)] h-[105%] flex flex-col relative z-20"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#00D4FF] text-[#0A0A0F] font-bold px-4 py-1 rounded-full text-xs uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-xl font-heading font-medium text-white mb-2 pt-2">Pro</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">${isAnnual ? 63 : 79}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm text-white"><CheckSquare className="w-5 h-5 text-[#00D4FF] shrink-0" /> Unlimited Nodes</li>
                <li className="flex items-start gap-3 text-sm text-white"><CheckSquare className="w-5 h-5 text-[#00D4FF] shrink-0" /> 5,000 Leads</li>
                <li className="flex items-start gap-3 text-sm text-white"><CheckSquare className="w-5 h-5 text-[#00D4FF] shrink-0" /> Email + LinkedIn + SMS</li>
                <li className="flex items-start gap-3 text-sm text-white"><CheckSquare className="w-5 h-5 text-[#00D4FF] shrink-0" /> 10,000 AI Messages / mo</li>
                <li className="flex items-start gap-3 text-sm text-white"><CheckSquare className="w-5 h-5 text-[#00D4FF] shrink-0" /> Priority Support</li>
              </ul>
              <Link to="/login?mode=signup" className="w-full">
                <Button className="w-full bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#00b8e6] font-bold shadow-[0_0_15px_rgba(0,212,255,0.4)]">Get Started</Button>
              </Link>
            </motion.div>

            {/* Enterprise */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-[#111318] border border-[#1E2535] rounded-3xl p-8 h-full flex flex-col"
            >
              <h3 className="text-xl font-heading font-medium text-white mb-2">Enterprise</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${isAnnual ? 159 : 199}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Unlimited Nodes</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Unlimited Leads</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> All channels included</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Unlimited AI Messages</li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground"><CheckSquare className="w-5 h-5 text-primary shrink-0" /> Dedicated Account Manager</li>
              </ul>
              <Link to="/login?mode=signup" className="w-full">
                <Button variant="outline" className="w-full border-[#1E2535] text-white hover:bg-[#1E2535]">Contact Sales</Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 5 - Social Proof */}
      <section className="py-24 bg-[#111318]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">Loved by Revenue Teams</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Review 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#0A0A0F] border border-[#1E2535] rounded-2xl p-8 flex flex-col"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />)}
              </div>
              <p className="text-muted-foreground text-lg mb-8 flex-1 italic">
                "We went from 4% to 22% reply rate in 3 weeks. The AI personalization is scary good, it sounds exactly like our reps."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center border border-blue-500/30">AR</div>
                <div>
                  <div className="font-medium text-white">Alex R.</div>
                  <div className="text-sm text-muted-foreground">Sales Lead at SaaS Company</div>
                </div>
              </div>
            </motion.div>

            {/* Review 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#0A0A0F] border border-[#1E2535] rounded-2xl p-8 flex flex-col"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />)}
              </div>
              <p className="text-muted-foreground text-lg mb-8 flex-1 italic">
                "Finally an outreach tool that doesn't get us flagged as spam. The throttling logic and delay jitter is brilliant."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center border border-purple-500/30">PM</div>
                <div>
                  <div className="font-medium text-white">Priya M.</div>
                  <div className="text-sm text-muted-foreground">VP Sales at FinTech Firm</div>
                </div>
              </div>
            </motion.div>

            {/* Review 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#0A0A0F] border border-[#1E2535] rounded-2xl p-8 flex flex-col"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />)}
              </div>
              <p className="text-muted-foreground text-lg mb-8 flex-1 italic">
                "Set it up in an afternoon. By next morning we had 14 replies from a list of 200. The ROI paid for itself day one."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 font-bold flex items-center justify-center border border-green-500/30">JO</div>
                <div>
                  <div className="font-medium text-white">James O.</div>
                  <div className="text-sm text-muted-foreground">Founder at Logistics Startup</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 6 - Footer CTA & Footer */}
      <section className="py-24 bg-[#0A0A0F] relative overflow-hidden border-t border-[#1E2535]">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10 mb-20">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-heading font-extrabold text-white mb-6"
          >
            Ready to scale your outreach?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/login?mode=signup">
              <Button size="lg" className="bg-[#00D4FF] text-[#0A0A0F] hover:bg-[#00b8e6] font-bold text-lg h-16 px-10 shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] transition-all rounded-xl">
                Start Free — No credit card required
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Footer Links */}
        <div className="container mx-auto px-6 max-w-7xl pt-12 border-t border-[#1E2535]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="font-heading font-bold text-lg text-white">OutreachAI</span>
            </div>
            
            <div className="flex gap-6 text-sm text-muted-foreground font-medium">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#" className="hover:text-white transition-colors">Docs</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
          
          <div className="text-center text-sm text-[#1E2535] pt-8 mt-8 border-t border-[#1E2535]/50">
            &copy; {new Date().getFullYear()} OutreachSpark Studio. All rights reserved.
          </div>
        </div>
      </section>
    </div>
  );
}
