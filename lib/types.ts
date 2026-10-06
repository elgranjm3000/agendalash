export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'nurse' | 'receptionist';

export type OrganizationType = 'hospital' | 'clinic' | 'private_doctor';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  currency?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId?: string | null;
  avatar?: string | null;
  signature?: string | null;
  /** Datos transitorios de sesión: organización y prueba gratuita */
  organizationName?: string | null;
  organizationLogo?: string | null;
  trialEndsAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  organizationId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalHistory?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  organizationId?: string | null;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: 'consultation' | 'checkup' | 'procedure' | 'follow-up';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  organizationId?: string | null;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  recordId?: string | null;
  medications: Medication[];
  diagnosis: string;
  instructions: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  organizationId?: string | null;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  status?: 'triaje' | 'completada';
  triageLevel?: 'verde' | 'amarillo' | 'rojo' | null;
  motivo?: string;
  enfermedadActual?: string;
  bloodPressure?: string;
  heartRate?: number | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  oxygenSat?: number | null;
  diagnostico?: string;
  indicaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export type CashType = 'ingreso' | 'egreso';
export type CashMethod = 'efectivo' | 'punto' | 'transferencia' | 'otro';

export interface CashEntry {
  id: string;
  organizationId?: string | null;
  type: CashType;
  concept: string;
  amount: number;
  method: CashMethod;
  patientId?: string | null;
  patientName?: string | null;
  date: string;
  registeredBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'entrada' | 'salida';

export interface InventoryItem {
  id: string;
  organizationId?: string | null;
  name: string;
  category?: string;
  unit: string;
  stock: number;
  minStock: number;
  cost?: number | null;
  supplier?: string | null;
  /** Consumible de consulta: se descuenta 1 unidad al completar una cita */
  deductOnConsult?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Insumo del catálogo del proveedor (SKU global, stock en depósito) */
export interface LashProduct {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  cost?: number | null;
  supplier?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Ítem de una receta: cuánto consume un servicio de un insumo del salón */
export interface RecipeItem {
  id?: string;
  inventoryItemId: string | null;
  productId?: string | null;
  quantityPerService: number;
}

/** Receta de tratamiento (fórmula de consumo por servicio) */
export interface TreatmentRecipe {
  id: string;
  organizationId?: string | null;
  name: string;
  servicesPerWeek: number;
  active: boolean;
  items: RecipeItem[];
  createdAt: string;
  updatedAt: string;
}

/** Fila de la proyección de cobertura por insumo */
export interface CoverageRow {
  itemId: string;
  name: string;
  unit: string;
  stock: number;
  productId: string | null;
  sku: string | null;
  weeklyUsage: number;
  sessionsCovered: number;
  coverageDays: number | null;
  thresholdDays: number;
  level: 'ok' | 'warn' | 'critical';
}

export interface CoverageResponse {
  items?: CoverageRow[];
  supplier?: {
    productId: string;
    sku: string;
    name: string;
    unit: string;
    stock: number;
    minStock: number;
    networkWeeklyUsage: number;
    coverageDays: number | null;
  }[];
}

export interface StockMovement {
  id: string;
  organizationId?: string | null;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  reason?: string | null;
  date: string;
  registeredBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Invoice {
  id: string;
  organizationId?: string | null;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateUserState: (user: User) => void;
}