import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, ShieldOff, Key, Trash2 } from 'lucide-react';

const logs = [
  { id: 1, action: 'LOGIN',          actor: 'admin@stiqr.com',    target: '-',               detail: 'Admin logged in',              time: '2024-08-03 14:20' },
  { id: 2, action: 'USER_CREATE',    actor: 'admin@stiqr.com',    target: 'rajan@shop.com',  detail: 'Owner account created',        time: '2024-08-03 12:10' },
  { id: 3, action: 'USER_SUSPEND',   actor: 'admin@stiqr.com',    target: 'meena@shop.com',  detail: 'Owner suspended: Policy viol.',time: '2024-08-02 16:05' },
  { id: 4, action: 'PASS_RESET',     actor: 'admin@stiqr.com',    target: 'arjun@shop.com',  detail: 'Password reset',               time: '2024-08-02 11:30' },
  { id: 5, action: 'USER_DELETE',    actor: 'admin@stiqr.com',    target: 'old@shop.com',    detail: 'Owner and staff deleted',      time: '2024-08-01 09:15' },
  { id: 6, action: 'LOGIN',          actor: 'rajan@shop.com',     target: '-',               detail: 'Owner logged in',              time: '2024-08-01 08:00' },
];

const actionConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  LOGIN:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <LogIn size={13} /> },
  USER_CREATE:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: <UserPlus size={13} /> },
  USER_SUSPEND: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <ShieldOff size={13} /> },
  PASS_RESET:   { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: <Key size={13} /> },
  USER_DELETE:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <Trash2 size={13} /> },
};

const AuditLogs: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Audit Logs</h1>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <table>
        <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Detail</th><th>Timestamp</th></tr></thead>
        <tbody>
          {logs.map((log, i) => {
            const ac = actionConfig[log.action] || actionConfig.LOGIN;
            return (
              <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, background: ac.bg, color: ac.color, fontSize: 12, fontWeight: 700, width: 'fit-content' }}>{ac.icon}{log.action.replace('_', ' ')}</span></td>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-secondary)' }}>{log.actor}</td>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-muted)' }}>{log.target}</td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.detail}</td>
                <td style={{ fontSize: 12, color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>{log.time}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default AuditLogs;
