'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Patient } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PatientComboboxProps {
  patients: Patient[];
  value: string;
  onValueChange: (patientId: string) => void;
  placeholder?: string;
}

/**
 * Buscador de clienta (combobox): imprescindible con cientos/miles de clientas,
 * donde un <Select> plano es inusable. Busca por nombre, teléfono y email.
 */
export function PatientCombobox({ patients, value, onValueChange, placeholder = 'Buscar clienta por nombre, teléfono o email…' }: PatientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = patients.find(p => p.id === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? patients.filter(p =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : patients;
    return base.slice(0, 50);
  }, [patients, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal min-h-[40px]',
            !selected && 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {selected
              ? `${selected.firstName} ${selected.lastName}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, teléfono o email…"
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-64">
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No se encontraron clientas
              </p>
            ) : (
              <CommandGroup>
                {results.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={() => {
                      onValueChange(patient.id);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="min-h-[44px]"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        patient.id === value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {patient.phone} · {patient.email}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {patients.length > 50 && (
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Mostrando {results.length} de {patients.length} clientas — refiná la búsqueda
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
