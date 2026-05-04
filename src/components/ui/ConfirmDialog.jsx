export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/[0.04] rounded-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h3>
        <p className="text-[#8896ab] text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border border-white/[0.06] text-[#8896ab] hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
