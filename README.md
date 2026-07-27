# Stiqr - Enterprise Multi-Platform Architecture

Welcome to **Stiqr**, an enterprise-grade multi-platform application suite designed for high scalability, real-time POS operations, cross-platform client delivery, and seamless cloud services integration.

---

## 🚀 Recommended Architecture & Tech Stack Matrix

| Workspace / Component | Recommended Framework | Description |
| :--- | :--- | :--- |
| **frontend** | Next.js 15 + React 19 + TypeScript + Tailwind CSS + shadcn/ui | Modern web application for Admin, Shop Portal, Customer Portal, POS Dashboard, SEO, PWA, server-side rendering, responsive UI, and excellent developer experience. |
| **backend** | NestJS + TypeScript + Prisma ORM + PostgreSQL + Redis | Enterprise-grade backend with REST APIs, JWT authentication, RBAC, validation, WebSockets, background jobs, caching, logging, rate limiting, and scalable architecture. |
| **mobile** | Flutter | Single codebase for Android and iOS applications with native performance, Material 3, responsive UI, offline support, push notifications, and biometric authentication. |
| **tablet** | Flutter | Optimized layouts for Android Tablets and iPad with adaptive UI, split-screen support, POS mode, barcode scanning, receipt printing, and large-screen experiences. |
| **ios** | Flutter (Recommended) or SwiftUI | Flutter is ideal for maintaining a single codebase across Android and iOS. Use SwiftUI only if you require Apple-exclusive features such as Dynamic Island, Apple Vision Pro integration, or advanced platform APIs. |
| **android** | Flutter | High-performance Android application with native APIs, biometric authentication, camera integration, NFC, barcode/QR scanning, Bluetooth, USB, and background services. |
| **desktop** | Flutter Desktop (Windows/macOS/Linux) | Cross-platform desktop application with one shared codebase, excellent performance, hardware integration, printing, POS peripherals, and lower resource usage than Electron. |
| **windows** | Flutter Windows | Native Windows desktop application supporting printers, barcode scanners, cash drawers, serial devices, USB peripherals, and offline-first capabilities. |
| **mac** | Flutter macOS or SwiftUI | Flutter macOS provides a shared codebase with other platforms. SwiftUI is recommended only when deep macOS integration or Apple-native functionality is required. |
| **linux** | Flutter Linux | Native Linux desktop application suitable for business environments, kiosks, POS systems, inventory management, and warehouse software. |
| **database** | PostgreSQL | Reliable enterprise relational database supporting ACID transactions, JSON, replication, partitioning, full-text search, and high scalability. |
| **orm** | Prisma ORM | Type-safe ORM with migrations, schema management, auto-generated TypeScript client, and optimized database access. |
| **cache** | Redis | High-speed in-memory caching for sessions, OTPs, queues, API caching, WebSockets, and performance optimization. |
| **storage** | Cloudflare R2 / Amazon S3 | Secure and scalable object storage for invoices, documents, product images, backups, and user uploads without managing file servers. |
| **authentication** | JWT + OAuth2 + Refresh Tokens + RBAC | Secure authentication with Google, Apple, email/password, OTP, role-based access control, session management, and optional multi-factor authentication. |
| **state management** | Riverpod (Flutter) + Zustand (React) | Lightweight, scalable, and highly maintainable state management for mobile, desktop, and web applications. |
| **api communication** | REST API + WebSockets + gRPC (optional) | REST for standard operations, WebSockets for live updates, and gRPC for high-performance service-to-service communication. |
| **queue/jobs** | BullMQ + Redis | Reliable background processing for emails, SMS, notifications, invoice generation, scheduled jobs, and reports. |
| **notifications** | Firebase Cloud Messaging (FCM) + APNs | Push notifications for Android, iOS, tablets, and desktop, with support for real-time alerts and promotional messages. |
| **payment gateway** | Razorpay + Cashfree + Stripe + PhonePe | Multi-provider payment processing supporting cards, UPI, wallets, subscriptions, refunds, and payment reconciliation. |
| **logging** | Pino + Winston | Structured application logging with centralized log management, monitoring, and debugging capabilities. |
| **monitoring** | Prometheus + Grafana + Sentry | Performance monitoring, metrics collection, crash reporting, and real-time alerting for production systems. |
| **search** | Meilisearch or Elasticsearch | Fast full-text search for products, customers, invoices, inventory, and application-wide search features. |
| **file processing** | Sharp + FFmpeg + PDFKit | Image optimization, video processing, PDF generation, invoice creation, and document handling. |
| **email service** | Resend + Amazon SES | Reliable transactional email delivery for OTPs, invoices, password resets, and customer communication. |
| **sms service** | MSG91 + Twilio | OTP verification, transaction alerts, and customer notifications with global SMS support. |
| **CI/CD** | GitHub Actions + Docker | Automated testing, building, deployment, and release management across all applications. |
| **containerization** | Docker + Docker Compose | Consistent development and production environments with simplified deployment and scaling. |
| **reverse proxy** | Nginx | Load balancing, SSL termination, API routing, compression, caching, and reverse proxy services. |
| **cloud platform** | Cloudflare + VPS (Hetzner/Contabo/AWS) | Global CDN, DDoS protection, DNS management, SSL, edge caching, and scalable infrastructure. |
| **analytics** | PostHog + Google Analytics 4 | User behavior tracking, product analytics, feature flags, and conversion monitoring. |
| **AI Integration** | OpenAI API + Ollama + LangChain | AI-powered chatbots, invoice analysis, customer support, product recommendations, OCR, and automation workflows. |
| **testing** | Jest + Playwright + Flutter Test | Unit testing, integration testing, end-to-end testing, UI testing, and automated quality assurance. |
| **monorepo** | Turborepo + pnpm | Efficient code sharing, faster builds, dependency management, and workspace organization for all applications. |

---

## 📁 Repository Structure

```
stiqr/
├── README.md                      # Master architecture & tech stack documentation
├── package.json                   # Root monorepo workspace configuration
├── turbo.json                     # Turborepo build pipeline config
├── docker-compose.yml             # Local infrastructure (PostgreSQL, Redis, Meilisearch)
│
├── frontend/                      # Web Application (Next.js 15 + React 19 + TypeScript)
├── backend/                       # Backend Microservice API (NestJS + Prisma + PostgreSQL)
├── mobile/                        # Cross-platform Mobile App (Flutter)
├── tablet/                        # Tablet & POS Optimized App (Flutter)
├── ios/                           # Native/Flutter iOS Application
├── android/                       # Native/Flutter Android Application
├── desktop/                       # Cross-Platform Desktop App (Flutter Desktop)
├── windows/                       # Windows Desktop Application (Flutter)
├── mac/                           # macOS Desktop Application (Flutter / SwiftUI)
└── linux/                         # Linux Desktop Application (Flutter)
```

---

## 🛠️ Quick Start Guide

### 1. Prerequisites
- **Node.js**: `v20+` & **pnpm**: `v9+`
- **Flutter SDK**: `v3.22+`
- **Docker Desktop**: For running PostgreSQL, Redis, and Meilisearch locally.

### 2. Infrastructure Setup
To spin up local PostgreSQL, Redis, and Meilisearch databases:
```bash
docker-compose up -d
```

### 3. Running Web & Backend
Install dependencies and launch services:
```bash
pnpm install
pnpm dev
```
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000/api`

### 4. Running Flutter Applications
Navigate to any target platform folder (`mobile`, `tablet`, `ios`, `android`, `desktop`, `windows`, `mac`, `linux`) and execute:
```bash
flutter run
```
