import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfThumbnailProps {
  url: string;
  className?: string;
}

export function PdfThumbnail({ url, className = "" }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      if (!canvasRef.current) return;

      try {
        setLoading(true);
        setError(false);

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        const page = await pdf.getPage(1);

        if (cancelled) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        // Calculate scale to fit the container while maintaining aspect ratio
        const containerWidth = canvas.parentElement?.clientWidth || 200;
        const containerHeight = canvas.parentElement?.clientHeight || 150;
        
        const viewport = page.getViewport({ scale: 1 });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY) * 2; // 2x for better quality

        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF thumbnail:", err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <FileText className="h-12 w-12 text-red-500" />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full object-contain ${loading ? "opacity-0" : "opacity-100"}`}
        style={{ transition: "opacity 0.2s" }}
      />
    </div>
  );
}
