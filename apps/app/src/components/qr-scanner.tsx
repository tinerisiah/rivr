"use client";
import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, X, CheckCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (result: string) => void;
  scannedCodes: string[];
  onRemoveCode: (code: string) => void;
  title?: string;
  maxCodes?: number;
}

export default function QRScanner({
  onScan,
  scannedCodes,
  onRemoveCode,
  title = "Scan QR Codes",
  maxCodes = 10,
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (scanner) {
        // Cleanup with proper state checking
        const cleanup = async () => {
          try {
            await scanner.clear();
          } catch (error) {
            // Silently handle cleanup errors
            void error;
          }
        };
        cleanup();
      }
    };
  }, [scanner]);

  const startScanning = () => {
    if (scannedCodes.length >= maxCodes) {
      return;
    }

    try {
      setIsScanning(true);

      // Wait for DOM element to be available with retries
      let retries = 0;
      const checkAndInitialize = () => {
        const readerElement = document.getElementById("qr-reader");
        if (readerElement) {
          initializeScanner();
        } else if (retries < 10) {
          retries++;

          setTimeout(checkAndInitialize, 100);
        } else {
          // Unable to initialize QR reader element after retries
          setIsScanning(false);
        }
      };

      setTimeout(checkAndInitialize, 50);
    } catch (error) {
      setIsScanning(false);
    }
  };

  const initializeScanner = () => {
    try {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
          rememberLastUsedCamera: true,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          // Enhanced camera constraints for mobile devices - back camera is better for QR scanning
          videoConstraints: {
            facingMode: "environment", // Back-facing camera for better QR scanning
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          // Process scanned QR code
          if (!scannedCodes.includes(decodedText)) {
            onScan(decodedText);
          }

          // Stop scanning after successful scan
          setTimeout(async () => {
            try {
              await html5QrcodeScanner.clear();
            } catch (error) {
              // Handle scanner clear errors silently
              void error;
            }
            setIsScanning(false);
            setScanner(null);
          }, 100);
        },
        (error) => {
          // Handle scan errors more gracefully
          if (
            error.includes("NotAllowedError") ||
            error.includes("Permission denied")
          ) {
            toast({
              title: "Camera Permission Required",
              description:
                "Please allow camera access in your browser settings and try again.",
              variant: "destructive",
            });
            setIsScanning(false);
            setScanner(null);
          } else if (
            !error.includes("NotFoundException") &&
            !error.includes("No QR code found")
          ) {
            // Handle other scan errors silently
            void error;
          }
        }
      );

      setScanner(html5QrcodeScanner);
    } catch (error) {
      toast({
        title: "QR Scanner Error",
        description:
          "Failed to initialize QR scanner. Check camera permissions and try again.",
        variant: "destructive",
      });
      setIsScanning(false);
      setScanner(null);
    }
  };

  const stopScanning = async () => {
    if (scanner) {
      try {
        await scanner.clear();
        setScanner(null);
      } catch (error) {
        // Force clear even if there's an error
        setScanner(null);
      }
    }
    setIsScanning(false);
  };

  return (
    <Card className="bg-gray-800 border border-gray-700 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <Badge variant="outline" className="text-cyan-400 border-cyan-400">
            {scannedCodes.length}/{maxCodes}
          </Badge>
        </div>

        {/* Scanner Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startScanning();
              }}
              disabled={scannedCodes.length >= maxCodes}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stopScanning();
              }}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Stop Scanning
            </Button>
          )}
        </div>

        {/* Scanner Area */}
        {isScanning && (
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
            <div
              id="qr-reader"
              ref={scannerRef}
              className="w-full min-h-[300px]"
            ></div>
          </div>
        )}

        {/* Scanned Codes Display */}
        {scannedCodes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">
              Scanned QR Codes:
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scannedCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white font-mono text-sm">{code}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemoveCode(code);
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {scannedCodes.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Camera className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>No QR codes scanned yet</p>
            <p className="text-sm">
              Click "Scan QR Code" to start scanning wheel stickers
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
