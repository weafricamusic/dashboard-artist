"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { IconTrash, IconArrowRight } from "./IconSet";

export interface ContentItem {
  id: string;
  title: string;
  type: "song" | "video";
  views: number;
  likes: number;
  createdAt: string;
}

export function ContentOverviewCard({
  items,
  onDelete,
}: {
  items: ContentItem[];
  onDelete?: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Content</CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 transition hover:border-zinc-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {item.title}
                  </p>
                  <div className="mt-1 flex gap-3 text-xs text-zinc-400">
                    <span>{item.views.toLocaleString()} plays</span>
                    <span>•</span>
                    <span>{item.likes.toLocaleString()} likes</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="ml-2 flex-shrink-0 rounded p-1.5 text-zinc-500 transition hover:bg-red-950/30 hover:text-red-400"
                    title="Delete content"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {items.length > 5 && (
              <Link
                href="/artist/dashboard/music"
                className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >
                <span>View all content</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-400">No content uploaded yet</p>
            <Link
              href="/artist/dashboard/music"
              className="mt-2 inline-block text-sm font-medium text-amber-400 hover:underline"
            >
              Upload your first song
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
