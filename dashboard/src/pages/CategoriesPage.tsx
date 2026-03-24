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
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

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
        <Button size="sm" onClick={openCreate} className="gap-1.5 text-[11px]">
          <Plus className="h-3.5 w-3.5" />
          New Category
        </Button>
      </div>

      {loading ? (
        <div className="border border-border rounded bg-card divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create one to start organizing your transactions."
        />
      ) : (
        <div className="border border-border rounded bg-card divide-y divide-border">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => navigate(`/category/${cat.id}`)}
            >
              {/* Icon */}
              <span className="text-lg w-8 text-center shrink-0">
                {cat.icon || cat.name.slice(0, 2).toUpperCase()}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[13px] font-semibold truncate">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="tabular-nums">{cat.transaction_count} txns</span>
                  <span className="font-serif tabular-nums">{formatCurrency(cat.total_debited)}</span>
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                >
                  <MoreHorizontal className="h-4 w-4" />
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
