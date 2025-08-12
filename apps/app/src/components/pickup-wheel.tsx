"use client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Truck } from "lucide-react";

interface PickupWheelProps {
  onClick: () => void;
  isLoading?: boolean;
}

export default function PickupWheel({
  onClick,
  isLoading = false,
}: PickupWheelProps) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="relative"
      >
        <Button
          onClick={onClick}
          disabled={isLoading}
          size="lg"
          className="relative overflow-hidden rounded-xl px-8 py-6 text-lg font-semibold tracking-normal transition-all duration-300 shadow-lg min-w-[240px] min-h-[80px] bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/20 focus:ring-2 focus:ring-blue-500/50 focus:outline-none hover:shadow-xl hover:shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {/* Simple Content Container */}
          <div className="relative z-10 flex items-center justify-center space-x-3">
            {/* Clean Icon */}
            <motion.div
              animate={isLoading ? { rotate: 360 } : {}}
              transition={
                isLoading
                  ? { duration: 2, repeat: Infinity, ease: "linear" }
                  : {}
              }
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Truck className="w-5 h-5 text-white" />
              )}
            </motion.div>

            {/* Clean Text */}
            <span className="text-white">
              {isLoading ? "Processing..." : "Request Service"}
            </span>
          </div>

          {/* Subtle Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
        </Button>
      </motion.div>

      {/* Clean Status Indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-muted-foreground"
        >
          Submitting your request...
        </motion.div>
      )}
    </div>
  );
}
