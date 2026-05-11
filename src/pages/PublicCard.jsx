import { useEffect, useMemo, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { getThemeCSS } from "../lib/themes";
import { Download, Share2, ExternalLink, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import BusinessCard from "../components/dashboard/BusinessCard";
import SkeletonLoader from "../components/ui/SkeletonLoader";
import { downloadSvgAsPng, shareSvgAsPng } from "../lib/qrDownload";
import { subscribeSiteSettings, isLikelyUrl } from "../lib/siteSettings";

const CARD_W = 1050;
const CARD_H = 600;
const CARD_SVG_ID = "public-business-card-svg";

/**
 * Public, shareable page that renders only the business card. Used
 * when a card owner wants to send the card itself to someone (a
 * customer, a recruiter, a friend) without dragging them through the
 * full link-tree profile. Same fetch logic as PublicProfile so the
 * URL path is just /card/<username>.
 */
export default function PublicCard() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shopUrl, setShopUrl] = useState("");

  useEffect(() => {
    return subscribeSiteSettings((data) => {
      setShopUrl(data?.shopUrl || "");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const usernameDoc = await getDoc(doc(db, "usernames", username));
        if (cancelled) return;
        if (!usernameDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const uid = usernameDoc.data().uid;
        const profileDoc = await getDoc(doc(db, "profiles", uid));
        if (cancelled) return;
        if (!profileDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(profileDoc.data());

        // Same fallback shape as PublicProfile — links may not have
        // an `order` field on legacy records, so fall back to a query
        // without orderBy().
        try {
          const linksSnap = await getDocs(
            query(collection(db, "links"), where("uid", "==", uid))
          );
          if (cancelled) return;
          const rows = linksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setLinks(rows);
        } catch {
          /* silent — card still renders without socials */
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Keep the tab title aligned with the card owner so multiple open
  // tabs are distinguishable. Mirror of the PublicProfile behaviour.
  useEffect(() => {
    if (profile?.name) {
      document.title = `${profile.name} — Mo Tech card`;
    } else if (notFound) {
      document.title = "Card not found — Mo Tech";
    }
  }, [profile, notFound]);

  // Pass `{}` (not `null`) so getThemeCSS returns the full set of
  // default `--theme-*` vars when the profile has no custom theme.
  // Otherwise the marketing-CTA template literals below interpolate
  // `undefined` into things like `${accent}33` -> "undefined33".
  const themeVars = useMemo(
    () => getThemeCSS(profile?.themeJson || {}),
    [profile?.themeJson]
  );

  const profileUrl = useMemo(() => {
    if (!username) return "";
    return `${window.location.origin}/${username}`;
  }, [username]);

  // Same shape CardSection passes down so BusinessCard can read
  // socials/contact off `profile.links`.
  const profileWithLinks = useMemo(
    () => ({ ...(profile || {}), links }),
    [profile, links]
  );

  const filenameBase = `${username || "moustafa"}-card`;

  async function handleDownload() {
    setBusy(true);
    try {
      await downloadSvgAsPng({
        svgId: CARD_SVG_ID,
        filename: filenameBase,
        width: CARD_W,
        height: CARD_H,
      });
    } catch (err) {
      toast.error(err.message || "Couldn't download card");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const result = await shareSvgAsPng({
        svgId: CARD_SVG_ID,
        filename: filenameBase,
        width: CARD_W,
        height: CARD_H,
        title: `${profile?.name || "Mo Tech"} — business card`,
        text: profileUrl,
      });
      if (result.method === "download") {
        toast.success("Saved to your downloads");
      }
    } catch (err) {
      toast.error(err.message || "Couldn't share card");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-app text-fg flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-4">
          <SkeletonLoader className="h-8 w-48" />
          <SkeletonLoader
            className="w-full rounded-3xl"
            style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
          />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-app text-fg flex items-center justify-center p-6 text-center">
        <div>
          <Logo size={36} className="mx-auto mb-4" />
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            This card doesn&rsquo;t exist
          </h1>
          <p className="text-muted mb-6">
            We couldn&rsquo;t find a Mo Tech card at <code>/{username}</code>.
          </p>
          <Button as={RouterLink} to="/" variant="outline">
            Back to Mo Tech
          </Button>
        </div>
      </div>
    );
  }

  const shopHref = isLikelyUrl(shopUrl) ? shopUrl : null;

  return (
    <div
      className="min-h-screen text-fg"
      style={{
        ...themeVars,
        backgroundColor: "var(--theme-bg, var(--color-app))",
      }}
    >
      <Toaster position="top-right" />

      <header className="max-w-5xl mx-auto px-5 lg:px-8 py-5 flex items-center justify-between">
        <RouterLink to="/" className="flex items-center gap-2">
          <Logo size={28} />
        </RouterLink>
        <RouterLink
          to={`/${username}`}
          className="text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          style={{ color: themeVars["--theme-text-secondary"] }}
        >
          Full profile
          <ArrowRight size={14} />
        </RouterLink>
      </header>

      <main className="max-w-3xl mx-auto px-5 lg:px-8 pt-4 pb-16">
        <h1
          className="text-2xl md:text-3xl font-bold tracking-tight mb-2"
          style={{
            fontFamily: "var(--font-display)",
            color: themeVars["--theme-text"],
          }}
        >
          {profile?.name || username}&rsquo;s business card
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: themeVars["--theme-text-secondary"] }}
        >
          Save it, share it, or scan the QR to open the full profile.
        </p>

        {/* The card itself, full-width. */}
        <div
          className="rounded-3xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)] overflow-hidden mb-6"
          style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
        >
          <BusinessCard
            profile={profileWithLinks}
            profileUrl={profileUrl}
            themeVars={themeVars}
            svgId={CARD_SVG_ID}
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          <Button
            onClick={handleShare}
            loading={busy}
            leftIcon={<Share2 size={16} />}
          >
            Share card
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownload}
            loading={busy}
            leftIcon={<Download size={16} />}
          >
            Download PNG
          </Button>
          <Button
            variant="ghost"
            as={RouterLink}
            to={`/${username}`}
            leftIcon={<ExternalLink size={16} />}
          >
            View full profile
          </Button>
        </div>

        {/* Marketing CTA. Same shape as the one on /u/<username>. */}
        <a
          href={shopHref || "/register"}
          target={shopHref ? "_blank" : undefined}
          rel={shopHref ? "noopener noreferrer" : undefined}
          className="group block rounded-2xl p-5 transition-transform hover:scale-[1.01]"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: `1px solid ${themeVars["--theme-accent"]}33`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
              style={{
                backgroundColor: `${themeVars["--theme-accent"]}22`,
                color: themeVars["--theme-accent"],
              }}
            >
              {shopHref ? <ShoppingBag size={20} /> : <ArrowLeft size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="font-semibold text-[15px] tracking-tight"
                style={{ color: themeVars["--theme-text"] }}
              >
                {shopHref
                  ? "Want a card like this? Get one from Mo Tech"
                  : "Create your own Mo Tech profile"}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: themeVars["--theme-text-secondary"] }}
              >
                NFC smart cards · Tap to share · Live analytics
              </p>
            </div>
            <ArrowRight
              size={18}
              style={{ color: themeVars["--theme-text-secondary"] }}
              className="shrink-0 group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </a>
      </main>
    </div>
  );
}
