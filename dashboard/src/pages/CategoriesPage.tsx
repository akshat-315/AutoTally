import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import CategoryFormDialog from "@/components/categories/CategoryFormDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

const CARD_COLORS = [
  "from-chart-1/8 to-transparent",
  "from-chart-2/8 to-transparent",
  "from-chart-3/8 to-transparent",
  "from-chart-4/8 to-transparent",
  "from-chart-5/8 to-transparent",
];

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
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
    load();
  };

  const openCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Category
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create one to start organizing your transactions."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className={`group relative rounded-xl border border-border bg-gradient-to-br ${CARD_COLORS[i % CARD_COLORS.length]} bg-card p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
              onClick={() => navigate(`/category/${cat.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {cat.icon ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border text-lg shadow-sm">
                      {cat.icon}
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                      {cat.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => openEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {deleteConfirm === cat.id ? (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Confirm delete
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteConfirm(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="tabular-nums">{cat.transaction_count} txns</span>
                  <span className="tabular-nums font-medium text-foreground">{formatCurrency(cat.total_debited)}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
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
