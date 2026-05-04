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
import { GripVertical, Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import platforms, { getPlatform } from "../../lib/platforms";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SkeletonLoader from "../../components/ui/SkeletonLoader";
import toast from "react-hot-toast";

function SortableLink({ link, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: link.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const platform = getPlatform(link.platform);
  const Icon = platform.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3.5 rounded-lg bg-[#111827] border border-white/[0.04] group hover:border-white/[0.08] transition-colors ${
        link.active === false ? "opacity-50" : ""
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[#3d4f63] hover:text-white transition-colors">
        <GripVertical size={18} />
      </button>
      <div className="w-9 h-9 rounded-lg bg-[#2563eb]/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[#2563eb]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{link.title || platform.label}</p>
        <p className="text-xs text-[#8896ab] truncate">{link.url}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onToggle(link)} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all" title={link.active === false ? "Enable" : "Disable"}>
          {link.active === false ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button onClick={() => onEdit(link)} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all" title="Edit">
          <Pencil size={14} />
        </button>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/[0.06] transition-all" title="Open">
          <ExternalLink size={14} />
        </a>
        <button onClick={() => onDelete(link)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all" title="Delete">
          <Trash2 size={14} />
        </button>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Links
        </h2>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors"
        >
          <Plus size={16} />
          Add Link
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-xl bg-[#111827] border border-white/[0.04] space-y-4">
          <div>
            <label className="block text-sm text-[#8896ab] mb-2 font-medium">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#8896ab] mb-2 font-medium">Title (optional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={getPlatform(form.platform).label}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8896ab] mb-1.5">URL</label>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder={getPlatform(form.platform).placeholder}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : editingLink ? "Update" : "Add"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-lg border border-white/[0.06] text-sm text-[#8896ab] hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Links List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
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
        <div className="text-center py-16">
          <p className="text-[#8896ab] mb-4">No links yet. Add your first link!</p>
          <button
            onClick={openAddForm}
            className="px-5 py-2.5 rounded-lg bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors"
          >
            Add Your First Link
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Link"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this link"}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
