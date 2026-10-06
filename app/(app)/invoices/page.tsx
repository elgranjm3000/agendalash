'use client';
import { useLang } from '@/contexts/i18n-context';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit,
  Printer, 
  Trash2, 
  User,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoices } from '@/hooks/use-invoices';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { formatMoney } from '@/lib/format';

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  pending: 'Pendiente',
  paid: 'Pagada',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
};

export default function InvoicesPage() {
  const { t } = useLang();
  const { invoices, loading, deleteInvoice } = useInvoices();
  const { currency } = useOrgSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDeleteInvoice = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta factura?')) {
      deleteInvoice(id);
    }
  };

  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const pendingAmount = invoices
    .filter(invoice => invoice.status === 'pending')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-rose-600" />
            Facturación
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona todas las facturas y pagos
          </p>
        </div>
        <Link href="/invoices/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('Ingresos Totales')}</p>
                <p className="text-3xl font-bold text-gray-900">{formatMoney(totalRevenue, currency)}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('Pendientes de Pago')}</p>
                <p className="text-3xl font-bold text-gray-900">{formatMoney(pendingAmount, currency)}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <CreditCard className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('Total Facturas')}</p>
                <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <div className="p-3 rounded-full bg-rose-100">
                <CreditCard className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('Buscar por paciente o número de factura...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Todos los estados')}</SelectItem>
                <SelectItem value="pending">{t('Pendiente')}</SelectItem>
                <SelectItem value="paid">{t('Pagada')}</SelectItem>
                <SelectItem value="overdue">{t('Vencida')}</SelectItem>
                <SelectItem value="cancelled">{t('Cancelada')}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron facturas' 
                : 'No hay facturas registradas'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando la primera factura'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link href="/invoices/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Factura
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Factura #{invoice.id.slice(-8).toUpperCase()}
                      </h3>
                      <Badge className={statusColors[invoice.status]}>
                        {statusLabels[invoice.status]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span>{invoice.patientName}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          Creada: {format(new Date(invoice.createdAt), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          Vence: {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">{t('Subtotal')}</p>
                        <p className="font-medium tabular-nums">{formatMoney(invoice.subtotal, currency)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t('Impuestos')}</p>
                        <p className="font-medium tabular-nums">{formatMoney(invoice.tax, currency)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t('Total')}</p>
                        <p className="font-bold text-lg tabular-nums">{formatMoney(invoice.total, currency)}</p>
                      </div>
                    </div>

                    {invoice.notes && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 truncate">{invoice.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/invoices/${invoice.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="Imprimir PDF"
                    >
                      <Link href={`/invoices/${invoice.id}/print`}>
                        <Printer className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}