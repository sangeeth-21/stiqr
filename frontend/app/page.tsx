import React from 'react';

export default function HomePage() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)',
    }}>
      <div style={{
        padding: '3rem',
        borderRadius: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        maxWidth: '600px',
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          Hello World!
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
          Welcome to <strong>Stiqr Frontend Workspace</strong>
        </p>
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          backgroundColor: '#312e81',
          color: '#a5b4fc',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          Next.js 15 • React 19 • TypeScript • Tailwind CSS • Zustand
        </div>
      </div>
    </main>
  );
}
