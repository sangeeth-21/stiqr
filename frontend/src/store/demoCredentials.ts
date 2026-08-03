import type { User } from './authStore';

export interface DemoCredential {
  email: string;
  password: string;
  user: User;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    email: 'admin@stiqr.com',
    password: 'YourPassword@123',
    user: {
      id: 'demo-admin',
      name: 'Platform Admin',
      email: 'admin@stiqr.com',
      role: 'admin',
    },
  },
  {
    email: 'owner@example.com',
    password: 'Owner@1234',
    user: {
      id: 'demo-owner',
      name: 'Demo Owner',
      email: 'owner@example.com',
      role: 'owner',
      shopId: 'demo-shop',
      shopName: 'Mobile World',
    },
  },
  {
    email: 'alice@example.com',
    password: 'Staff@1234',
    user: {
      id: 'demo-staff',
      name: 'Alice Staff',
      email: 'alice@example.com',
      role: 'staff',
      shopId: 'demo-shop',
      shopName: 'Mobile World',
    },
  },
];

export const findDemoUser = (email: string, password: string): User | undefined => {
  const match = DEMO_CREDENTIALS.find(
    (d) => d.email.toLowerCase() === email.toLowerCase().trim() && d.password === password
  );
  return match?.user;
};
