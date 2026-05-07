/**
 * Type definitions for Xiaohongshu scraping strategies
 */

export interface AccountData {
  nickname: string;
  xhsId: string;
  avatarUrl: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  likedCollected: number;
  notesCount: number;
}

export interface PostData {
  xhsPostId: string;
  title: string;
  content: string;
  coverUrl: string;
  imageUrls: string[];
  videoUrl: string;
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  tags: string[];
  postType: string;
  publishDate: string;
  publishTime?: string;
  // New fields for local media storage
  imagePaths?: string[];
  videoPath?: string;
  videoThumbnail?: string;
}

export interface ProfileScrapeResult {
  success: boolean;
  data?: {
    account: AccountData;
    posts: PostData[];
    totalFound: number;
    scrapeMethod: 'browser' | 'browser_dom' | 'fallback';
    warnings: string[];
    partialData: boolean;
  };
  error?: string;
}

export interface PostsScrapeResult {
  success: boolean;
  data?: {
    posts: PostData[];
    cursor: string;
    hasMore: boolean;
    scrapeMethod: 'browser';
    warnings: string[];
  };
  error?: string;
}

export interface NoteScrapeResult {
  success: boolean;
  data?: {
    note: {
      noteId: string;
      title: string;
      content: string;
      coverUrl: string;
      imageUrls: string[];
      videoUrl: string;
      likes: number;
      comments: number;
      collects: number;
      shares: number;
      tags: string[];
      postType: string;
      publishDate: string;
      publishTime?: string;
      authorNickname: string;
      authorAvatar: string;
      commentCount: number;
      // New fields for local media storage
      imagePaths?: string[];
      videoPath?: string;
      videoThumbnail?: string;
    };
    scrapeMethod: 'browser' | 'browser_dom';
    warnings: string[];
  };
  error?: string;
}

export interface MediaDownloadResult {
  imagePaths: string[];
  videoPath: string;
  videoThumbnail: string;
}