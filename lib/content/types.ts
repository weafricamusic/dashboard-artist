import "server-only";

export type ContentStatus = "draft" | "pending" | "published";

export type Song = {
  id: string;
  artistUid: string;

  title: string;
  description?: string;
  genre?: string;
  tags: string[];
  releaseDate?: string; // YYYY-MM-DD
  coverImageUrl?: string;

  status: ContentStatus;

  plays: number;
  likes: number;
  comments: number;
  shares: number;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type PlaylistType = "album" | "playlist";

export type Playlist = {
  id: string;
  artistUid: string;

  type: PlaylistType;
  title: string;
  description?: string;
  coverImageUrl?: string;
  songIds: string[];

  createdAt: string;
  updatedAt: string;
};

export type Video = {
  id: string;
  artistUid: string;

  title: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;

  status: ContentStatus;

  views: number;
  likes: number;
  comments: number;
  shares: number;

  createdAt: string;
  updatedAt: string;
};
