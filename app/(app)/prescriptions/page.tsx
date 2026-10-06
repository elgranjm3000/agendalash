'use client';
import { useLang } from '@/contexts/i18n-context';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit,
  Printer, 
  Trash2, 
  User,
  Calendar,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrescriptions } from '@/hooks/use-prescriptions';
import { useAuth } from '@/contexts/auth-context';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  active: 'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export default function PrescriptionsPage() {
  const { t } = useLang();
  const { prescriptions, loading, deletePrescription } = usePrescriptions();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter prescriptions based on user role
  const userPrescriptions = user?.role === 'doctor' 
    ? prescriptions.filter(p => p.doctorId === user.id)
    : prescriptions;

  const filteredPrescriptions = userPrescriptions.filter(prescription => {
    const matchesSearch = 
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.medications.some(med => 
        med.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDeletePrescription = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta prescripción?')) {
      deletePrescription(id);
    }
  };

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
            <FileText className="h-8 w-8 text-rose-600" />
            Prescripciones Electrónicas
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona todas las prescripciones médicas
          </p>
        </div>
        <Link href="/prescriptions/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Prescripción
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por paciente, diagnóstico o medicamento..."
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
                <SelectItem value="active">{t('Activa')}</SelectItem>
                <SelectItem value="completed">{t('Completada')}</SelectItem>
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

      {/* Prescriptions List */}
      {filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron prescripciones' 
                : 'No hay prescripciones registradas'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando la primera prescripción médica'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link href="/prescriptions/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Prescripción
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {prescription.patientName}
                      </h3>
                      <Badge className={statusColors[prescription.status]}>
                        {statusLabels[prescription.status]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span>Dr. {prescription.doctorName}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {format(new Date(prescription.createdAt), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-1">Diagnóstico:</p>
                      <p className="text-sm text-gray-600">{prescription.diagnosis}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Medicamentos:</p>
                      <div className="space-y-1">
                        {prescription.medications.slice(0, 3).map((medication) => (
                          <div key={medication.id} className="text-sm text-gray-600">
                            <span className="font-medium">{medication.name}</span> - {medication.dosage} - {medication.frequency}
                          </div>
                        ))}
                        {prescription.medications.length > 3 && (
                          <p className="text-sm text-gray-500">
                            +{prescription.medications.length - 3} medicamentos más
                          </p>
                        )}
                      </div>
                    </div>

                    {prescription.instructions && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Instrucciones:</p>
                        <p className="text-sm text-gray-600 truncate">{prescription.instructions}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/prescriptions/${prescription.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="Imprimir PDF"
                    >
                      <Link href={`/prescriptions/${prescription.id}/print`}>
                        <Printer className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrescription(prescription.id)}
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