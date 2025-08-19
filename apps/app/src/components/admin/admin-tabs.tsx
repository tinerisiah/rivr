"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode } from "react";

interface AdminTab {
  value: string;
  label: string;
  mobileLabel?: string;
  content: ReactNode;
  hiddenOnMobile?: boolean;
}

interface AdminTabsProps {
  tabs: AdminTab[];
  defaultValue?: string;
}

export function AdminTabs({ tabs, defaultValue = "overview" }: AdminTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className="flex justify-between w-full bg-card border border-border mobile-button shadow-sm">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={`text-muted-foreground w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground mobile-caption tap-highlight-none ${
              tab.hiddenOnMobile ? "hidden sm:flex" : ""
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.mobileLabel || tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="space-y-6 mt-6"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
