import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import {
  Store, UserCheck, Shield, ArrowRight, Menu, X, Check, Sparkles, Zap, Globe,
  Gauge, Rocket, Star, TrendingUp, Barcode, ScanLine, Wrench,
  BarChart3, Users, Smartphone, Boxes, ReceiptText,
  ClipboardList, PackageSearch, MessageSquare, Lock, Quote,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import ThemeToggle from '../components/UI/ThemeToggle';
import { StiqrLogo } from '../components/UI/StiqrLogo';

/* ── Motion presets ── */
const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
};

const stagger = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, margin: '-80px' },
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.09 } },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── Data ── */
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Reviews', href: '#testimonials' },
];

const FEATURES = [
  { icon: Barcode, title: 'Barcode Inventory', desc: 'Scan, stock, and track every product with lightning-fast barcode support, low-stock alerts, and automatic stock value.', color: '#f97316' },
  { icon: ReceiptText, title: 'Smart POS & Billing', desc: 'Generate GST-ready invoices in seconds with billing, returns, discounts, and multi-payment support built right in.', color: '#22c55e' },
  { icon: Wrench, title: 'Repair Service Desk', desc: 'Manage repair orders, service tickets, customer pickups, and status updates with full repair history tracking.', color: '#3b82f6' },
  { icon: BarChart3, title: 'Sales & Reports', desc: 'Real-time dashboards with profit, top products, and daily analytics so you always know how your shop is performing.', color: '#8b5cf6' },
  { icon: Users, title: 'Customer Management', desc: 'Build a loyalty-ready customer base with purchase history, credits, and easy re-ordering in one tap.', color: '#ec4899' },
  { icon: Boxes, title: 'Multi-Platform Sync', desc: 'One shared database across web, Android, iOS, and desktop — your shop data is always in sync everywhere.', color: '#14b8a6' },
];

const SOLUTIONS = [
  {
    icon: Shield,
    tag: 'Command Center',
    title: 'Platform Admin Portal',
    desc: 'Oversee every shop on the network. Manage subscriptions, review platform reports, and stay compliant with full audit logging.',
    points: ['Shop & subscription management', 'Platform-wide reports', 'Audit logs & maintenance'],
    to: '/admin/login',
    cta: 'Enter Admin Portal',
    accent: '#8b5cf6',
  },
  {
    icon: Store,
    tag: 'Best for Owners',
    title: 'Shop Owner Portal',
    desc: 'Run your entire mobile shop from a powerful yet simple dashboard — purchases, sales, services, inventory, and staff all in one place.',
    points: ['Complete purchase & sales flow', 'Staff & permission management', 'Service order tracking'],
    to: '/login',
    cta: 'Open Owner Portal',
    accent: '#f97316',
  },
  {
    icon: UserCheck,
    tag: 'On the Floor',
    title: 'Staff POS Terminal',
    desc: 'A lightning-fast point of sale and repair desk for your team. Scan, bill, and update service status without slowing down.',
    points: ['One-tap billing & scanning', 'Repair status updates', 'Shift-safe access control'],
    to: '/staff/login',
    cta: 'Launch Staff Terminal',
    accent: '#22c55e',
  },
];

const STEPS = [
  { icon: ClipboardList, step: '01', title: 'Set up your shop', desc: 'Create your shop profile, add categories, and configure tax, billing, and branding in minutes.' },
  { icon: ScanLine, step: '02', title: 'Scan & stock products', desc: 'Use barcode scanning to add products instantly and keep a live, accurate inventory.' },
  { icon: ReceiptText, step: '03', title: 'Sell & repair', desc: 'Bill customers fast, raise repair tickets, and let them track service status in real time.' },
  { icon: TrendingUp, step: '04', title: 'Grow with insights', desc: 'Read clear sales reports, restock smarter, and grow with customer loyalty and repeat orders.' },
];

const PLANS = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/month',
    desc: 'For small shops getting started with digital billing.',
    features: ['Smart billing & invoices', 'Up to 500 products', 'Basic sales reports', 'Email support'],
    featured: false,
  },
  {
    name: 'Pro',
    price: '₹2,499',
    period: '/month',
    desc: 'For growing shops that want full control & automation.',
    features: ['Everything in Starter', 'Unlimited products & barcode', 'Repair service desk', 'Staff accounts & roles', 'Advanced analytics', 'Priority support'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For multi-store chains and dedicated deployments.',
    features: ['Everything in Pro', 'Multi-store management', 'Custom integrations & API', 'Dedicated account manager'],
    featured: false,
  },
];

const TESTIMONIALS = [
  { name: 'Rahul Sharma', role: 'Owner, Mobile World', initial: 'RS', quote: 'StiQR completely changed how we run our shop. Billing, inventory, and repairs used to take 3 different apps — now it is all in one place.', color: '#f97316' },
  { name: 'Priya Menon', role: 'Owner, PhonePoint', initial: 'PM', quote: 'The barcode scanning is a game changer. Our billing time dropped from minutes to seconds, and stock is always accurate now.', color: '#22c55e' },
  { name: 'Arjun Nair', role: 'Staff, Mobile Care', initial: 'AN', quote: 'Repair tracking is so smooth. Customers love the live status updates and we never lose track of a ticket anymore.', color: '#3b82f6' },
];

const STATS = [
  { value: '10K+', label: 'Shops onboarded' },
  { value: '2M+', label: 'Invoices generated' },
  { value: '120K+', label: 'Repairs managed' },
  { value: '99.9%', label: 'Uptime SLA' },
];

/* ── Section heading helper ── */
const SectionHeading: React.FC<{ eyebrow: string; title: React.ReactNode; sub?: string }> = ({ eyebrow, title, sub }) => (
  <motion.div {...fadeUp} style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 100, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.22)', color: '#f97316', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>
      <Sparkles size={14} /> {eyebrow}
    </div>
    <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, color: 'var(--text-primary)' }}>
      {title}
    </h2>
    {sub && <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, marginTop: 16 }}>{sub}</p>}
  </motion.div>
);

/* ════════════════════════ MAIN COMPONENT ════════════════════════ */
const Landing: React.FC = () => {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24));

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 150);
    return () => clearTimeout(t);
  }, []);

  const sectionStyles = {
    padding: '96px 24px',
    maxWidth: 1200,
    margin: '0 auto',
  } as const;

  const go = (to: string) => () => navigate(to);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: "'Inter',sans-serif", overflow: 'hidden' }}>
      {/* ── Background ambient orbs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '-10%', left: '-8%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.22), transparent 65%)', filter: 'blur(90px)' }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '30%', right: '-12%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 65%)', filter: 'blur(100px)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', bottom: '-15%', left: '30%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12), transparent 65%)', filter: 'blur(90px)' }}
        />
      </div>

      {/* ── Navbar ── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
          background: scrolled ? (isDark ? 'rgba(15,15,15,0.72)' : 'rgba(255,255,255,0.72)') : 'transparent',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: scrolled ? `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}` : '1px solid transparent',
          boxShadow: scrolled ? (isDark ? '0 8px 30px rgba(0,0,0,0.45)' : '0 8px 30px rgba(0,0,0,0.06)') : 'none',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <StiqrLogo size={40} showText />
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="hidden-mobile">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={{ padding: '9px 14px', borderRadius: 10, color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, transition: 'all 0.2s', fontFamily: 'inherit' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; e.currentTarget.style.background = 'rgba(249,115,22,0.08)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                {l.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle />
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={go('/login')} className="hidden-mobile" style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign In
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={go('/login')} className="hidden-mobile" style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(249,115,22,0.4)', fontFamily: 'inherit' }}>
              Get Started <ArrowRight size={16} />
            </motion.button>

            {/* Mobile menu button */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ display: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }} className="menu-button">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', background: isDark ? 'rgba(15,15,15,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)' }}
            >
              <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {NAV_LINKS.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ padding: '12px 14px', borderRadius: 10, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit' }}>
                    {l.label}
                  </a>
                ))}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setMenuOpen(false); go('/login')(); }} style={{ marginTop: 8, padding: '14px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Get Started <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ══ HERO ══ */}
      <section style={{ position: 'relative', zIndex: 1, padding: '40px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 880, margin: '0 auto', paddingTop: 'clamp(32px, 7vw, 84px)' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 100, background: isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', fontSize: 13, fontWeight: 700, boxShadow: '0 0 24px rgba(249,115,22,0.15)' }}>
              <Zap size={15} fill="currentColor" /> v2.4 — Next-Gen Mobile Shop ERP
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(40px, 8vw, 76px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.04, marginTop: 28, color: 'var(--text-primary)' }}
          >
            The all-in-one ERP for{' '}
            <span style={{ background: 'linear-gradient(135deg, #f97316, #fb923c, #fdba74)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              mobile shops
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            style={{ margin: '24px auto 0', maxWidth: 620, color: 'var(--text-muted)', fontSize: 'clamp(16px, 2.4vw, 19px)', lineHeight: 1.7 }}
          >
            Sales, barcode inventory, repair services, staff, and reports — unified in one stunningly simple platform for web, mobile, and desktop.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.34 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 38, flexWrap: 'wrap' }}
          >
            <motion.button whileHover={{ scale: 1.04, boxShadow: '0 10px 34px rgba(249,115,22,0.5)' }} whileTap={{ scale: 0.97 }} onClick={go('/login')} style={{ padding: '16px 34px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 24px rgba(249,115,22,0.4)', fontFamily: 'inherit' }}>
              Start Free Trial <Rocket size={18} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={go('/status')} style={{ padding: '16px 30px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 14, color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
              Track Order Status <PackageSearch size={18} />
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.48 }}
            style={{ marginTop: 18, color: 'var(--text-disabled)', fontSize: 13 }}
          >
            No credit card required · Setup in under 5 minutes
          </motion.p>
        </div>

        {/* ── Hero dashboard mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', margin: '72px auto 0', maxWidth: 1020, perspective: 1600 }}
        >
          {/* Glow behind mockup */}
          <div style={{ position: 'absolute', inset: '-8% -4%', background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.22), transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />

          {/* Floating side cards */}
          <motion.div
            animate={heroLoaded ? { y: [0, -14, 0] } : {}}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '12%', left: '-7%', zIndex: 3, display: 'none' }}
            className="hero-float-left"
          >
            <div style={{ padding: '14px 18px', borderRadius: 16, background: isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.95)', border: '1px solid rgba(249,115,22,0.3)', boxShadow: '0 18px 50px rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Barcode size={22} color="#22c55e" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Product Scanned</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>#8901234567890</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={heroLoaded ? { y: [0, 14, 0] } : {}}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{ position: 'absolute', bottom: '14%', right: '-7%', zIndex: 3, display: 'none' }}
            className="hero-float-right"
          >
            <div style={{ padding: '14px 18px', borderRadius: 16, background: isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.95)', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 18px 50px rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={22} color="#f97316" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Today's Revenue</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#f97316', fontFamily: "'JetBrains Mono',monospace" }}>₹28,400 ↑ 12%</div>
              </div>
            </div>
          </motion.div>

          {/* Dashboard window */}
          <div style={{
            position: 'relative', zIndex: 2, borderRadius: 24, overflow: 'hidden',
            background: isDark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.96)',
            border: '1px solid rgba(249,115,22,0.25)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(18px)',
            transform: 'rotateX(4deg)',
          }}>
            {/* Window chrome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border)', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', padding: '4px 16px', borderRadius: 8, fontFamily: "'JetBrains Mono',monospace" }}>
                  app.stiqr.com/dashboard
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
              <div style={{ padding: '26px 28px' }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>Good morning, Owner 👋</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Here's what's happening at Mobile World today</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>📅 Today</div>
                    <div style={{ padding: '9px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>+ New Sale</div>
                  </div>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                  {[
                    { label: "Today's Sales", value: '₹28,400', delta: '+12.4%', up: true, icon: TrendingUp, color: '#f97316' },
                    { label: 'Active Repairs', value: '12', delta: '+3 new', up: true, icon: Wrench, color: '#22c55e' },
                    { label: 'Inventory', value: '847', delta: '23 low', up: false, icon: Boxes, color: '#3b82f6' },
                    { label: 'Customers', value: '1,240', delta: '+8.1%', up: true, icon: Users, color: '#8b5cf6' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={heroLoaded ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.7 + i * 0.12, duration: 0.5 }}
                      style={{ padding: 16, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                        <s.icon size={16} color={s.color} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif", marginBottom: 6 }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.up ? '#22c55e' : '#ef4444' }}>{s.delta}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart + side */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
                  {/* Chart card */}
                  <div style={{ padding: 18, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Sales</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['1W', '1M', '1Y'].map((t, i) => (
                          <span key={t} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: i === 0 ? 'rgba(249,115,22,0.15)' : 'transparent', color: i === 0 ? '#f97316' : 'var(--text-muted)' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                      {[42, 66, 50, 82, 58, 92, 74].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={heroLoaded ? { height: `${h}%` } : {}}
                          transition={{ delay: 1 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          style={{ flex: 1, borderRadius: '8px 8px 4px 4px', background: i === 5 ? 'linear-gradient(180deg,#fb923c,#ea6c0a)' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(249,115,22,0.18)', minHeight: 8, boxShadow: i === 5 ? '0 0 20px rgba(249,115,22,0.4)' : 'none' }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Recent repairs */}
                  <div style={{ padding: 18, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Repairs</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                      {[
                        { n: 'ORD-1024', s: 'In Service', c: '#f97316' },
                        { n: 'ORD-1021', s: 'Ready', c: '#22c55e' },
                        { n: 'ORD-1019', s: 'Pending', c: '#f59e0b' },
                      ].map((r, i) => (
                        <motion.div
                          key={r.n}
                          initial={{ opacity: 0, x: 12 }}
                          animate={heroLoaded ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: 1.1 + i * 0.1, duration: 0.45 }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>{r.n}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: r.c, background: `${r.c}1a`, padding: '3px 9px', borderRadius: 100 }}>{r.s}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div style={{ position: 'absolute', inset: 'auto 0 -2px 0', height: 60, background: 'linear-gradient(to top, var(--bg-primary), transparent)', zIndex: 4, pointerEvents: 'none' }} />
        </motion.div>

        {/* ── Stats bar ── */}
        <motion.div {...fadeUp} style={{ margin: '64px auto 0', maxWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: 'center', padding: '20px 12px', borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Outfit',sans-serif", background: 'linear-gradient(135deg,#f97316,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" style={{ position: 'relative', zIndex: 1, ...sectionStyles, paddingTop: 120 }}>
        <SectionHeading
          eyebrow="Powerful Features"
          title={<>Everything your shop needs, <span style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>nothing it doesn't</span></>}
          sub="From the moment a product is scanned to the second a repair is delivered — StiQR handles every step of your mobile shop workflow."
        />
        <motion.div {...stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              whileHover={{ y: -8, borderColor: `${f.color}66`, boxShadow: `0 24px 60px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.09)'}` }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              style={{ padding: '30px 26px', borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden', cursor: 'default' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${f.color}, transparent)` }} />
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${f.color}1c`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <f.icon size={26} color={f.color} strokeWidth={2.2} />
              </div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-muted)' }}>{f.desc}</p>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, color: f.color, fontSize: 13, fontWeight: 700 }}>
                Learn more <ArrowRight size={14} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ SOLUTIONS ══ */}
      <section id="solutions" style={{ position: 'relative', zIndex: 1, ...sectionStyles }}>
        <SectionHeading
          eyebrow="One Platform, Three Portals"
          title={<>Purpose-built for <span style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>everyone in the shop</span></>}
          sub="Role-based portals keep workflows clean — admins govern the network, owners run the business, and staff move faster on the floor."
        />
        <motion.div {...stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {SOLUTIONS.map((s) => (
            <motion.div
              key={s.title}
              variants={item}
              whileHover={{ y: -10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{ display: 'flex', flexDirection: 'column', padding: '34px 28px', borderRadius: 22, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${s.accent}, transparent 80%)` }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${s.accent}1c`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 6px ${s.accent}0d` }}>
                  <s.icon size={28} color={s.accent} strokeWidth={2.2} />
                </div>
                <span style={{ padding: '6px 14px', borderRadius: 100, background: `${s.accent}14`, color: s.accent, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.tag}</span>
              </div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-muted)', marginBottom: 20 }}>{s.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
                {s.points.map((p) => (
                  <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${s.accent}1c`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color={s.accent} strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={go(s.to)}
                style={{ marginTop: 'auto', padding: '13px 20px', borderRadius: 12, background: `linear-gradient(135deg, ${s.accent}, ${s.accent})`, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 6px 20px ${s.accent}40`, fontFamily: 'inherit' }}
              >
                {s.cta} <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" style={{ position: 'relative', zIndex: 1, ...sectionStyles }}>
        <SectionHeading
          eyebrow="How it works"
          title={<>Live in <span style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>four simple steps</span></>}
          sub="No complex setup, no migration headaches. Get your shop running on StiQR within minutes."
        />
        <motion.div {...stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 44, left: '8%', right: '8%', height: 2, background: 'linear-gradient(90deg, rgba(249,115,22,0.5), rgba(249,115,22,0.05))', zIndex: 0 }} className="hidden-mobile" />
          {STEPS.map((s) => (
            <motion.div key={s.step} variants={item} whileHover={{ y: -6 }} style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '8px 16px' }}>
              <div style={{ width: 84, height: 84, margin: '0 auto 20px', borderRadius: 24, background: isDark ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.95)', border: '1px solid rgba(249,115,22,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(249,115,22,0.18)', position: 'relative' }}>
                <s.icon size={34} color="#f97316" strokeWidth={2} />
                <span style={{ position: 'absolute', top: -10, right: -10, width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}>{s.step}</span>
              </div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section id="testimonials" style={{ position: 'relative', zIndex: 1, ...sectionStyles }}>
        <SectionHeading
          eyebrow="Loved by shop owners"
          title={<>Don't take our word for it — <span style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>take theirs</span></>}
          sub="Thousands of mobile shops across India run their day-to-day on StiQR."
        />
        <motion.div {...stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={item}
              whileHover={{ y: -6 }}
              style={{ padding: '28px 26px', borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', position: 'relative' }}
            >
              <Quote size={34} color={t.color} fill={`${t.color}22`} style={{ marginBottom: 14, opacity: 0.9 }} />
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 22 }}>"{t.quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18 }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} color="#f59e0b" fill="#f59e0b" />)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${t.color}, ${t.color}aa)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, fontFamily: "'Outfit',sans-serif" }}>{t.initial}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" style={{ position: 'relative', zIndex: 1, ...sectionStyles }}>
        <SectionHeading
          eyebrow="Simple Pricing"
          title={<>Plans that scale <span style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>with your shop</span></>}
          sub="Start free, upgrade when you grow. Every plan includes our multi-platform apps at no extra cost."
        />
        <motion.div {...stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'stretch' }}>
          {PLANS.map((p) => (
            <motion.div
              key={p.name}
              variants={item}
              whileHover={{ y: -8 }}
              style={{
                padding: '34px 28px', borderRadius: 22, position: 'relative', overflow: 'hidden',
                background: p.featured
                  ? 'linear-gradient(160deg, rgba(249,115,22,0.12), rgba(249,115,22,0.03))'
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
                border: p.featured ? '1.5px solid rgba(249,115,22,0.5)' : '1px solid var(--border)',
                boxShadow: p.featured ? '0 24px 70px rgba(249,115,22,0.18)' : 'none',
              }}
            >
              {p.featured && (
                <div style={{ position: 'absolute', top: 18, right: -38, transform: 'rotate(45deg)', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '6px 44px', boxShadow: '0 4px 14px rgba(249,115,22,0.4)' }}>
                  POPULAR
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>{p.name}</span>
                {p.featured && <Sparkles size={16} color="#f97316" />}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 38, fontWeight: 900, fontFamily: "'Outfit',sans-serif", color: p.featured ? '#f97316' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>{p.price}</span>
                {p.period && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>{p.period}</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 22 }}>{p.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color="#f97316" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={go('/login')}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
                  background: p.featured ? 'linear-gradient(135deg,#f97316,#ea6c0a)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: p.featured ? '#fff' : 'var(--text-primary)',
                  border: p.featured ? 'none' : '1px solid var(--border-strong)',
                  boxShadow: p.featured ? '0 6px 22px rgba(249,115,22,0.4)' : 'none',
                }}
              >
                {p.featured ? 'Start Pro Trial' : 'Choose ' + p.name}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ position: 'relative', zIndex: 1, ...sectionStyles, paddingTop: 40, paddingBottom: 110 }}>
        <motion.div {...fadeUp} style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', padding: 'clamp(48px, 8vw, 80px) 32px', textAlign: 'center', background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0a00 55%, #241206 100%)', border: '1px solid rgba(249,115,22,0.3)', boxShadow: '0 40px 120px rgba(249,115,22,0.18)' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '-40%', left: '10%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.5), transparent 70%)', filter: 'blur(70px)' }}
            />
            <div style={{ position: 'absolute', bottom: '-40%', right: '5%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,146,60,0.4), transparent 70%)', filter: 'blur(70px)' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 100, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', color: '#fb923c', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
              <Gauge size={14} /> Get started in minutes
            </div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1, marginBottom: 18 }}>
              Ready to supercharge your <span style={{ background: 'linear-gradient(135deg,#fb923c,#fdba74)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>mobile shop?</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.7, marginBottom: 34 }}>
              Join thousands of shops running smarter with StiQR. Free to start, powerful enough to grow with you.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <motion.button whileHover={{ scale: 1.05, boxShadow: '0 12px 40px rgba(249,115,22,0.55)' }} whileTap={{ scale: 0.96 }} onClick={go('/login')} style={{ padding: '16px 36px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(249,115,22,0.4)', fontFamily: 'inherit' }}>
                Create Your Free Account <ArrowRight size={18} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={go('/admin/login')} style={{ padding: '16px 30px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
                <Shield size={17} /> Admin Portal
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.015)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
            <div>
              <StiqrLogo size={44} showText subtitle="Mobile Shop ERP" />
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginTop: 18, maxWidth: 300 }}>
                The all-in-one platform for modern mobile shops — sales, inventory, repairs, and reporting in perfect sync across every device.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                {[Smartphone, Globe, Zap, MessageSquare].map((Icon, i) => (
                  <motion.div key={i} whileHover={{ y: -4, color: '#f97316' }} style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Icon size={18} />
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Product</div>
              {['Features', 'Solutions', 'Pricing', 'Integrations', 'Changelog'].map((l) => (
                <a key={l} href="#features" style={{ display: 'block', padding: '6px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>{l}</a>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Portals</div>
              <a href="/login" style={{ display: 'block', padding: '6px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>Shop Owner Login</a>
              <a href="/staff/login" style={{ display: 'block', padding: '6px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>Staff Terminal</a>
              <a href="/admin/login" style={{ display: 'block', padding: '6px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>Admin Portal</a>
              <a href="/status" style={{ display: 'block', padding: '6px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>Track Order Status</a>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Company</div>
              {['About', 'Careers', 'Blog', 'Contact', 'Privacy Policy'].map((l) => (
                <a key={l} href="#features" style={{ display: 'block', padding: '6px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>{l}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} StiQR Technologies. All rights reserved.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-disabled)' }}>
              <Lock size={13} /> Secure · SOC2-ready · Made with <span style={{ color: '#f97316' }}>♥</span> for mobile shops
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
