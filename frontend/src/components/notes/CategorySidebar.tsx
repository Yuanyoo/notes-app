"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/useCategories";
import { useNotes } from "@/hooks/useNotes";
import { Category } from "@/types";

// Preset colors matching the Figma palette
const PRESET_COLORS = [
  "#ef9c66", // Random Thoughts (orange)
  "#fcdc94", // School (yellow)
  "#78aba8", // Personal (teal)
  "#d4a5c9", // Drama (pink)
  "#957139", "#b5835a", "#a3c4bc", "#f2c078",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: value === c ? "#957139" : "transparent",
            outline: value === c ? `2px solid ${c}` : "none",
            outlineOffset: "1px",
          }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

function CategoryFormDialog({
  trigger,
  initialName = "",
  initialColor = PRESET_COLORS[0],
  onSave,
  dialogTitle,
}: {
  trigger: React.ReactElement;
  initialName?: string;
  initialColor?: string;
  onSave: (name: string, color: string) => Promise<void>;
  dialogTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), color);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) { setName(initialName); setColor(initialColor); }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xs bg-[#faf1e3] border border-[#957139]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#88642a]">{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <Input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSave()}
            autoFocus
            className="border-[#957139] text-sm bg-transparent focus-visible:ring-[#957139]"
          />
          <div>
            <p className="text-xs text-[#957139] mb-1">Color</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-[#957139] text-[#957139] hover:bg-[#957139]/10 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="bg-[#957139] text-white hover:bg-[#88642a] text-xs"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const pathname = usePathname();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { data: notes = [] } = useNotes({ category: category.slug });

  const isActive = pathname === `/categories/${category.slug}`;

  const handleDelete = async () => {
    if (category.is_default) return;
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success("Category deleted");
    } catch {
      toast.error("Could not delete category");
    }
  };

  return (
    <div
      className={`group flex items-center gap-2 h-[32px] px-4 cursor-pointer transition-colors ${
        isActive ? "bg-[#957139]/10" : "hover:bg-[#957139]/5"
      }`}
    >
      <Link href={`/categories/${category.slug}`} className="flex items-center gap-2 flex-1 min-w-0">
        {/* Color dot */}
        <span
          className="w-[11px] h-[11px] rounded-full flex-shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-xs font-sans text-black flex-1 truncate">{category.name}</span>
        <span className="text-xs font-sans text-black">{notes.length || ""}</span>
      </Link>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <CategoryFormDialog
          dialogTitle="Edit category"
          initialName={category.name}
          initialColor={category.color}
          onSave={async (name, color) => {
            await updateCategory.mutateAsync({ id: category.id, name, color });
            toast.success("Category updated");
          }}
          trigger={
            <button className="w-5 h-5 flex items-center justify-center text-[#957139] hover:bg-[#957139]/10 rounded">
              <Pencil className="w-2.5 h-2.5" />
            </button>
          }
        />
        {!category.is_default && (
          <button
            className="w-5 h-5 flex items-center justify-center text-red-400 hover:bg-red-50 rounded"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function CategorySidebar() {
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const pathname = usePathname();
  const allActive = pathname === "/notes";

  return (
    <aside
      className="w-[288px] flex-shrink-0 flex flex-col h-full"
      style={{ background: "rgba(149,113,57,0.06)" }}
    >
      {/* Spacer matching Figma top offset */}
      <div className="h-[101px] shrink-0" />

      {/* "All Categories" header row */}
      <div
        className={`flex items-center justify-between h-[32px] px-4 transition-colors ${
          allActive ? "bg-[#957139]/10" : ""
        }`}
      >
        <Link href="/notes" className="text-xs font-sans font-bold text-black">
          All Categories
        </Link>
        <CategoryFormDialog
          dialogTitle="New category"
          onSave={async (name, color) => {
            await createCategory.mutateAsync({ name, color });
            toast.success("Category created");
          }}
          trigger={
            <button className="w-5 h-5 flex items-center justify-center text-[#957139] hover:bg-[#957139]/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-3 h-3" />
            </button>
          }
        />
      </div>

      {/* Category list */}
      <div className="flex flex-col">
        {isLoading ? (
          <div className="space-y-0.5 px-4 pt-1 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 rounded bg-[#957139]/10" />
            ))}
          </div>
        ) : (
          categories.map((cat) => <CategoryRow key={cat.id} category={cat} />)
        )}
      </div>

      {/* Add category button at bottom of list */}
      <div className="mt-2 px-4">
        <CategoryFormDialog
          dialogTitle="New category"
          onSave={async (name, color) => {
            await createCategory.mutateAsync({ name, color });
            toast.success("Category created");
          }}
          trigger={
            <button className="flex items-center gap-2 text-xs text-[#957139] hover:text-[#88642a] transition-colors py-1">
              <Plus className="w-3 h-3" />
              Add category
            </button>
          }
        />
      </div>
    </aside>
  );
}
