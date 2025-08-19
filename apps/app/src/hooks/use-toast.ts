"use client";
import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

export function useToast() {
  const toast = ({
    title,
    description,
    variant,
  }: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => {
    const isError = variant === "destructive";
    const message = description ? `${title}: ${description}` : title;
    const id = isError ? sonnerToast.error(message) : sonnerToast(message);
    return {
      id: String(id),
      dismiss: () => sonnerToast.dismiss(id),
      update: () => {},
    };
  };

  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) sonnerToast.dismiss(toastId);
      else sonnerToast.dismiss();
    },
  };
}

export const toast = ({
  title,
  description,
  variant,
}: {
  title: string;
  description?: string;
  variant?: ToastVariant;
}) => {
  const isError = variant === "destructive";
  const message = description ? `${title}: ${description}` : title;
  return isError ? sonnerToast.error(message) : sonnerToast(message);
};
