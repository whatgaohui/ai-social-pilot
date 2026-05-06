"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cookie,
  Loader2,
  PenLine,
  Search,
} from "lucide-react";

interface CookieInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountUrl: string;
  accountId: string;
  onSuccess: () => void;
}

type ScrapeMethod = "cookie" | "search" | "manual" | null;

export function CookieInputDialog({
  open,
  onOpenChange,
  accountUrl,
  accountId,
  onSuccess,
}: CookieInputDialogProps) {
  const [method, setMethod] = useState<ScrapeMethod>(null);
  const [cookieValue, setCookieValue] = useState("");
  const [cookieValidated, setCookieValidated] = useState(false);
  const [message, setMessage] = useState("");
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualNickname, setManualNickname] = useState("");
  const [manualFollowers, setManualFollowers] = useState("");
  const [manualFollowing, setManualFollowing] = useState("");
  const [manualLikedCollected, setManualLikedCollected] = useState("");
  const [manualNotesCount, setManualNotesCount] = useState("");
  const [manualBio, setManualBio] = useState("");

  const reset = () => {
    setMethod(null);
    setCookieValue("");
    setCookieValidated(false);
    setMessage("");
    setValidating(false);
    setSubmitting(false);
    setManualNickname("");
    setManualFollowers("");
    setManualFollowing("");
    setManualLikedCollected("");
    setManualNotesCount("");
    setManualBio("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleValidateCookie = async () => {
    if (!cookieValue.trim()) {
      toast.error("Please paste the Cookie first");
      return;
    }

    setValidating(true);
    setCookieValidated(false);
    setMessage("");

    try {
      const res = await fetch("/api/accounts/validate-cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies: cookieValue, accountUrl }),
      });
      const data = await res.json();

      if (data.success && data.valid) {
        setCookieValidated(true);
        if (data.cookies) setCookieValue(data.cookies);
        setMessage(data.message || "Cookie format verified");
        toast.success("Cookie format verified");
      } else {
        const reason = data.message || data.error || "Cookie is incomplete";
        setMessage(reason);
        toast.error(reason);
      }
    } catch {
      setMessage("Validation failed. Please make sure the scraper service is running.");
      toast.error("Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const handleCookieScrape = async () => {
    if (!cookieValidated) {
      toast.error("Please validate the Cookie first");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/accounts/${accountId}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "cookie", cookies: cookieValue }),
      });
      const data = await res.json();

      if (data.success) {
        const postsFound = data.data?.postsFound || 0;
        const warnings = data.data?.warnings || [];
        toast.success(`Scrape finished: ${postsFound} posts`);
        setMessage(warnings.join("; "));
        onSuccess();
        if (postsFound > 0) handleOpenChange(false);
      } else {
        const reason = data.error || "Scrape failed";
        setMessage(reason);
        toast.error(reason);
      }
    } catch {
      setMessage("Scrape failed. Please try again later.");
      toast.error("Scrape failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchScrape = async () => {
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/accounts/${accountId}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "search" }),
      });
      const data = await res.json();

      if (data.success) {
        const warnings = data.data?.warnings || [];
        toast.success(`Scrape finished: ${data.data?.postsFound || 0} posts`);
        setMessage(warnings.join("; "));
        onSuccess();
      } else {
        toast.error(data.error || "Scrape failed");
      }
    } catch {
      toast.error("Scrape failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSave = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: manualNickname,
          followers: Number(manualFollowers) || 0,
          following: Number(manualFollowing) || 0,
          likedCollected: Number(manualLikedCollected) || 0,
          notesCount: Number(manualNotesCount) || 0,
          bio: manualBio,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Account info saved");
        onSuccess();
        handleOpenChange(false);
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const renderMethodPicker = () => (
    <div className="grid gap-3">
      <Button variant="outline" className="h-auto justify-start gap-3 p-4" onClick={() => setMethod("cookie")}>
        <Cookie className="h-5 w-5 shrink-0 text-xhs" />
        <span className="min-w-0 text-left">
          <span className="block font-medium">Cookie Scrape</span>
          <span className="block text-xs text-muted-foreground">Best for profile and post list data</span>
        </span>
      </Button>
      <Button variant="outline" className="h-auto justify-start gap-3 p-4" onClick={() => setMethod("search")}>
        <Search className="h-5 w-5 shrink-0 text-xhs" />
        <span className="min-w-0 text-left">
          <span className="block font-medium">Search Scrape</span>
          <span className="block text-xs text-muted-foreground">No Cookie needed, but data can be limited</span>
        </span>
      </Button>
      <Button variant="outline" className="h-auto justify-start gap-3 p-4" onClick={() => setMethod("manual")}>
        <PenLine className="h-5 w-5 shrink-0 text-xhs" />
        <span className="min-w-0 text-left">
          <span className="block font-medium">Manual Fill</span>
          <span className="block text-xs text-muted-foreground">Use this when automatic scraping is blocked</span>
        </span>
      </Button>
    </div>
  );

  const renderCookieForm = () => (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Paste the Header String from Cookie-Editor. The app keeps it local and normalizes common formats.
        </AlertDescription>
      </Alert>
      <Textarea
        value={cookieValue}
        onChange={(event) => {
          setCookieValue(event.target.value);
          setCookieValidated(false);
          setMessage("");
        }}
        placeholder="a1=...; web_session=...; webId=..."
        className="min-h-32 max-h-48 resize-y break-all font-mono text-xs"
      />
      {message && (
        <p className="max-h-28 overflow-y-auto break-words rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          {message}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={() => setMethod(null)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleValidateCookie} disabled={validating || submitting}>
            {validating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Validate
          </Button>
          <Button className="bg-xhs text-white hover:bg-xhs-dark" onClick={handleCookieScrape} disabled={!cookieValidated || submitting}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Start
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSearchForm = () => (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Search scraping depends on .z-ai-config and usually cannot fetch the full post list.
        </AlertDescription>
      </Alert>
      <p className="truncate rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">{accountUrl}</p>
      {message && <p className="max-h-28 overflow-y-auto break-words text-xs text-muted-foreground">{message}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={() => setMethod(null)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button className="bg-xhs text-white hover:bg-xhs-dark" onClick={handleSearchScrape} disabled={submitting}>
          {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Start Search
        </Button>
      </div>
    </div>
  );

  const renderManualForm = () => (
    <div className="grid gap-3">
      <Input value={manualNickname} onChange={(event) => setManualNickname(event.target.value)} placeholder="Nickname" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input type="number" value={manualFollowers} onChange={(event) => setManualFollowers(event.target.value)} placeholder="Followers" />
        <Input type="number" value={manualFollowing} onChange={(event) => setManualFollowing(event.target.value)} placeholder="Following" />
        <Input type="number" value={manualLikedCollected} onChange={(event) => setManualLikedCollected(event.target.value)} placeholder="Likes + collects" />
        <Input type="number" value={manualNotesCount} onChange={(event) => setManualNotesCount(event.target.value)} placeholder="Post count" />
      </div>
      <Textarea value={manualBio} onChange={(event) => setManualBio(event.target.value)} placeholder="Bio" />
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={() => setMethod(null)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button className="bg-xhs text-white hover:bg-xhs-dark" onClick={handleManualSave} disabled={submitting}>
          {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Data Scrape</DialogTitle>
          <DialogDescription>
            Xiaohongshu post lists usually require a logged-in Cookie. Validate the Cookie before scraping.
          </DialogDescription>
        </DialogHeader>
        {method === null && renderMethodPicker()}
        {method === "cookie" && renderCookieForm()}
        {method === "search" && renderSearchForm()}
        {method === "manual" && renderManualForm()}
      </DialogContent>
    </Dialog>
  );
}
