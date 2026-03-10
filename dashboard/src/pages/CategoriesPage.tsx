import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCategories,
  fetchCategoryMerchants,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";
import type { Category, MerchantItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import CategoryFormDialog from "@/components/categories/CategoryFormDialog";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetchCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setMerchantsLoading(true);
    try {
      const data = await fetchCategoryMerchants(id);
      setMerchants(data);
    } finally {
      setMerchantsLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; icon: string; description: string }) => {
    await createCategory(data);
    load();
  };

  const handleEdit = async (data: { name: string; icon: string; description: string }) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, data);
    load();
  };

  const handleDelete = async (id: number) => {
    await deleteCategory(id);
    setDeleteConfirm(null);
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const openCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <Button onClick={openCreate}>Create Category</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          No categories yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id}>
              <Card
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => handleExpand(cat.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {cat.icon && <span className="text-lg">{cat.icon}</span>}
                      {cat.name}
                    </CardTitle>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="xs" onClick={(e) => openEdit(cat, e)}>
                        Edit
                      </Button>
                      {deleteConfirm === cat.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => handleDelete(cat.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-destructive"
                          onClick={() => setDeleteConfirm(cat.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground mb-2">{cat.description}</p>
                  )}
                  <div className="flex gap-3 text-sm">
                    <Badge variant="secondary">{cat.transaction_count} txns</Badge>
                    <Badge variant="outline">{formatCurrency(cat.total_debited)} spent</Badge>
                  </div>
                  <div className="mt-2">
                    <Link
                      to={`/category/${cat.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View details
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {expandedId === cat.id && (
                <div className="mt-2 rounded-md border bg-muted/30 p-3">
                  <h3 className="text-sm font-medium mb-2">Merchants in {cat.name}</h3>
                  {merchantsLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : merchants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No merchants tagged yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {merchants.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted"
                        >
                          <Link
                            to={`/merchant/${m.id}`}
                            className="hover:underline"
                          >
                            {m.display_name || m.name}
                          </Link>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {m.transaction_count} txns
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={editingCategory ? handleEdit : handleCreate}
        initial={editingCategory ?? undefined}
        title={editingCategory ? "Edit Category" : "Create Category"}
      />
    </div>
  );
}
