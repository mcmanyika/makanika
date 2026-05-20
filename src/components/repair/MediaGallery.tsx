"use client";

import { FileText, Image, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { MediaUpload } from "@/types";

interface MediaGalleryProps {
  items: MediaUpload[];
  title?: string;
  loading?: boolean;
}

export function MediaGallery({
  items,
  title = "Repair photos & documents",
  loading = false,
}: MediaGalleryProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          Loading attachments…
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          No files uploaded for this repair order yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-slate-200"
            >
              {item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.downloadURL}
                  alt={item.caption ?? item.fileName ?? "Repair photo"}
                  className="aspect-video w-full object-cover"
                />
              ) : item.type === "video" ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-slate-100">
                  <Video className="h-10 w-10 text-slate-400" />
                  <a
                    href={item.downloadURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View video
                  </a>
                </div>
              ) : (
                <a
                  href={item.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-video flex-col items-center justify-center gap-2 bg-slate-50 p-4 hover:bg-slate-100"
                >
                  <FileText className="h-12 w-12 text-slate-400" />
                  <span className="max-w-full truncate text-center text-sm font-medium text-blue-600">
                    {item.fileName ?? "Document"}
                  </span>
                  <span className="text-xs text-slate-500">Open PDF</span>
                </a>
              )}
              {item.caption && (
                <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
                  {item.caption}
                </p>
              )}
              <div className="flex items-center gap-1 px-3 py-1 text-xs text-slate-400">
                {item.type === "image" ? (
                  <Image className="h-3 w-3" aria-hidden />
                ) : item.type === "video" ? (
                  <Video className="h-3 w-3" aria-hidden />
                ) : (
                  <FileText className="h-3 w-3" aria-hidden />
                )}
                {item.type}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
