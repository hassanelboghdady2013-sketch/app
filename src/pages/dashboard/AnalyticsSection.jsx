import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, TrendingUp, MousePointerClick } from "lucide-react";
import { getPlatform } from "../../lib/platforms";
import SkeletonLoader from "../../components/ui/SkeletonLoader";

export default function AnalyticsSection() {
  const { profile, links } = useOutletContext();
  const [views, setViews] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [fetched, setFetched] = useState(false);
  const [nowTs] = useState(() => Date.now());

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
    const weekAgo = new Date(nowTs - 7 * 24 * 60 * 60 * 1000);

    const weekViews = views.filter((v) => {
      const d = v.createdAt?.toDate?.();
      return d && d >= weekAgo;
    });

    const clicksByLink = {};
    clicks.forEach((c) => {
      clicksByLink[c.linkId] = (clicksByLink[c.linkId] || 0) + 1;
    });

    const topLinkId = Object.entries(clicksByLink).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topLink = links.find((l) => l.id === topLinkId);

    return {
      totalViews: views.length,
      weekViews: weekViews.length,
      totalClicks: clicks.length,
      topLink: topLink
        ? { name: topLink.title || getPlatform(topLink.platform).label, clicks: clicksByLink[topLinkId] }
        : null,
      clicksByLink,
    };
  }, [views, clicks, links, nowTs]);

  const chartData = useMemo(() => {
    const now = nowTs;
    const days = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
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
  }, [views, nowTs]);

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

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <SkeletonLoader className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonLoader className="h-28" count={3} />
        </div>
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  if (!profile?.username) {
    return (
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Analytics
        </h2>
        <p className="text-[#8896ab]">Set up your profile username first to start tracking analytics.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Analytics
      </h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Eye}
          label="Total Views"
          value={stats.totalViews}
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value={stats.weekViews}
        />
        <StatCard
          icon={MousePointerClick}
          label="Top Link"
          value={stats.topLink ? `${stats.topLink.name}` : "—"}
          sub={stats.topLink ? `${stats.topLink.clicks} clicks` : "No clicks yet"}
        />
      </div>

      {/* Chart */}
      <div className="p-6 rounded-xl bg-[#111827] border border-white/[0.04] mb-8">
        <h3 className="text-sm text-[#8896ab] mb-4">Page Views — Last 30 Days</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fill: "#555", fontSize: 11 }}
              tickFormatter={(d) => d.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: "#555", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#111d33",
                border: "1px solid #1e3a5f",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#2563eb" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Clicked Links Table */}
      {topClickedLinks.length > 0 && (
        <div className="p-6 rounded-xl bg-[#111827] border border-white/[0.04]">
          <h3 className="text-sm text-[#8896ab] mb-4">Top Clicked Links</h3>
          <div className="space-y-3">
            {topClickedLinks.map((link) => {
              const Icon = link.platform.icon;
              return (
                <div key={link.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                    <Icon size={14} className="text-[#2563eb]" />
                  </div>
                  <span className="flex-1 text-sm truncate">
                    {link.title || link.platform.label}
                  </span>
                  <span className="text-sm text-[#8896ab]">{link.clickCount} clicks</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-5 rounded-xl bg-[#111827] border border-white/[0.04]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
          <Icon size={16} className="text-[#2563eb]" />
        </div>
        <span className="text-xs text-[#8896ab]">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#8896ab] mt-1">{sub}</p>}
    </div>
  );
}
