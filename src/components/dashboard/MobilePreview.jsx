import { getPlatform } from "../../lib/platforms";
import { getThemeCSS } from "../../lib/themes";

export default function MobilePreview({ profile, links }) {
  const theme = profile?.themeJson || null;
  const cssVars = getThemeCSS(theme);
  const visibleLinks = (links || []).filter((l) => l.active !== false);

  return (
    <div className="w-[280px] h-[560px] rounded-[2.5rem] border-[3px] border-line-strong bg-app-soft overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] relative">
      <div aria-hidden="true" className="h-6 bg-app flex items-center justify-center">
        <div className="w-16 h-3 rounded-full bg-card" />
      </div>

      <div
        className="h-[calc(100%-1.5rem)] overflow-y-auto p-4"
        style={{
          ...cssVars,
          backgroundColor: cssVars["--theme-bg"] || "var(--color-app)",
          fontFamily: cssVars["--theme-font"] || "var(--font-body)",
          color: cssVars["--theme-text"] || "var(--color-fg)",
        }}
      >
        <div className="flex flex-col items-center text-center pt-4 pb-6">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover mb-3"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full mb-3 grid place-items-center text-xl font-bold"
              style={{
                backgroundColor: cssVars["--theme-accent"] || "var(--color-brand)",
                color: cssVars["--theme-bg"] || "var(--color-app)",
              }}
            >
              {profile?.name?.[0] || "?"}
            </div>
          )}
          <p
            className="font-bold text-sm"
            style={{ fontFamily: cssVars["--theme-font"] || "var(--font-display)" }}
          >
            {profile?.name || "Your name"}
          </p>
          {profile?.title && (
            <p className="text-xs opacity-70 mt-0.5">{profile.title}</p>
          )}
          {profile?.bio && (
            <p className="text-xs opacity-60 mt-2 px-2 line-clamp-3 leading-snug">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {visibleLinks.map((link) => {
            const platform = getPlatform(link.platform);
            const Icon = platform.icon;
            return (
              <div
                key={link.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs"
                style={{
                  backgroundColor: cssVars["--theme-card-bg"] || "rgba(255,255,255,0.06)",
                  border: `1px solid ${cssVars["--theme-card-border"] || "rgba(255,255,255,0.1)"}`,
                  backdropFilter: cssVars["--theme-card-backdrop"] || "blur(12px)",
                }}
              >
                <Icon
                  size={14}
                  style={{ color: cssVars["--theme-accent"] || "var(--color-brand)" }}
                />
                <span className="flex-1 truncate">{link.title || platform.label}</span>
                <span aria-hidden="true" className="opacity-40 text-[10px]">
                  →
                </span>
              </div>
            );
          })}
          {visibleLinks.length === 0 && (
            <p className="text-center text-xs opacity-40 py-6">No links yet</p>
          )}
        </div>

        <p className="text-center text-[9px] opacity-30 mt-6">Powered by Mo Tech</p>
      </div>
    </div>
  );
}
