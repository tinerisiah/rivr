"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, X, Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  onLogoChange: (logoUrl: string | null) => void;
  currentLogo?: string | null;
}

export default function LogoUpload({
  onLogoChange,
  currentLogo,
}: LogoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentLogo || null
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSave = () => {
    if (previewUrl) {
      localStorage.setItem("customLogo", previewUrl);
      onLogoChange(previewUrl);
    }
    setIsOpen(false);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    localStorage.removeItem("customLogo");
    onLogoChange(null);
    setIsOpen(false);
  };

  const handleReset = () => {
    setPreviewUrl(currentLogo || null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-4 h-4 mr-2" />
          Customize Logo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Custom Logo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current Preview */}
          {previewUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-h-16 max-w-48 object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Area */}
          <Card>
            <CardContent className="p-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isDragging
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your logo here, or
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports PNG, JPG, SVG up to 5MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              {currentLogo && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              )}
              {previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewUrl(null)}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentLogo && (
                <Button variant="destructive" size="sm" onClick={handleRemove}>
                  <X className="w-4 h-4 mr-2" />
                  Remove Logo
                </Button>
              )}
              <Button onClick={handleSave} disabled={!previewUrl} size="sm">
                <Check className="w-4 h-4 mr-2" />
                Save Logo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
