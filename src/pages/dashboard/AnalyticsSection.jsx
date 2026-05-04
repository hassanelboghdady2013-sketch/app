import { useState, useEffect, useMemo } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Eye, TrendingUp, MousePointerClick, BarChart3 } from "lucide-react";
import { getPlatform } from "../../lib/platforms";
import SkeletonLoader from "../../components/ui/SkeletonLoader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const ranges = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default function AnalyticsSection() {
  const { profile, links } = useOutletContext();
  const [views, setViews] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [fetched, setFetched] = useState(false);
  const [nowTs] = useState(() => Date.now());
  const [range, setRange] = useState(30);

  const hasUsername = !!profile?.username;
  const loading = !fetched && hasUsername;

  useEffect(() => {
    if (!hasUsername) {
      return;
    }

    async function fetchData() {
      try {
        let viewsSnap;
        try {
          const viewsQ = query(
            collection(db, "pageViews"),
            where("username", "==", profile.username),
            orderBy("createdAt", "desc")
          );
          viewsSnap = await getDocs(viewsQ);
        } catch {
          const fallbackQ = query(
            collection(db, "pageViews"),
            where("username", "==", profile.username)
          );
          viewsSnap = await getDocs(fallbackQ);
        }
        setViews(viewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        if (links.length > 0) {
          const linkIds = links.map((l) => l.id);
          const batchSize = 30;
          const allClicks = [];
          for (let i = 0; i < linkIds.length; i += batchSize) {
            const batch = linkIds.slice(i, i + batchSize);
            const clicksQ = query(
              collection(db, "linkClicks"),
              where("linkId", "in", batch)
            );
            const clicksSnap = await getDocs(clicksQ);
            allClicks.push(
              ...clicksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
            );
          }
          setClicks(allClicks);
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setFetched(true);
      }
    }

    fetchData();
  }, [hasUsername, profile?.username, links]);

  const stats = useMemo(() => {
    const since = new Date(nowTs - range * 24 * 60 * 60 * 1000);
    const rangeViews = views.filter((v) => {
      const d = v.createdAt?.toDate?.();
      return d && d >= since;
    });

    const clicksByLink = {};
    clicks.forEach((c) => {
      clicksByLink[c.linkId] = (clicksByLink[c.linkId] || 0) + 1;
    });

    const topLinkId = Object.entries(clicksByLink).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topLink = links.find((l) => l.id === topLinkId);

    return {
      totalViews: views.length,
      rangeViews: rangeViews.length,
      totalClicks: clicks.length,
      topLink: topLink
        ? {
            name: topLink.title || getPlatform(topLink.platform).label,
            clicks: clicksByLink[topLinkId],
          }
        : null,
      clicksByLink,
    };
  }, [views, clicks, links, range, nowTs]);

  const chartData = useMemo(() => {
    const days = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(nowTs - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      days[key] = { date: key, views: 0 };
    }
    views.forEach((v) => {
      const d = v.createdAt?.toDate?.();
      if (d) {
        const key = d.toISOString().split("T")[0];
        if (days[key]) days[key].views++;
      }
    });
    return Object.values(days);
  }, [views, range, nowTs]);

  const topClickedLinks = useMemo(() => {
    return links
      .map((l) => ({
        ...l,
        clickCount: stats.clicksByLink[l.id] || 0,
        platform: getPlatform(l.platform),
      }))
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 5);
  }, [links, stats.clicksByLink]);

  const maxClicks = topClickedLinks[0]?.clickCount || 1;

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <SkeletonLoader className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SkeletonLoader className="h-28" count={4} />
        </div>
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  if (!profile?.username) {
    return (
      <div className="max-w-3xl">
        <h2
          className="text-2xl font-bold mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Analytics
        </h2>
        <Card padding="xl" className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-soft text-brand grid place-items-center mx-auto mb-4">
            <BarChart3 size={22} />
          </div>
          <p
            className="text-lg font-semibold mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Set a username first
          </p>
          <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
            Pick your username in the Profile section to start tracking views and clicks.
          </p>
          <Button as={Link} to="/dashboard/profile">
            Go to Profile
          </Button>
        </Card>
      </div>
    );
  }

  const noData = stats.totalViews === 0 && stats.totalClicks === 0;

  return (
    <div className="max-w-4xl pb-16 lg:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Analytics
          </h2>
          <p className="text-sm text-muted mt-1">
            Page views and link clicks for your public profile.
          </p>
        </div>
        <div
          className="inline-flex p-1 bg-card border border-line rounded-lg self-start sm:self-auto"
          role="tablist"
          aria-label="Time range"
        >
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              role="tab"
              aria-selected={range === r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === r.value
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:text-fg"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Eye} label="Total views" value={stats.totalViews} />
        <StatCard
          icon={TrendingUp}
          label={`Last ${range} days`}
          value={stats.rangeViews}
        />
        <StatCard
          icon={MousePointerClick}
          label="Total clicks"
          value={stats.totalClicks}
        />
        <StatCard
          icon={BarChart3}
          label="Top link"
          value={stats.topLink ? stats.topLink.name : "—"}
          sub={stats.topLink ? `${stats.topLink.clicks} clicks` : "No clicks yet"}
        />
      </div>

      {/* Chart */}
      <Card padding="lg" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted">
            Page views — last {range} days
          </h3>
        </div>
        {noData ? (
          <div className="h-[250px] flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted">
              No views yet. Share your profile to start collecting data.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                tickFormatter={(d) => d.slice(5)}
                interval="preserveStartEnd"
                axisLine={{ stroke: "var(--color-line)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card-hi)",
                  border: "1px solid var(--color-line-strong)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--color-fg)",
                }}
                cursor={{ stroke: "var(--color-line-strong)" }}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="var(--color-brand)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-brand)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top clicked links */}
      {topClickedLinks.length > 0 && (
        <Card padding="lg">
          <h3 className="text-sm font-medium text-muted mb-4">Top clicked links</h3>
          <div className="space-y-3">
            {topClickedLinks.map((link) => {
              const Icon = link.platform.icon;
              const pct = (link.clickCount / maxClicks) * 100;
              return (
                <div key={link.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand grid place-items-center shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {link.title || link.platform.label}
                      </p>
                      <p className="text-sm text-muted ml-3 shrink-0">
                        {link.clickCount}
                      </p>
                    </div>
                    <div
                      className="h-1.5 bg-line rounded-full overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full bg-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand grid place-items-center">
          <Icon size={15} />
        </div>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p
        className="text-xl font-bold tracking-tight truncate"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-1 truncate">{sub}</p>}
    </Card>
  );
}
