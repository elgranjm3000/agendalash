'use client';
import { useLang } from '@/contexts/i18n-context';

import { toast } from 'sonner';
import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Mail,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePatients } from '@/hooks/use-patients';
import { useAppointments } from '@/hooks/use-appointments';

export default function PatientsPage() {
  const { t } = useLang();
  const { patients, loading, deletePatient } = usePatients();
  const { getAppointmentsByPatient } = useAppointments();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const handleDeletePatient = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este paciente?')) {
      deletePatient(id)
        .then(() => toast.success(t('Paciente eliminado junto con sus citas, recetas y facturas')))
        .catch(() => toast.error(t('No se pudo eliminar. Intentá de nuevo.')));
    }
  };

  const getPatientStats = (patientId: string) => {
    const appointments = getAppointmentsByPatient(patientId);
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const upcoming = appointments.filter(apt => apt.status === 'scheduled').length;
    
    return { total: appointments.length, completed, upcoming };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
            <Users className="h-8 w-8 text-rose-600" />
            Pacientes
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona la información de todos los pacientes
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Paciente
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar pacientes por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Grid */}
      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza agregando tu primer paciente al sistema'
              }
            </p>
            {!searchTerm && (
              <Link href="/patients/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Paciente
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => {
            const stats = getPatientStats(patient.id);
            
            return (
              <Card key={patient.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {patient.firstName} {patient.lastName}
                    </CardTitle>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/patients/${patient.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePatient(patient.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Edad: {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} años
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{patient.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{stats.total} citas</span>
                    </div>
                    <div className="flex space-x-1">
                      {stats.upcoming > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {stats.upcoming} próximas
                        </Badge>
                      )}
                      {stats.completed > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {stats.completed} completadas
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Registrado: {format(new Date(patient.createdAt), 'dd MMM yyyy', { locale: es })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}