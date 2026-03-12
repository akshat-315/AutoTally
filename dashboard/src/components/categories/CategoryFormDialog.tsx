import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CategoryFormData {
  name: string;
  icon: string;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  initial?: { name: string; icon: string | null; description: string | null };
  title: string;
}

export default function CategoryFormDialog({ open, onClose, onSubmit, initial, title }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setIcon(initial?.icon ?? "");
      setDescription(initial?.description ?? "");
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), icon: icon.trim(), description: description.trim() });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <h2 className="text-lg font-semibold">{title}</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Food & Dining"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Icon</label>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="e.g. a single emoji"
            maxLength={4}
            className="w-24"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
