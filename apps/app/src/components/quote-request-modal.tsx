"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, FileImage } from "lucide-react";

interface QuoteInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName: string;
  description: string;
  photos: string[];
}

interface QuoteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuoteInfo) => void;
}

const quoteFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  description: z
    .string()
    .min(10, "Please provide a detailed description (minimum 10 characters)"),
  photos: z.array(z.string()).min(1, "Please upload at least one photo"),
});

export default function QuoteRequestModal({
  isOpen,
  onClose,
  onSubmit,
}: QuoteRequestModalProps) {
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<QuoteInfo>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: "",
      description: "",
      photos: [],
    },
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    const newPhotos: string[] = [];

    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
        // 5MB limit
        try {
          const base64 = await convertToBase64(file);
          newPhotos.push(base64);
        } catch (error) {
          // Handle file conversion errors silently
          void error;
        }
      }
    }

    const updatedPhotos = [...uploadedPhotos, ...newPhotos];
    setUploadedPhotos(updatedPhotos);
    form.setValue("photos", updatedPhotos);
    setUploading(false);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions to keep images reasonable size
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = uploadedPhotos.filter((_, i) => i !== index);
    setUploadedPhotos(updatedPhotos);
    form.setValue("photos", updatedPhotos);
  };

  const handleSubmit = (data: QuoteInfo) => {
    onSubmit(data);
    form.reset();
    setUploadedPhotos([]);
  };

  const handleClose = () => {
    form.reset();
    setUploadedPhotos([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white mb-2 tracking-wide">
            REQUEST A QUOTE
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 uppercase tracking-widest">
            Upload photos and describe the damage for an accurate quote
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">First Name*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Last Name*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        {...field}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    Email Address*
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      {...field}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...field}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Name */}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    Business Name*
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Tire Shop"
                      {...field}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    Damage Description*
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe the damage in detail including location, size, and any other relevant information..."
                      rows={4}
                      className="resize-none bg-gray-800 border-gray-600 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <FormField
              control={form.control}
              name="photos"
              render={() => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    Photos of Damage*
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Upload Area */}
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploading}
                        />
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">
                            {uploading
                              ? "Uploading..."
                              : "Click to upload photos or drag and drop"}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            PNG, JPG up to 5MB each
                          </p>
                        </div>
                      </div>

                      {/* Photo Preview Grid */}
                      {uploadedPhotos.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {uploadedPhotos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Damage photo ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-600"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                <FileImage className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black font-bold tracking-wide"
                disabled={uploading}
              >
                {uploading ? "UPLOADING..." : "SEND QUOTE REQUEST"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
