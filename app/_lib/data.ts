import type {
  User,
  Expense,
  RentRecord,
  Contractor,
  MaintenanceTicket,
  Announcement,
  MaterialLog,
  PaymentRecord,
  RepairRequest,
} from './types';

// ── Users ────────────────────────────────────────────────────────────
export const USERS: User[] = [
  { id: 'u1', name: 'Margaret Santos', role: 'owner',    avatar: 'MS' },
  { id: 'u2', name: 'Carlos Reyes',    role: 'manager',  avatar: 'CR' },
  { id: 'u3', name: 'Ben Flores',      role: 'handyman', avatar: 'BF' },
  { id: 'u4', name: 'Ana Cruz',        role: 'tenant',   unit: '3B', avatar: 'AC' },
];

// ── Expenses (Owner) ─────────────────────────────────────────────────
export const EXPENSES: Expense[] = [
  { id: 'e1', category: 'Structural',  description: 'Roof repair – east wing',        amount: 45000, date: '2026-09-10', status: 'paid' },
  { id: 'e2', category: 'Electrical',  description: 'Panel upgrade – Building A',     amount: 28000, date: '2026-09-22', status: 'paid' },
  { id: 'e3', category: 'Plumbing',    description: 'Main water line inspection',     amount: 8500,  date: '2026-10-01', status: 'pending' },
  { id: 'e4', category: 'Structural',  description: 'Parking lot resurfacing',        amount: 62000, date: '2026-10-15', status: 'pending' },
  { id: 'e5', category: 'Landscaping', description: 'Monthly grounds maintenance',    amount: 4200,  date: '2026-09-30', status: 'paid' },
  { id: 'e6', category: 'Security',    description: 'CCTV system upgrade',            amount: 15000, date: '2026-08-20', status: 'paid' },
  { id: 'e7', category: 'Elevator',    description: 'Elevator B annual certification',amount: 9800,  date: '2026-10-05', status: 'overdue' },
];

// ── Rent Records (Owner) ─────────────────────────────────────────────
export const RENT_RECORDS: RentRecord[] = [
  { id: 'r1',  tenantName: 'Ana Cruz',      unit: '3B', amount: 18000, dueDate: '2026-10-05', paidDate: '2026-10-04', status: 'paid' },
  { id: 'r2',  tenantName: 'James Tan',     unit: '1A', amount: 22000, dueDate: '2026-10-05', paidDate: '2026-10-03', status: 'paid' },
  { id: 'r3',  tenantName: 'Liza Gomez',    unit: '2C', amount: 18000, dueDate: '2026-10-05',                         status: 'pending' },
  { id: 'r4',  tenantName: 'Mark Villena',  unit: '4D', amount: 20000, dueDate: '2026-10-05',                         status: 'pending' },
  { id: 'r5',  tenantName: 'Rita Aquino',   unit: '5A', amount: 25000, dueDate: '2026-09-05',                         status: 'overdue' },
  { id: 'r6',  tenantName: 'Dante Lim',     unit: '2A', amount: 18000, dueDate: '2026-10-05', paidDate: '2026-10-01', status: 'paid' },
  { id: 'r7',  tenantName: 'Carla Navarro', unit: '6B', amount: 19000, dueDate: '2026-10-05',                         status: 'pending' },
  { id: 'r8',  tenantName: 'Felix Ramos',   unit: '1C', amount: 17000, dueDate: '2026-09-05',                         status: 'overdue' },
];

// ── Contractors (Owner) ──────────────────────────────────────────────
export const CONTRACTORS: Contractor[] = [
  { id: 'c1', name: 'ProBuild PH',       specialty: 'Structural & Civil',   phone: '0917-111-2222', email: 'info@probuildph.com',      rating: 4.8, lastHired: '2026-09-10', status: 'active' },
  { id: 'c2', name: 'Voltcare Electric', specialty: 'Electrical',           phone: '0918-333-4444', email: 'service@voltcare.ph',       rating: 4.6, lastHired: '2026-09-22', status: 'active' },
  { id: 'c3', name: 'AquaFix Solutions', specialty: 'Plumbing',             phone: '0919-555-6666', email: 'aquafix@solutions.ph',      rating: 4.5, lastHired: '2026-08-15', status: 'active' },
  { id: 'c4', name: 'GreenScape PH',     specialty: 'Landscaping',          phone: '0920-777-8888', email: 'hello@greenscapeph.com',    rating: 4.3, lastHired: '2026-09-30', status: 'active' },
  { id: 'c5', name: 'SecureView CCTV',   specialty: 'Security Systems',     phone: '0921-999-0000', email: 'sales@secureviewcctv.com',  rating: 4.7, lastHired: '2026-08-20', status: 'inactive' },
  { id: 'c6', name: 'LiftMaster PH',     specialty: 'Elevator Maintenance', phone: '0922-123-4567', email: 'support@liftmasterph.com',  rating: 4.4, lastHired: '2026-07-10', status: 'active' },
];

// ── Maintenance Tickets (Manager / Handyman) ─────────────────────────
export const TICKETS: MaintenanceTicket[] = [
  {
    id: 't1', title: 'Leaking kitchen faucet',
    description: 'The kitchen faucet drips continuously even when fully closed.',
    unit: '3B', tenantName: 'Ana Cruz', submittedDate: '2026-10-04',
    priority: 'medium', status: 'in_progress', assignedTo: 'Ben Flores',
    category: 'Plumbing', photos: [],
  },
  {
    id: 't2', title: 'Broken AC unit',
    description: 'Air conditioner in the bedroom is not cooling at all.',
    unit: '2C', tenantName: 'Liza Gomez', submittedDate: '2026-10-03',
    priority: 'high', status: 'assigned', assignedTo: 'Ben Flores',
    category: 'Appliance', photos: [],
  },
  {
    id: 't3', title: 'Hallway light flicker – Floor 4',
    description: 'Fluorescent lights in the 4th floor hallway flicker constantly.',
    unit: 'Common Area', tenantName: 'Mark Villena', submittedDate: '2026-10-02',
    priority: 'low', status: 'open',
    category: 'Electrical', photos: [],
  },
  {
    id: 't4', title: 'Elevator B malfunction',
    description: 'Elevator B stops between floors 2 and 3. Very dangerous.',
    unit: 'Common Area', tenantName: 'Rita Aquino', submittedDate: '2026-10-01',
    priority: 'urgent', status: 'in_progress', assignedTo: 'Ben Flores',
    category: 'Elevator', photos: [],
  },
  {
    id: 't5', title: 'Clogged bathroom drain',
    description: 'Water accumulates in the shower; drain is fully blocked.',
    unit: '1A', tenantName: 'James Tan', submittedDate: '2026-09-30',
    priority: 'medium', status: 'resolved', assignedTo: 'Ben Flores',
    category: 'Plumbing', photos: [],
  },
  {
    id: 't6', title: 'Broken window latch – Unit 6B',
    description: 'The latch on the living room window is broken; window won\'t stay closed.',
    unit: '6B', tenantName: 'Carla Navarro', submittedDate: '2026-10-05',
    priority: 'medium', status: 'open',
    category: 'Structural', photos: [],
  },
];

// ── Announcements (Manager) ──────────────────────────────────────────
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1', title: 'Water Supply Interruption – Oct 8',
    content: 'Scheduled water supply maintenance on October 8 from 8 AM to 12 PM. Please store water in advance.',
    date: '2026-10-05', priority: 'urgent', author: 'Carlos Reyes',
  },
  {
    id: 'a2', title: 'Elevator B Out of Service',
    content: 'Elevator B is temporarily out of service for urgent repairs. Please use Elevator A in the meantime.',
    date: '2026-10-01', priority: 'high', author: 'Carlos Reyes',
  },
  {
    id: 'a3', title: 'Monthly Association Dues – Due Oct 10',
    content: 'Reminder: Monthly association dues are due on October 10. Please pay at the admin office or via GCash.',
    date: '2026-09-30', priority: 'medium', author: 'Carlos Reyes',
  },
  {
    id: 'a4', title: 'Lobby Renovation – Nov 1 to Nov 15',
    content: 'The main lobby will undergo renovation from November 1 to 15. Use the side entrance during this period.',
    date: '2026-09-28', priority: 'low', author: 'Carlos Reyes',
  },
];

// ── Material Logs (Handyman) ─────────────────────────────────────────
export const MATERIAL_LOGS: MaterialLog[] = [
  { id: 'm1', ticketId: 't1', item: 'Faucet washer set',        quantity: 2,  unitCost: 85,   date: '2026-10-04' },
  { id: 'm2', ticketId: 't1', item: 'Plumber\'s tape',          quantity: 1,  unitCost: 45,   date: '2026-10-04' },
  { id: 'm3', ticketId: 't4', item: 'Elevator cable clamp',     quantity: 4,  unitCost: 380,  date: '2026-10-02' },
  { id: 'm4', ticketId: 't4', item: 'Lubricating oil (500ml)',  quantity: 2,  unitCost: 220,  date: '2026-10-02' },
  { id: 'm5', ticketId: 't5', item: 'Drain snake (3m)',         quantity: 1,  unitCost: 650,  date: '2026-09-30' },
  { id: 'm6', ticketId: 't5', item: 'Chemical drain cleaner',   quantity: 3,  unitCost: 120,  date: '2026-09-30' },
  { id: 'm7', ticketId: 't2', item: 'AC refrigerant R-410A',    quantity: 1,  unitCost: 1200, date: '2026-10-03' },
];

// ── Tenant Payment Records ───────────────────────────────────────────
export const PAYMENT_RECORDS: PaymentRecord[] = [
  { id: 'p1', month: 'October 2026',   amount: 18000, dueDate: '2026-10-05', paidDate: '2026-10-04', method: 'GCash',         status: 'paid' },
  { id: 'p2', month: 'September 2026', amount: 18000, dueDate: '2026-09-05', paidDate: '2026-09-04', method: 'Bank Transfer',  status: 'paid' },
  { id: 'p3', month: 'August 2026',    amount: 18000, dueDate: '2026-08-05', paidDate: '2026-08-05', method: 'GCash',         status: 'paid' },
  { id: 'p4', month: 'July 2026',      amount: 18000, dueDate: '2026-07-05', paidDate: '2026-07-03', method: 'Cash',          status: 'paid' },
  { id: 'p5', month: 'November 2026',  amount: 18000, dueDate: '2026-11-05',                                                   status: 'pending' },
];

// ── Tenant Repair Requests ───────────────────────────────────────────
export const REPAIR_REQUESTS: RepairRequest[] = [
  {
    id: 'rr1', title: 'Leaking kitchen faucet',
    description: 'Kitchen faucet has been dripping non-stop for 3 days. Wasting a lot of water.',
    submittedDate: '2026-10-04', status: 'in_progress', priority: 'medium',
    photos: [],
    updates: [
      { date: '2026-10-04', message: 'Request received and logged.' },
      { date: '2026-10-05', message: 'Assigned to Ben Flores. Scheduled for Oct 6.' },
    ],
  },
  {
    id: 'rr2', title: 'Bedroom ceiling paint peeling',
    description: 'Paint on the bedroom ceiling is peeling and small chunks are falling.',
    submittedDate: '2026-09-20', status: 'resolved', priority: 'low',
    photos: [],
    updates: [
      { date: '2026-09-20', message: 'Request received and logged.' },
      { date: '2026-09-22', message: 'Technician visited and assessed the area.' },
      { date: '2026-09-25', message: 'Repainting completed. Issue resolved.' },
    ],
  },
  {
    id: 'rr3', title: 'No hot water in shower',
    description: 'The water heater seems broken — no hot water since yesterday morning.',
    submittedDate: '2026-10-05', status: 'open', priority: 'high',
    photos: [],
    updates: [
      { date: '2026-10-05', message: 'Request received and pending review.' },
    ],
  },
];
