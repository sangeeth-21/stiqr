import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronRight, type LucideIcon } from 'lucide-react';
import { StiqrLogo } from '../UI/StiqrLogo';

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  path: string;
  end?: boolean;
}

interface SidebarProps {
  open: boolean;
  items: SidebarItem[];
  user?: { name?: string } | null;
  subtitle: string;
  roleLabel: string;
  roleIcon?: React.ReactNode;
  onLogout: () => void;
}

const SIDEBAR_WIDTH = 240;
const SIDEBAR_MINI_WIDTH = 88;

const Sidebar: React.FC<SidebarProps> = ({ open, items, user, subtitle, roleLabel, roleIcon, onLogout }) => {
  const userName = user?.name || roleLabel;
  const initial = user?.name?.[0]?.toUpperCase() || roleLabel[0]?.toUpperCase() || 'U';

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? SIDEBAR_WIDTH : SIDEBAR_MINI_WIDTH }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          padding: open ? '0 20px' : 0,
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          {open ? (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <StiqrLogo size={36} showText={true} subtitle={subtitle} animated={true} />
            </motion.div>
          ) : (
            <motion.div
              key="mini"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <StiqrLogo size={34} animated={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.end} title={item.label} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <motion.div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: open ? 'flex-start' : 'center',
                  gap: 11,
                  padding: open ? '11px 12px' : '12px 0',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent',
                  color: isActive ? '#f97316' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                <item.icon size={open ? 18 : 21} strokeWidth={isActive ? 2.5 : 2.1} />
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      style={{ fontSize: 14.5, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {open && isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    style={{ marginLeft: 'auto', display: 'flex' }}
                  >
                    <ChevronRight size={15} />
                  </motion.div>
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: User + Logout */}
      <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {/* User card with logout */}
        <div
          title={open ? undefined : userName}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'flex-start' : 'center',
            gap: 10,
            padding: open ? '8px 8px 8px 10px' : '10px',
            borderRadius: 12,
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.15)',
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}
          >
            {initial}
          </div>

          {open && (
            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {roleIcon}
                <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>{roleLabel}</span>
              </div>
            </div>
          )}

          {open && (
            <motion.button
              type="button"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: '1px solid transparent',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
              }}
            >
              <LogOut size={15} />
            </motion.button>
          )}
        </div>

        {/* Logout (collapsed: icon-only button below the card) */}
        {!open && (
          <motion.button
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <LogOut size={20} />
          </motion.button>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
