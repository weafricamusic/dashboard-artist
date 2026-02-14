import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { IconStar, IconTrendingUp } from "./IconSet";

export interface TopContent {
  id: string;
  title: string;
  type: "song" | "video";
  plays: number;
  likes: number;
}

export function EngagementCard({
  topContent,
  audienceDemographics,
}: {
  topContent?: TopContent | null;
  audienceDemographics?: { country: string; listeners: number }[] | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topContent ? (
            <div className="rounded-lg bg-gradient-to-r from-amber-950/40 to-zinc-900/40 border border-amber-800/30 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-900/30 text-amber-400">
                  <IconStar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-400 uppercase">
                    Top {topContent.type}
                  </p>
                  <p className="mt-1 font-medium text-white truncate">
                    {topContent.title}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-zinc-500">Plays</p>
                      <p className="text-sm font-semibold text-white">
                        {topContent.plays.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Likes</p>
                      <p className="text-sm font-semibold text-white">
                        {topContent.likes.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-500">No data yet</p>
            </div>
          )}

          {audienceDemographics && audienceDemographics.length > 0 && (
            <div className="rounded-lg bg-zinc-900/30 p-3 border border-zinc-800/50">
              <div className="flex items-center gap-2 mb-3">
                <IconTrendingUp className="w-4 h-4 text-zinc-400" />
                <p className="text-xs font-medium text-zinc-400 uppercase">
                  Top Regions
                </p>
              </div>
              <div className="space-y-2">
                {audienceDemographics.slice(0, 3).map((demo, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{demo.country}</span>
                    <span className="text-sm font-medium text-white">
                      {demo.listeners.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
