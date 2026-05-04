import { useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
} from "lucide-react";
import platforms, { getPlatform } from "../../lib/platforms";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SkeletonLoader from "../../components/ui/SkeletonLoader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Card from "../../components/ui/Card";
import IconButton from "../../components/ui/IconButton";
import toast from "react-hot-toast";

function SortableLink({ link, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const platform = getPlatform(link.platform);
  const Icon = platform.icon;
  const inactive = link.active === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-card border border-line transition-colors ${
        inactive ? "opacity-60" : "hover:border-line-strong"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Drag to reorder"
        className="dnd-handle cursor-grab active:cursor-grabbing text-faint hover:text-fg transition-colors p-1 -ml-1"
      >
        <GripVertical size={18} />
      </button>
      <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand grid place-items-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {link.title || platform.label}
        </p>
        <p className="text-xs text-muted truncate">{link.url}</p>
      </div>
      <div className="flex items-center gap-0.5">
        <IconButton
          aria-label={inactive ? "Enable link" : "Disable link"}
          title={inactive ? "Enable" : "Disable"}
          onClick={() => onToggle(link)}
          size="sm"
        >
          {inactive ? <EyeOff size={14} /> : <Eye size={14} />}
        </IconButton>
        <IconButton
          aria-label="Edit link"
          title="Edit"
          onClick={() => onEdit(link)}
          size="sm"
        >
          <Pencil size={14} />
        </IconButton>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open link"
          title="Open"
          className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi transition-colors"
        >
          <ExternalLink size={14} />
        </a>
        <IconButton
          aria-label="Delete link"
          title="Delete"
          onClick={() => onDelete(link)}
          variant="danger"
          size="sm"
        >
          <Trash2 size={14} />
        </IconButton>
      </div>
    </div>
  );
}

export default function LinksSection() {
  const { user, links } = useOutletContext();
  const [editingLink, setEditingLink] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "linkedin", title: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = links.findIndex((l) => l.id === active.id);
      const newIndex = links.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(links, oldIndex, newIndex);

      const batch = writeBatch(db);
      reordered.forEach((link, i) => {
        batch.update(doc(db, "links", link.id), { order: i });
      });
      try {
        await batch.commit();
      } catch {
        toast.error("Failed to reorder");
      }
    },
    [links]
  );

  function openAddForm() {
    setEditingLink(null);
    setForm({ platform: "linkedin", title: "", url: "" });
    setShowForm(true);
  }

  function openEditForm(link) {
    setEditingLink(link);
    setForm({ platform: link.platform, title: link.title, url: link.url });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.url.trim()) {
      toast.error("URL is required");
      return;
    }
    setSaving(true);
    try {
      if (editingLink) {
        await updateDoc(doc(db, "links", editingLink.id), {
          platform: form.platform,
          title: form.title || getPlatform(form.platform).label,
          url: form.url,
        });
        toast.success("Link updated");
      } else {
        await addDoc(collection(db, "links"), {
          uid: user.uid,
          platform: form.platform,
          title: form.title || getPlatform(form.platform).label,
          url: form.url,
          iconSlug: form.platform,
          order: links.length,
          active: true,
          createdAt: serverTimestamp(),
        });
        toast.success("Link added");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "links", deleteTarget.id));
      toast.success("Link deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleToggle(link) {
    try {
      await updateDoc(doc(db, "links", link.id), {
        active: link.active === false ? true : false,
      });
    } catch {
      toast.error("Failed to update");
    }
  }

  if (!links) {
    return (
      <div className="space-y-4 max-w-2xl">
        <SkeletonLoader className="h-8 w-32" />
        <SkeletonLoader className="h-16 w-full" count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl pb-16 lg:pb-0">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Links
          </h2>
          <p className="text-sm text-muted mt-1">
            Drag to reorder. Toggle visibility without deleting.
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openAddForm}>
          Add link
        </Button>
      </header>

      {showForm && (
        <Card padding="lg" className="mb-6 space-y-4">
          <h3
            className="text-sm font-semibold tracking-wide uppercase text-faint"
          >
            {editingLink ? "Edit link" : "New link"}
          </h3>
          <Select
            label="Platform"
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
          >
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <Input
            label="Title (optional)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={getPlatform(form.platform).label}
          />
          <Input
            label="URL"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder={getPlatform(form.platform).placeholder}
          />
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} loading={saving}>
              {editingLink ? "Save changes" : "Add link"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={links.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {links.map((link) => (
              <SortableLink
                key={link.id}
                link={link}
                onEdit={openEditForm}
                onDelete={setDeleteTarget}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {links.length === 0 && !showForm && (
        <Card padding="xl" className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-soft text-brand grid place-items-center mx-auto mb-4">
            <Link2 size={22} />
          </div>
          <p
            className="text-lg font-semibold mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            No links yet
          </p>
          <p className="text-sm text-muted mb-6 max-w-xs mx-auto">
            Add your socials, portfolio, contact info, or anything you want to share with one tap.
          </p>
          <Button leftIcon={<Plus size={16} />} onClick={openAddForm}>
            Add your first link
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete link"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this link"}"? This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
