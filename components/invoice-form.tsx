'use client';
import { useLang } from '@/contexts/i18n-context';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Invoice, InvoiceItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/patient-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { usePatients } from '@/hooks/use-patients';

interface InvoiceFormProps {
  invoice?: Invoice;
  onSubmit: (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function InvoiceForm({ invoice, onSubmit, onCancel }: InvoiceFormProps) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const { patients } = usePatients();
  
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm({
    defaultValues: invoice ? {
      patientId: invoice.patientId,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod ?? 'efectivo',
      notes: invoice.notes || '',
      items: invoice.items,
    } : {
      status: 'pending',
      paymentMethod: 'efectivo',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');
  const selectedPatientId = watch('patientId');
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Calculate totals
  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
  const tax = subtotal * 0.16; // 16% tax
  const total = subtotal + tax;

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : '';
      
      // Update item totals
      const updatedItems = data.items.map((item: InvoiceItem) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      }));

      await onSubmit({
        ...data,
        patientName,
        items: updatedItems,
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        total: Number(total) || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    append({ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 });
  };

  const updateItemTotal = (index: number, quantity: number, unitPrice: number) => {
    setValue(`items.${index}.total`, quantity * unitPrice);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {invoice ? 'Editar Factura' : 'Nueva Factura'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patientId">{t('Clienta')}</Label>
              <PatientCombobox
              patients={patients}
              value={selectedPatientId || ''}
              onValueChange={(value) => setValue('patientId', value)}
            />
              {errors.patientId && (
                <p className="text-sm text-red-600 mt-1">Debe seleccionar una clienta</p>
              )}
            </div>

            <div>
              <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate', { required: 'La fecha de vencimiento es requerida' })}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600 mt-1">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Servicios/Productos</Label>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => remove(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor={`items.${index}.description`}>{t('Descripción')}</Label>
                      <Input
                        {...register(`items.${index}.description`, { required: 'La descripción es requerida' })}
                        placeholder="Descripción del servicio/producto"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`items.${index}.quantity`}>Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`, { 
                          required: 'La cantidad es requerida',
                          onChange: (e) => {
                            const quantity = parseInt(e.target.value) || 0;
                            const unitPrice = watchedItems[index]?.unitPrice || 0;
                            updateItemTotal(index, quantity, unitPrice);
                          }
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`items.${index}.unitPrice`}>Precio Unitario</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${index}.unitPrice`, { 
                          required: 'El precio es requerido',
                          onChange: (e) => {
                            const unitPrice = parseFloat(e.target.value) || 0;
                            const quantity = watchedItems[index]?.quantity || 0;
                            updateItemTotal(index, quantity, unitPrice);
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 text-right">
                    <p className="text-sm text-gray-600">
                      Total: ${((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0)).toFixed(2)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Totals */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuestos (16%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select onValueChange={(value) => setValue('status', value)} defaultValue={invoice.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado de la factura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('Pendiente')}</SelectItem>
                    <SelectItem value="paid">{t('Pagada')}</SelectItem>
                    <SelectItem value="overdue">{t('Vencida')}</SelectItem>
                    <SelectItem value="cancelled">{t('Cancelada')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentMethod">Método de pago</Label>
                <Select
                  onValueChange={(value) => setValue('paymentMethod', value)}
                  defaultValue={invoice.paymentMethod ?? 'efectivo'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="punto">Punto de venta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Al marcar la factura como pagada, el cobro entra a Caja con este método.
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notas adicionales para la factura..."
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : (invoice ? 'Actualizar' : 'Crear')} Factura
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}