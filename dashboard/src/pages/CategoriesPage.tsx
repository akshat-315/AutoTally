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
        <Button variant="ghost" size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create Category
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create one to start organizing your transactions."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group relative rounded-lg p-4 shadow-[0_0_0_1px_var(--color-border)] bg-card cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => navigate(`/category/${cat.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  {cat.icon && (
                    <span className="text-lg">{cat.icon}</span>
                  )}
                  <span className="text-sm font-semibold">{cat.name}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-accent"
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
              {cat.description && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                  {cat.description}
                </p>
              )}
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>{cat.transaction_count} transactions</span>
                <span>{formatCurrency(cat.total_debited)} spent</span>
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
