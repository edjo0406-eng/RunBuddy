import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetConversation, useSendMessage, useGetRunner } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useIdentity } from "@/hooks/use-identity";
import { useListRunners, useGetInbox } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, MapPin } from "lucide-react";
import defaultAvatarM from "@/assets/images/avatar-m.png";
import defaultAvatarF from "@/assets/images/avatar-f.png";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationPage() {
  const params = useParams();
  const otherId = Number(params.otherId);
  const { myRunnerId, setMyRunnerId } = useIdentity();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: allRunners, isLoading: loadingRunners } = useListRunners({});
  const { data: otherRunner } = useGetRunner(otherId, { query: { enabled: !!otherId } });

  const { data: messages, isLoading: loadingMessages } = useGetConversation(
    { meId: myRunnerId!, otherId },
    { query: { enabled: !!myRunnerId && !!otherId, refetchInterval: 5_000 } }
  );

  const sendMessage = useSendMessage();

  const isFemale = otherRunner?.gender?.toLowerCase() === "female";
  const otherAvatar = otherRunner?.avatarUrl || (isFemale ? defaultAvatarF : defaultAvatarM);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || !myRunnerId) return;
    setDraft("");
    sendMessage.mutate(
      { data: { fromRunnerId: myRunnerId, toRunnerId: otherId, content } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getConversation"] });
          queryClient.invalidateQueries({ queryKey: ["getInbox"] });
          queryClient.invalidateQueries({ queryKey: ["getUnreadCount"] });
        },
      }
    );
  };

  if (!myRunnerId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h2 className="text-2xl font-display font-bold mb-3">Who are you?</h2>
            <p className="text-muted-foreground mb-6">Select your profile to send and receive messages.</p>
            {loadingRunners ? (
              <Skeleton className="h-10 w-full" />
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

  const myRunner = allRunners?.find((r) => r.id === myRunnerId);
  const myIsFemale = myRunner?.gender?.toLowerCase() === "female";
  const myAvatar = myRunner?.avatarUrl || (myIsFemale ? defaultAvatarF : defaultAvatarM);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow flex flex-col">
        <div className="border-b bg-card/60 backdrop-blur px-4 py-3 flex items-center gap-3">
          <Link href="/inbox">
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <Link href={`/runner/${otherId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherAvatar} alt={otherRunner?.name} />
              <AvatarFallback>{otherRunner?.name?.slice(0, 2).toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm leading-tight">{otherRunner?.name ?? `Runner #${otherId}`}</p>
              {otherRunner && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{otherRunner.city}, {otherRunner.country}
                </p>
              )}
            </div>
          </Link>
        </div>

        <div className="flex-grow overflow-y-auto px-4 py-6 space-y-4 max-w-2xl w-full mx-auto">
          {loadingMessages ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-36"}`} />
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="mb-1 font-medium">No messages yet</p>
              <p className="text-sm">Send a message to start the conversation!</p>
            </div>
          ) : (
            messages?.map((msg) => {
              const isMe = msg.fromRunnerId === myRunnerId;
              const avatar = isMe ? myAvatar : otherAvatar;
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <Avatar className="w-7 h-7 flex-shrink-0 mb-1">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-xs">{isMe ? "Me" : otherRunner?.name?.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t bg-card/80 backdrop-blur px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${otherRunner?.name ?? "runner"}…`}
              rows={1}
              className="flex-grow resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[42px] max-h-32 overflow-y-auto"
              style={{ height: "42px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "42px";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sendMessage.isPending}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
