import { useMemo, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { Download, Share2, Copy, Check, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import BusinessCard from "../../components/dashboard/BusinessCard";
import { getThemeCSS } from "../../lib/themes";
import { downloadSvgAsPng, shareSvgAsPng } from "../../lib/qrDownload";

// Stable id used by both the live <BusinessCard> and the export
// helper to find the same SVG node.
const CARD_SVG_ID = "business-card-svg";

// Native art-board dimensions of the SVG card. The PNG export uses
// these directly so the result hits the 7:4 business-card aspect.
const CARD_W = 1050;
const CARD_H = 600;

export default function CardSection() {
  const { profile, links } = useOutletContext();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Theme vars drive the card's gradient + text colours so it always
  // looks like the rest of the user's profile. Same helper used by
  // PublicProfile and MobilePreview.
  const themeVars = useMemo(
    () => getThemeCSS(profile?.themeJson || null),
    [profile?.themeJson]
  );

  const profileUrl = profile?.username
    ? `${window.location.origin}/${profile.username}`
    : "";

  // Pass `links` down on the profile object so BusinessCard can pull
  // the email/phone lines without us having to thread two props.
  const profileWithLinks = useMemo(
    () => ({ ...(profile || {}), links }),
    [profile, links]
  );

  const filenameBase = `${profile?.username || "moustafa"}-card`;

  async function handleDownload() {
    if (!profileUrl) {
      toast.error("Set a username first");
      return;
    }
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
    if (!profileUrl) {
      toast.error("Set a username first");
      return;
    }
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

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  const noUsername = !profile?.username;

  return (
    <div className="max-w-2xl pb-24 lg:pb-0">
      <header className="mb-6">
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your business card
        </h2>
        <p className="text-sm text-muted mt-1">
          A shareable graphic version of your card. Download it as a PNG
          or share it straight into a chat.
        </p>
      </header>

      {noUsername ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-muted mb-4">
            Pick a username on the Profile tab and your card will render
            here.
          </p>
          <Button as={Link} to="/dashboard/profile" variant="primary" size="sm">
            Go to Profile
          </Button>
        </Card>
      ) : (
        <>
          {/* Live preview. Wrapping div carries the soft drop-shadow
              so the exported PNG (which serializes only the inner
              <svg>) stays clean-edged. */}
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

          <div className="flex flex-wrap gap-3 mb-6">
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
              onClick={handleCopyUrl}
              leftIcon={
                copied ? (
                  <Check size={16} className="text-success" />
                ) : (
                  <Copy size={16} />
                )
              }
            >
              {copied ? "Copied" : "Copy URL"}
            </Button>
            <Button
              variant="ghost"
              as="a"
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              leftIcon={<ExternalLink size={16} />}
            >
              Open profile
            </Button>
          </div>

          <Card padding="md">
            <p className="text-xs text-muted leading-relaxed">
              The card uses your <strong>theme colours</strong>, your{" "}
              <strong>name</strong>, your <strong>title</strong>, and the
              first email + phone link from your Links tab. The QR scans
              straight to your public profile. Update any of those fields
              and the card refreshes — no extra step.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
