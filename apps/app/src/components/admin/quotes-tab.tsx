"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Reply } from "lucide-react";
import type { QuoteRequest } from "@/lib/schema";

interface QuotesTabProps {
  quoteRequests: QuoteRequest[];
  loadingQuoteRequests: boolean;
  onViewQuoteDetails: (quote: QuoteRequest) => void;
  onQuoteReply: (quote: QuoteRequest) => void;
}

export function QuotesTab({
  quoteRequests,
  loadingQuoteRequests,
  onViewQuoteDetails,
  onQuoteReply,
}: QuotesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">
            Quote Requests
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage and respond to customer quote requests
          </p>
        </div>
      </div>

      {loadingQuoteRequests ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">
            Loading quote requests...
          </p>
        </div>
      ) : quoteRequests.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p>No quote requests found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quoteRequests.map((quote: QuoteRequest) => (
            <Card key={quote.id} className="bg-card border-border p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-foreground font-medium">
                      {quote.firstName} {quote.lastName}
                    </h4>
                    <Badge
                      variant="secondary"
                      className="bg-blue-600 text-white"
                    >
                      Quote #{quote.id}
                    </Badge>
                  </div>
                  <p className="text-foreground/80 text-sm mb-2">
                    {quote.businessName}
                  </p>
                  <p className="text-muted-foreground text-sm mb-2">
                    {quote.email}
                  </p>
                  {quote.phone && (
                    <p className="text-muted-foreground text-sm mb-2">
                      {quote.phone}
                    </p>
                  )}
                  {quote.description && (
                    <p className="text-foreground/80 text-sm mb-2">
                      <span className="font-medium">Description:</span>{" "}
                      {quote.description}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Requested: {new Date(quote.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => onViewQuoteDetails(quote)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onQuoteReply(quote)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
