'use client';
import { useLang } from '@/contexts/i18n-context';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building,
  Hospital,
  Stethoscope,
  Plus,
  Edit,
  Search,
  Power,
  Trash2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganizations } from '@/hooks/use-organizations';
import { OrganizationType } from '@/lib/types';

const typeConfig: Record<OrganizationType, { label: string; icon: typeof Hospital; badge: string }> = {
  hospital: { label: 'Hospital', icon: Hospital, badge: 'bg-red-100 text-red-800' },
  clinic: { label: 'Clínica', icon: Building, badge: 'bg-rose-100 text-rose-800' },
  private_doctor: { label: 'Doctor Privado', icon: Stethoscope, badge: 'bg-emerald-100 text-emerald-800' },
};

export default function OrganizationsPage() {
  const { t } = useLang();
  const { organizations, loading, updateOrganization, deleteOrganization } = useOrganizations();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || org.type === typeFilter;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDeleteOrganization = async (id: string) => {
    if (confirm('¿Eliminar esta organización? Solo es posible si no tiene usuarios.')) {
      try {
        await deleteOrganization(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar');
      }
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateOrganization(id, { isActive: !isActive });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
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
            <Hospital className="h-8 w-8 text-rose-600" />
            Organizaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Hospitales, clínicas y doctores privados registrados en la plataforma
          </p>
        </div>
        <Link href="/organizations/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Organización
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
                placeholder={t('Buscar por nombre...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Todos los tipos')}</SelectItem>
                <SelectItem value="hospital">{t('Hospital')}</SelectItem>
                <SelectItem value="clinic">{t('Clínica')}</SelectItem>
                <SelectItem value="private_doctor">{t('Doctor Privado')}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
              }}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Grid */}
      {filteredOrganizations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Hospital className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || typeFilter !== 'all'
                ? 'No se encontraron organizaciones'
                : 'No hay organizaciones registradas'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || typeFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Crea la primera organización para comenzar'}
            </p>
            {!searchTerm && typeFilter === 'all' && (
              <Link href="/organizations/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Organización
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => {
            const typeInfo = typeConfig[org.type];
            const TypeIcon = typeInfo.icon;

            return (
              <Card key={org.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                        <TypeIcon className="h-5 w-5 text-rose-600" />
                      </div>
                      <CardTitle className="text-lg truncate">{org.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        title="Editar"
                      >
                        <Link href={`/organizations/${org.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(org.id, org.isActive)}
                        title={org.isActive ? 'Desactivar' : 'Activar'}
                      >
                        <Power className={`h-4 w-4 ${org.isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOrganization(org.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <Badge className={typeInfo.badge}>
                      {typeInfo.label}
                    </Badge>
                    <Badge variant={org.isActive ? 'default' : 'secondary'}>
                      {org.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Cada organización tiene su propio admin, usuarios, pacientes y datos aislados.
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Creada: {format(new Date(org.createdAt), 'dd MMM yyyy', { locale: es })}
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
