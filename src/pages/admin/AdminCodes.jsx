import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Ticket,
  Search,
  RefreshCw,
  Plus,
  ExternalLink,
  LogOut,
  ShoppingBag,
  Save,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  listInviteCodes,
  mintInviteCodes,
  deleteInviteCode,
  fetchUserEmails,
} from "../../lib/inviteCodes";
import {
  subscribeSiteSettings,
  setShopUrl,
  isLikelyUrl,
} from "../../lib/siteSettings";
import Logo from "../../components/ui/Logo";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import IconButton from "../../components/ui/IconButton";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function formatDate(value) {
  if (!value) return "—";
  // Firestore Timestamp → Date.
  const d =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
      ? value
      : null;
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatTile({ label, value, tone = "neutral" }) {
  const toneStyles = {
    neutral: "text-fg",
    success: "text-success",
    warning: "text-warning",
    brand: "text-brand",
  };
  return (
    <Card padding="md" className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wider text-faint">{label}</p>
      <p
        className={`text-2xl font-bold ${toneStyles[tone]}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </Card>
  );
}

function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  }, [value]);
  return (
    <IconButton aria-label={label} title={label} onClick={handle}>
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </IconButton>
  );
}

function CodeRow({ row, onDelete, resolvedEmail }) {
  const claimed = !!row.claimedBy;
  // Prefer the email written on the code doc itself (cheap, no extra read);
  // fall back to the email pulled from users/{claimedBy} for legacy claims
  // that don't have claimedEmail set yet.
  const email = row.claimedEmail || resolvedEmail || null;
  return (
    <tr className="border-t border-line align-middle">
      <td className="py-2.5 pl-4 pr-3">
        <code className="text-sm font-mono text-fg">{row.id}</code>
      </td>
      <td className="py-2.5 px-3">
        {claimed ? (
          <Badge variant="success">Claimed</Badge>
        ) : (
          <Badge variant="brand">Available</Badge>
        )}
      </td>
      <td className="py-2.5 px-3 text-sm text-muted">
        {row.note || <span className="text-faint">—</span>}
      </td>
      <td className="py-2.5 px-3 text-xs text-muted whitespace-nowrap">
        {formatDate(row.createdAt)}
      </td>
      <td className="py-2.5 px-3 text-xs text-muted">
        {claimed ? (
          <div
            className="flex flex-col min-w-0"
            title={`uid: ${row.claimedBy}`}
          >
            {email ? (
              <span className="text-fg/90 truncate max-w-[24ch]">{email}</span>
            ) : (
              <code className="font-mono text-[11px] text-fg/80 truncate max-w-[18ch]">
                {row.claimedBy}
              </code>
            )}
            <span className="text-faint">{formatDate(row.claimedAt)}</span>
          </div>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="py-2.5 pr-4 pl-3">
        <div className="flex items-center justify-end gap-1">
          <CopyButton value={row.id} label={`Copy ${row.id}`} />
          {!claimed && (
            <IconButton
              aria-label={`Delete ${row.id}`}
              title="Delete"
              onClick={() => onDelete(row)}
              className="hover:text-danger"
            >
              <Trash2 size={14} />
            </IconButton>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminCodes() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [count, setCount] = useState("5");
  const [prefix, setPrefix] = useState("MOTECH");
  const [note, setNote] = useState("");
  const [minting, setMinting] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [lastMinted, setLastMinted] = useState([]);
  // uid -> email looked up from users/{uid} for codes claimed before
  // claimedEmail was being persisted on the code doc.
  const [resolvedEmails, setResolvedEmails] = useState({});
  // Site-wide shop URL. The Landing CTA + public-profile footer
  // read this so users can buy a card without a code change.
  const [shopUrlDraft, setShopUrlDraft] = useState("");
  const [shopUrlSaved, setShopUrlSaved] = useState("");
  const [shopUrlSaving, setShopUrlSaving] = useState(false);

  useEffect(() => {
    document.title = "Invite codes — Mo Tech admin";
  }, []);

  const refresh = useCallback(async () => {
    setLoadingRows(true);
    try {
      const next = await listInviteCodes({ max: 500 });
      setRows(next);
      // Look up emails for legacy claimed codes that don't have
      // claimedEmail populated. Skip uids we've already resolved.
      const missing = next
        .filter((r) => r.claimedBy && !r.claimedEmail)
        .map((r) => r.claimedBy);
      if (missing.length) {
        try {
          const map = await fetchUserEmails(missing);
          setResolvedEmails((prev) => {
            const out = { ...prev };
            for (const [uid, email] of map) out[uid] = email;
            return out;
          });
        } catch {
          // Email lookup is best-effort; the UI already falls back to the
          // uid if we can't resolve.
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to load codes");
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Subscribe to the singleton site-settings doc so the Save form
  // hydrates with whatever's currently live, and we can detect
  // unsaved changes.
  useEffect(() => {
    const unsub = subscribeSiteSettings((data) => {
      const url = data?.shopUrl || "";
      setShopUrlSaved(url);
      setShopUrlDraft((prev) => (prev === "" ? url : prev));
    });
    return unsub;
  }, []);

  async function handleSaveShopUrl(e) {
    e.preventDefault();
    const trimmed = shopUrlDraft.trim();
    if (trimmed && !isLikelyUrl(trimmed)) {
      toast.error("Enter a full URL starting with http:// or https://");
      return;
    }
    setShopUrlSaving(true);
    try {
      await setShopUrl(trimmed);
      toast.success(trimmed ? "Shop link saved" : "Shop link cleared");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setShopUrlSaving(false);
    }
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const claimed = rows.filter((r) => r.claimedBy).length;
    const available = total - claimed;
    const today = (() => {
      const now = new Date();
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();
      return rows.filter((r) => {
        const claimedAt =
          typeof r.claimedAt?.toDate === "function" ? r.claimedAt.toDate() : null;
        return claimedAt && claimedAt.getTime() >= start;
      }).length;
    })();
    return { total, claimed, available, today };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase();
    return rows.filter((r) => {
      if (statusFilter === "claimed" && !r.claimedBy) return false;
      if (statusFilter === "available" && r.claimedBy) return false;
      if (!q) return true;
      const email = r.claimedEmail || resolvedEmails[r.claimedBy] || "";
      return (
        r.id.toUpperCase().includes(q) ||
        (r.note || "").toUpperCase().includes(q) ||
        (r.claimedBy || "").toUpperCase().includes(q) ||
        email.toUpperCase().includes(q)
      );
    });
  }, [rows, filter, statusFilter, resolvedEmails]);

  async function handleMint(e) {
    e.preventDefault();
    setMinting(true);
    try {
      const created = await mintInviteCodes({ count, prefix, note });
      setLastMinted(created);
      toast.success(`Minted ${created.length} code${created.length === 1 ? "" : "s"}`);
      refresh();
    } catch (err) {
      toast.error(err.message || "Failed to mint codes");
    } finally {
      setMinting(false);
    }
  }

  async function copyAllAvailable() {
    const codes = rows.filter((r) => !r.claimedBy).map((r) => r.id);
    if (!codes.length) {
      toast("No available codes to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(`Copied ${codes.length} code${codes.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  }

  async function copyLastMinted() {
    if (!lastMinted.length) return;
    try {
      await navigator.clipboard.writeText(lastMinted.join("\n"));
      toast.success("Copied");
    } catch {
      toast.error("Couldn't access clipboard");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteInviteCode(pendingDelete.id);
      toast.success("Code deleted");
      setRows((prev) => prev.filter((r) => r.id !== pendingDelete.id));
    } catch (err) {
      toast.error(err.message || "Failed to delete code");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/");
    } catch {
      toast.error("Failed to log out");
    }
  }

  return (
    <div className="min-h-screen bg-app text-fg pb-16">
      <header className="sticky top-0 z-40 bg-app/80 backdrop-blur-lg border-b border-line">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" aria-label="Mo Tech home" className="rounded-lg">
              <Logo size={28} />
            </Link>
            <span aria-hidden="true" className="text-line-strong hidden sm:inline">
              /
            </span>
            <h1
              className="text-sm font-semibold hidden sm:flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Ticket size={14} className="text-brand" />
              Invite codes
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              as={Link}
              to="/dashboard"
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft size={14} />}
            >
              Dashboard
            </Button>
            <span className="hidden sm:inline text-xs text-muted truncate max-w-[16ch]">
              {user?.email}
            </span>
            <IconButton
              aria-label="Log out"
              title="Log out"
              onClick={handleLogout}
            >
              <LogOut size={15} />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Total codes" value={stats.total} />
          <StatTile label="Available" value={stats.available} tone="brand" />
          <StatTile label="Claimed" value={stats.claimed} tone="success" />
          <StatTile label="Claimed today" value={stats.today} />
        </div>

        {/* Site settings */}
        <Card padding="lg">
          <div className="mb-4">
            <h2
              className="text-lg font-semibold flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <ShoppingBag size={16} className="text-brand" />
              Shop link
            </h2>
            <p className="text-sm text-muted mt-0.5">
              Where the &ldquo;Buy a card&rdquo; buttons on the landing
              page and the &ldquo;Get your own card&rdquo; footer on
              every public profile point. Leave blank to hide the
              buttons.
            </p>
          </div>
          <form
            onSubmit={handleSaveShopUrl}
            className="flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <Input
                label="Shop URL"
                type="url"
                inputMode="url"
                placeholder="https://shop.example.com/mo-tech-card"
                value={shopUrlDraft}
                onChange={(e) => setShopUrlDraft(e.target.value)}
                hint={
                  shopUrlSaved
                    ? `Currently live: ${shopUrlSaved}`
                    : "Not set — buy-the-card buttons are hidden."
                }
              />
            </div>
            <Button
              type="submit"
              loading={shopUrlSaving}
              disabled={shopUrlSaving || shopUrlDraft.trim() === shopUrlSaved}
              leftIcon={<Save size={15} />}
            >
              Save
            </Button>
          </form>
        </Card>

        {/* Generate */}
        <Card padding="lg">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h2
                className="text-lg font-semibold flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <Plus size={16} className="text-brand" />
                Generate codes
              </h2>
              <p className="text-sm text-muted mt-0.5">
                Each code is single-use. Up to 100 per batch.
              </p>
            </div>
          </div>
          <form
            onSubmit={handleMint}
            className="grid sm:grid-cols-[120px_1fr_1fr_auto] gap-3 items-end"
          >
            <Input
              label="Count"
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
            />
            <Input
              label="Prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              hint="A–Z, 0–9 (max 12 chars)"
              required
            />
            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Order #123 / Salma's card"
            />
            <Button
              type="submit"
              loading={minting}
              size="lg"
              leftIcon={<Plus size={16} />}
            >
              {minting ? "Minting…" : "Generate"}
            </Button>
          </form>

          {lastMinted.length > 0 && (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs uppercase tracking-wider text-success font-semibold">
                  Just minted ({lastMinted.length})
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  leftIcon={<Copy size={13} />}
                  onClick={copyLastMinted}
                >
                  Copy all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lastMinted.map((c) => (
                  <code
                    key={c}
                    className="px-2 py-1 rounded-md bg-card-hi border border-line text-xs font-mono"
                  >
                    {c}
                  </code>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* List */}
        <Card padding="none">
          <div className="p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between border-b border-line">
            <div className="flex items-center gap-2">
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                All codes
              </h2>
              <span className="text-xs text-muted">
                {filtered.length}
                {filtered.length !== rows.length ? ` / ${rows.length}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center rounded-lg bg-card-hi border border-line p-0.5 text-xs">
                {[
                  { v: "all", l: "All" },
                  { v: "available", l: "Available" },
                  { v: "claimed", l: "Claimed" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setStatusFilter(opt.v)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === opt.v
                        ? "bg-brand text-white"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              <div className="w-48">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search code, note, email, uid…"
                  leftIcon={<Search size={14} />}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Copy size={13} />}
                onClick={copyAllAvailable}
              >
                Copy available
              </Button>
              <IconButton
                aria-label="Refresh"
                title="Refresh"
                onClick={refresh}
              >
                <RefreshCw size={14} className={loadingRows ? "animate-spin" : ""} />
              </IconButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-faint">
                  <th className="py-2.5 pl-4 pr-3 font-medium">Code</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Note</th>
                  <th className="py-2.5 px-3 font-medium">Created</th>
                  <th className="py-2.5 px-3 font-medium">Claimed by</th>
                  <th className="py-2.5 pr-4 pl-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRows && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted text-sm">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted text-sm">
                      {rows.length === 0
                        ? "No invite codes yet — generate one above to get started."
                        : "No codes match the current filter."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <CodeRow
                      key={row.id}
                      row={row}
                      resolvedEmail={
                        row.claimedBy ? resolvedEmails[row.claimedBy] : null
                      }
                      onDelete={(r) => setPendingDelete(r)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 lg:px-5 py-3 border-t border-line text-xs text-muted flex items-center justify-between">
            <span>
              Showing {filtered.length} of {rows.length}
            </span>
            <a
              href="/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-fg transition-colors"
            >
              <ExternalLink size={12} />
              Open registration
            </a>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete invite code?"
        message={
          pendingDelete
            ? `Permanently delete ${pendingDelete.id}. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
