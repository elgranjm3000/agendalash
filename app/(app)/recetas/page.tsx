'use client';

import { useState } from 'react';
import { useLang } from '@/contexts/i18n-context';
import { useTreatmentRecipes } from '@/hooks/use-treatment-recipes';
import { useInventory } from '@/hooks/use-inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClipboardList, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { RecipeItem, TreatmentRecipe } from '@/lib/types';

/** Editor de receta: nombre, frecuencia semanal y filas de consumo por servicio. */
function RecipeForm({
  recipe,
  inventory,
  onSubmit,
  onCancel,
}: {
  recipe?: TreatmentRecipe;
  inventory: { id: string; name: string; unit: string }[];
  onSubmit: (data: Omit<TreatmentRecipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState(recipe?.name ?? '');
  const [servicesPerWeek, setServicesPerWeek] = useState(recipe?.servicesPerWeek ?? 0);
  const [active, setActive] = useState(recipe?.active ?? true);
  const [items, setItems] = useState<RecipeItem[]>(recipe?.items ?? []);
  const [saving, setSaving] = useState(false);

  const updateItem = (idx: number, patch: Partial<RecipeItem>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error(t('recipes.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        servicesPerWeek: Number(servicesPerWeek) || 0,
        active,
        items: items.filter(it => it.inventoryItemId && it.quantityPerService > 0),
      });
      toast.success(recipe ? t('recipes.updated') : t('recipes.created'));
      onCancel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recipe-name">{t('recipes.name')}</Label>
          <Input id="recipe-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('recipes.namePlaceholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe-spw">{t('recipes.servicesPerWeek')}</Label>
          <Input
            id="recipe-spw"
            type="number"
            min="0"
            step="1"
            value={servicesPerWeek}
            onChange={e => setServicesPerWeek(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('recipes.items')}</Label>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('recipes.noItems')}</p>
        )}
        <div className="space-y-2">
          {items.map((it, idx) => {
            const item = inventory.find(i => i.id === it.inventoryItemId);
            return (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={it.inventoryItemId ?? ''}
                  onChange={e => updateItem(idx, { inventoryItemId: e.target.value || null })}
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t('recipes.selectItem')}</option>
                  {inventory.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-24"
                  value={it.quantityPerService}
                  onChange={e => updateItem(idx, { quantityPerService: Number(e.target.value) })}
                />
                <span className="w-14 text-xs text-muted-foreground shrink-0">
                  {item?.unit ?? ''}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive"
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setItems(prev => [...prev, { inventoryItemId: null, quantityPerService: 0 }])}
          disabled={inventory.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />{t('recipes.addItem')}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch id="recipe-active" checked={active} onCheckedChange={setActive} />
          <Label htmlFor="recipe-active">{t('recipes.active')}</Label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{t('common.save')}</Button>
        </div>
      </div>
    </div>
  );
}

export default function RecetasPage() {
  const { t } = useLang();
  const { recipes, loading, addRecipe, updateRecipe, deleteRecipe } = useTreatmentRecipes();
  const { items: inventory } = useInventory();
  const [editing, setEditing] = useState<TreatmentRecipe | undefined>();
  const [creating, setCreating] = useState(false);

  const removeRecipe = async (r: TreatmentRecipe) => {
    if (!confirm(t('recipes.confirmDelete', { name: r.name }))) return;
    try {
      await deleteRecipe(r.id);
      toast.success(t('recipes.deleted'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('recipes.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('recipes.subtitle')}</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />{t('recipes.new')}</Button>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('recipes.new')}</DialogTitle>
            </DialogHeader>
            <RecipeForm
              inventory={inventory}
              onSubmit={addRecipe}
              onCancel={() => setCreating(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('recipes.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  <span className="truncate">{r.name}</span>
                  <Badge variant={r.active ? 'default' : 'secondary'}>
                    {r.active ? t('recipes.activeBadge') : t('recipes.inactiveBadge')}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t('recipes.servicesPerWeek')}: {r.servicesPerWeek}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm">
                  {r.items.length === 0 && (
                    <li className="text-muted-foreground">{t('recipes.noItems')}</li>
                  )}
                  {r.items.map((it, idx) => {
                    const inv = inventory.find(i => i.id === it.inventoryItemId);
                    return (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate">{inv?.name ?? '—'}</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {it.quantityPerService} {inv?.unit ?? ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end gap-1 border-t pt-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRecipe(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(undefined)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <RecipeForm
              recipe={editing}
              inventory={inventory}
              onSubmit={data => updateRecipe(editing.id, data)}
              onCancel={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
