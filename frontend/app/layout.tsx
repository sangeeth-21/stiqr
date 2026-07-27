import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Stiqr Frontend - Next.js 15 & React 19',
  description: 'Enterprise Web Application for Stiqr Suite',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
