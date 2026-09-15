import { useState } from "react";
import { Link } from "wouter";
import { useGetInbox, useListRunners, getGetInboxQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIdentity } from "@/hooks/use-identity";
import { MessageSquare, User } from "lucide-react";
import defaultAvatarM from "@/assets/images/avatar-m.png";
import defaultAvatarF from "@/assets/images/avatar-f.png";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

export default function Inbox() {
  const { myRunnerId, setMyRunnerId } = useIdentity();

  const { data: allRunners, isLoading: loadingRunners } = useListRunners({});
  const { data: conversations, isLoading: loadingInbox } = useGetInbox(
    { query: { enabled: !!myRunnerId, refetchInterval: 10_000, queryKey: getGetInboxQueryKey() } }
  );

  if (!myRunnerId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
            <h1 className="text-3xl font-display font-bold mb-3">Your Inbox</h1>
            <p className="text-muted-foreground mb-8">
              Select your runner profile to view your messages.
            </p>
            {loadingRunners ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <Select onValueChange={(val) => setMyRunnerId(Number(val))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="I am…" />
                </SelectTrigger>
                <SelectContent>
                  {allRunners?.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} — {r.city}, {r.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const me = allRunners?.find((r) => r.id === myRunnerId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-muted/30 border-b border-border/50 py-10">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold mb-1">Inbox</h1>
              <p className="text-muted-foreground text-sm">
                Viewing as <span className="font-semibold text-foreground">{me?.name ?? "…"}</span>
              </p>
            </div>
            <button
              onClick={() => setMyRunnerId(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Switch profile
            </button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 max-w-2xl">
          {loadingInbox ? (
            <div className="space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                  <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-grow space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <div className="text-center py-24">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-display font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground mb-6">Browse profiles and send an intro to start a conversation.</p>
              <Link href="/run-buddy">
                <button className="text-primary font-medium hover:underline">Find a running buddy →</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations?.map((conv) => {
                const other = conv.otherRunner;
                const isFemale = other?.gender?.toLowerCase() === "female";
                const avatar = other?.avatarUrl || (isFemale ? defaultAvatarF : defaultAvatarM);
                const initials = other?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
                return (
                  <Link key={conv.otherId} href={`/messages/${conv.otherId}`}>
                    <div className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors hover:bg-muted/50 ${conv.unreadCount > 0 ? "border-primary/30 bg-primary/5" : "border-border/60"}`}>
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={avatar} alt={other?.name} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-semibold truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
                            {other?.name ?? `Runner #${conv.otherId}`}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatTime(conv.latestMessage.createdAt)}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {conv.latestMessage.fromRunnerId === myRunnerId ? "You: " : ""}
                          {conv.latestMessage.content}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
