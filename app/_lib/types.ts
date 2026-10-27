export type Role = 'owner' | 'manager' | 'handyman' | 'tenant';

export interface User {
  id: string;
  name: string;
  role: Role;
  unit?: string;
  avatar: string;
}

// ── Financials (Owner) ──────────────────────────────────────────────
export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface RentRecord {
  id: string;
  tenantName: string;
  unit: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface Contractor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  rating: number;
  lastHired?: string;
  status: 'active' | 'inactive';
}

// ── Maintenance (Manager / Handyman) ───────────────────────────────
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  unit: string;
  tenantName: string;
  submittedDate: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo?: string;
  category: string;
  photos?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: Priority;
  author: string;
}

export interface MaterialLog {
  id: string;
  ticketId: string;
  item: string;
  quantity: number;
  unitCost: number;
  date: string;
}

// ── Tenant ──────────────────────────────────────────────────────────
export interface PaymentRecord {
  id: string;
  month: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  method?: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface RepairRequest {
  id: string;
  title: string;
  description: string;
  submittedDate: string;
  status: TicketStatus;
  priority: Priority;
  photos?: string[];
  updates: { date: string; message: string }[];
}
