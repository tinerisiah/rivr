"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Truck, BarChart3, Clock, CheckCircle, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WelcomeAnimationProps {
  userType: "admin" | "driver" | "customer";
  userName?: string;
  stats?: {
    totalRequests?: number;
    completedToday?: number;
    pendingRequests?: number;
    activeRoutes?: number;
  };
  onComplete?: () => void;
}

export default function WelcomeAnimation({
  userType,
  userName,
  stats = {},
  onComplete,
}: WelcomeAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getWelcomeMessage = () => {
    switch (userType) {
      case "admin":
        return {
          title: `${getGreeting()}, ${userName || "Admin"}!`,
          subtitle: "Ready to manage your operations?",
          icon: BarChart3,
          color: "blue",
          stats: [
            {
              label: "Total Requests",
              value: stats.totalRequests || 0,
              icon: Clock,
            },
            {
              label: "Completed Today",
              value: stats.completedToday || 0,
              icon: CheckCircle,
            },
            {
              label: "Pending",
              value: stats.pendingRequests || 0,
              icon: Clock,
            },
          ],
        };
      case "driver":
        return {
          title: `${getGreeting()}, ${userName || "Driver"}!`,
          subtitle: "Let's get your routes started",
          icon: Truck,
          color: "green",
          stats: [
            {
              label: "Active Routes",
              value: stats.activeRoutes || 0,
              icon: Truck,
            },
            {
              label: "Completed Today",
              value: stats.completedToday || 0,
              icon: CheckCircle,
            },
            {
              label: "Pending Pickups",
              value: stats.pendingRequests || 0,
              icon: Clock,
            },
          ],
        };
      case "customer":
        return {
          title: `${getGreeting()}!`,
          subtitle: "Welcome to professional service",
          icon: User,
          color: "purple",
          stats: [
            {
              label: "Service Requests",
              value: stats.totalRequests || 0,
              icon: Star,
            },
            {
              label: "Completed",
              value: stats.completedToday || 0,
              icon: CheckCircle,
            },
          ],
        };
      default:
        return {
          title: `${getGreeting()}!`,
          subtitle: "Welcome back",
          icon: User,
          color: "blue",
          stats: [],
        };
    }
  };

  const welcomeData = getWelcomeMessage();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        // Auto-hide after showing all content
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 2000);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          bg: "bg-blue-500 dark:bg-blue-600",
          text: "text-blue-600 dark:text-blue-400",
          border: "border-blue-200 dark:border-blue-800",
          glow: "shadow-blue-500/20 dark:shadow-blue-400/30",
        };
      case "green":
        return {
          bg: "bg-green-500 dark:bg-green-600",
          text: "text-green-600 dark:text-green-400",
          border: "border-green-200 dark:border-green-800",
          glow: "shadow-green-500/20 dark:shadow-green-400/30",
        };
      case "purple":
        return {
          bg: "bg-purple-500 dark:bg-purple-600",
          text: "text-purple-600 dark:text-purple-400",
          border: "border-purple-200 dark:border-purple-800",
          glow: "shadow-purple-500/20 dark:shadow-purple-400/30",
        };
      default:
        return {
          bg: "bg-blue-500 dark:bg-blue-600",
          text: "text-blue-600 dark:text-blue-400",
          border: "border-blue-200 dark:border-blue-800",
          glow: "shadow-blue-500/20 dark:shadow-blue-400/30",
        };
    }
  };

  const colors = getColorClasses(welcomeData.color);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm"
      >
        <Card className="w-full max-w-md mx-4 bg-background/95 backdrop-blur border shadow-2xl">
          <div className="p-8 text-center">
            {/* Icon Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: currentStep >= 0 ? 1 : 0,
                rotate: currentStep >= 0 ? 0 : -180,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.6,
              }}
              className={`mx-auto mb-6 w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center ${colors.glow} shadow-lg`}
            >
              <welcomeData.icon className="w-8 h-8 text-white" />
            </motion.div>

            {/* Title Animation */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: currentStep >= 1 ? 1 : 0,
                y: currentStep >= 1 ? 0 : 20,
              }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl font-bold text-foreground mb-2"
            >
              {welcomeData.title}
            </motion.h2>

            {/* Subtitle Animation */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: currentStep >= 1 ? 1 : 0,
                y: currentStep >= 1 ? 0 : 20,
              }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className={`${colors.text} mb-6`}
            >
              {welcomeData.subtitle}
            </motion.p>

            {/* Stats Animation */}
            {welcomeData.stats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: currentStep >= 2 ? 1 : 0,
                  scale: currentStep >= 2 ? 1 : 0.8,
                }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="grid grid-cols-1 gap-3"
              >
                {welcomeData.stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{
                      x: currentStep >= 3 ? 0 : -20,
                      opacity: currentStep >= 3 ? 1 : 0,
                    }}
                    transition={{
                      delay: 0.8 + index * 0.1,
                      duration: 0.4,
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg bg-muted ${colors.border} border`}
                  >
                    <div className="flex items-center gap-2">
                      <stat.icon className={`w-4 h-4 ${colors.text}`} />
                      <span className="text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 1 + index * 0.1,
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className={`font-bold ${colors.text}`}
                    >
                      {stat.value}
                    </motion.span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Progress dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex justify-center gap-2 mt-6"
            >
              {[0, 1, 2, 3].map((step) => (
                <motion.div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    currentStep >= step ? colors.bg : "bg-muted-foreground/30"
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2 + step * 0.1 }}
                />
              ))}
            </motion.div>

            {/* Skip button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              onClick={() => {
                setIsVisible(false);
                onComplete?.();
              }}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </motion.button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing welcome animation state
export function useWelcomeAnimation() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasShownToday, setHasShownToday] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem("welcomeAnimationLastShown");

    if (lastShown !== today) {
      setShowWelcome(true);
      setHasShownToday(false);
    } else {
      setHasShownToday(true);
    }
  }, []);

  const completeWelcome = () => {
    setShowWelcome(false);
    setHasShownToday(true);
    const today = new Date().toDateString();
    localStorage.setItem("welcomeAnimationLastShown", today);
  };

  const triggerWelcome = () => {
    setShowWelcome(true);
  };

  return {
    showWelcome,
    hasShownToday,
    completeWelcome,
    triggerWelcome,
  };
}
