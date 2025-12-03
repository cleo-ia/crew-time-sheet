import { useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// Configuration du worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.1); // 10% par défaut - pas d'auto-fit
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfWidth, setPdfWidth] = useState<number>(0);
  const [pdfHeight, setPdfHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF load error:", err);
    setError("Impossible de charger le PDF");
    setIsLoading(false);
  };

  const onPageLoadSuccess = ({ originalWidth, originalHeight }: { originalWidth: number; originalHeight: number }) => {
    setPdfWidth(originalWidth);
    setPdfHeight(originalHeight);
    // Pas d'auto-fit - zoom initial fixe à 10%
  };

  // Calcule le scale pour ajuster à la page entière
  const fitToPage = useCallback(() => {
    if (containerRef.current && pdfWidth > 0 && pdfHeight > 0) {
      const containerWidth = containerRef.current.clientWidth - 32;
      const containerHeight = containerRef.current.clientHeight - 32;
      const scaleToFitWidth = containerWidth / pdfWidth;
      const scaleToFitHeight = containerHeight / pdfHeight;
      const newScale = Math.min(scaleToFitWidth, scaleToFitHeight, 2);
      setScale(newScale);
    }
  }, [pdfWidth, pdfHeight]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar améliorée */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50 rounded-t-lg flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setScale(s => Math.max(0.05, s - 0.1))}
            disabled={scale <= 0.05}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {/* Bouton Ajuster à la page */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fitToPage} 
            title="Ajuster à la page"
            disabled={pdfWidth === 0}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          {/* Presets de zoom */}
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setScale(0.5)} 
              className={Math.round(scale * 100) === 50 ? "bg-muted" : ""}
            >
              50%
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setScale(0.75)} 
              className={Math.round(scale * 100) === 75 ? "bg-muted" : ""}
            >
              75%
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setScale(1)} 
              className={Math.round(scale * 100) === 100 ? "bg-muted" : ""}
            >
              100%
            </Button>
          </div>
        </div>
        {numPages > 0 && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pageNumber <= 1} 
              onClick={() => setPageNumber(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[100px] text-center">
              Page {pageNumber} / {numPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pageNumber >= numPages} 
              onClick={() => setPageNumber(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* PDF Content avec ref pour mesurer */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-muted/30 rounded-b-lg">
        {error ? (
          <div className="flex items-center justify-center h-full text-destructive">
            {error}
          </div>
        ) : (
          <div className="min-w-fit min-h-fit mx-auto">
            <Document 
              file={url} 
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
