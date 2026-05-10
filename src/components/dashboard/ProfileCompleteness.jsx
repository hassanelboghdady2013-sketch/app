import { Check, Circle } from "lucide-react";

/**
 * Six items make up a "complete" Mo Tech profile. The dashboard's
 * Profile tab nudges the user to fill them in via this widget — the
 * card auto-hides at 100% so well-set-up users never see it.
 *
 * The list is intentionally short: every entry is something a card
 * recipient sees on the public profile, not a hidden setting.
 */
function buildChecklist({ profile, links }) {
  const linkCount = (links || []).filter((l) => l.active !== false).length;
  return [
    {
      key: "avatar",
      label: "Add a profile photo",
      done: !!profile?.avatarUrl,
    },
    { key: "name", label: "Add your name", done: !!profile?.name?.trim() },
    {
      key: "title",
      label: "Add a title or role",
      done: !!profile?.title?.trim(),
    },
    { key: "bio", label: "Write a short bio", done: !!profile?.bio?.trim() },
    {
      key: "links",
      label: "Add at least one link",
      done: linkCount > 0,
    },
    {
      key: "theme",
      label: "Pick a theme",
      done: !!profile?.themeJson,
    },
  ];
}

export default function ProfileCompleteness({ profile, links }) {
  const checklist = buildChecklist({ profile, links });
  const total = checklist.length;
  const done = checklist.filter((i) => i.done).length;
  const percent = Math.round((done / total) * 100);
  // Hide once the profile is complete — no value in nagging users who
  // already filled everything in.
  if (percent >= 100) return null;

  return (
    <div className="mb-6 p-5 rounded-2xl bg-card border border-line">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold">Finish your profile</h3>
        <span className="text-xs font-mono text-muted">
          {done}/{total} ({percent}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-input overflow-hidden mb-4">
        <div
          className="h-full bg-brand transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {checklist.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-2 text-xs ${
              item.done ? "text-muted line-through" : "text-fg"
            }`}
          >
            {item.done ? (
              <Check size={14} className="text-success shrink-0" />
            ) : (
              <Circle size={14} className="text-faint shrink-0" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
