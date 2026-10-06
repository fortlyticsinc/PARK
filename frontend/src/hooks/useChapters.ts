import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface Chapter {
  id: string;
  pairing_id: string;
  chapter_number: number;
  title: string | null;
  status: "submitted" | "under_review" | "revision_requested" | "resubmitted" | "approved" | "rejected";
  file_url: string;
  file_size_bytes: number | null;
  version: number;
  supervisor_comment: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  updated_at: string;
  student_name: string | null;
  supervisor_name: string | null;
  comments: ChapterComment[];
}

export interface ChapterComment {
  id: string;
  author_id: string;
  author_role: string;
  author_name: string | null;
  content: string;
  page_number: number | null;
  line_number: number | null;
  created_at: string;
}

export interface PaginatedChapters {
  items: Chapter[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UploadUrlResponse {
  upload_url: string;
  params: Record<string, string | number>;
}

export type UploadPurpose = "chapter" | "final_copy";

export function useChapters() {
  const [chapters, setChapters] = useState<PaginatedChapters | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "paused" | "success" | "error">("idle");

  const listChapters = useCallback(
    async (params?: {
      pairing_id?: string;
      page?: number;
      limit?: number;
      status?: string;
    }) => {
      setIsLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (params?.pairing_id) query.set("pairing_id", params.pairing_id);
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.status) query.set("status", params.status);

      const response = await api.get<PaginatedChapters>(
        `/v1/chapters?${query.toString()}`
      );

      if (response.error) {
        setError(response.error.message);
        setChapters(null);
      } else if (response.data) {
        setChapters(response.data);
      }

      setIsLoading(false);
    },
    []
  );

  const getChapter = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    const response = await api.get<{ chapter: Chapter }>(`/v1/chapters/${id}`);

    if (response.error) {
      setError(response.error.message);
      setCurrentChapter(null);
    } else if (response.data) {
      setCurrentChapter((response.data as unknown as { chapter: Chapter }).chapter);
    }

    setIsLoading(false);
  }, []);

  const getUploadUrl = useCallback(async (filename: string, mimeType: string, purpose: UploadPurpose = "chapter") => {
    const response = await api.get<UploadUrlResponse>(
      `/v1/chapters/upload-url?filename=${encodeURIComponent(filename)}&mime_type=${encodeURIComponent(mimeType)}&purpose=${purpose}`
    );
    return response.data || null;
  }, []);

  const uploadToCloudinary = useCallback(
    async (file: File, uploadUrl: string, params: Record<string, string | number>, purpose: UploadPurpose = "chapter") => {
      setUploadStatus("uploading");
      setUploadProgress(0);

      const result = await api.uploadFile<{
        secure_url: string;
        public_id: string;
        bytes: number;
        mime_type: string;
      }>(uploadUrl, file, setUploadProgress, { ...params });

      if (result.error || !result.data) {
        setUploadStatus("error");
        throw new Error(result.error?.message || "Upload failed");
      }

      setUploadStatus("success");
      setUploadProgress(100);
      return result.data;
    },
    []
  );

  const submitChapter = useCallback(
    async (data: {
      pairing_id: string;
      chapter_number: number;
      title?: string;
      file_url: string;
      file_public_id: string;
      file_size: number;
      mime_type: string;
    }) => {
      setIsLoading(true);
      setError(null);

      const response = await api.post<{ chapter: Chapter }>("/v1/chapters", data);

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return (response.data as unknown as { chapter: Chapter }).chapter;
    },
    []
  );

  const resubmitChapter = useCallback(
    async (data: {
      chapter_id: string;
      title?: string;
      file_url: string;
      file_public_id: string;
      file_size: number;
      mime_type: string;
    }) => {
      setIsLoading(true);
      setError(null);

      const response = await api.post<{ chapter: Chapter }>("/v1/chapters/resubmit", data);

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return (response.data as unknown as { chapter: Chapter }).chapter;
    },
    []
  );

  const reviewChapter = useCallback(
    async (
      chapter_id: string,
      data: { status: string; comment?: string }
    ) => {
      setIsLoading(true);
      setError(null);

      const response = await api.patch<{ chapter: Chapter }>(
        `/v1/chapters/${chapter_id}/review`,
        data
      );

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return (response.data as unknown as { chapter: Chapter }).chapter;
    },
    []
  );

  const addComment = useCallback(
    async (
      chapter_id: string,
      data: { content: string; page_number?: number; line_number?: number }
    ) => {
      setIsLoading(true);
      setError(null);

      const response = await api.post<{ comment: ChapterComment }>(
        `/v1/chapters/${chapter_id}/comments`,
        data
      );

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return response.data as unknown as ChapterComment;
    },
    []
  );

  const resetUpload = useCallback(() => {
    setUploadProgress(0);
    setUploadStatus("idle");
  }, []);

  return {
    chapters,
    currentChapter,
    isLoading,
    error,
    uploadProgress,
    uploadStatus,
    listChapters,
    getChapter,
    getUploadUrl,
    uploadToCloudinary,
    submitChapter,
    resubmitChapter,
    reviewChapter,
    addComment,
    resetUpload,
  };
}
