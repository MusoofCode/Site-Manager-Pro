import { useMemo, useState } from "react";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  triggerClassName?: string;
};

export function CommunicationDialog({ triggerClassName }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const schema = useMemo(
    () =>
      z.object({
        subject: z.string().trim().min(3, "Subject is too short").max(120, "Subject is too long"),
        message: z.string().trim().min(10, "Message is too short").max(2000, "Message is too long"),
      }),
    []
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = schema.safeParse({ subject, message });
      if (!parsed.success) {
        toast({
          title: "Invalid input",
          description: parsed.error.issues[0]?.message,
          variant: "destructive",
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("feedback_messages")
        .insert([{ user_id: uid, subject: parsed.data.subject, message: parsed.data.message }] as any);
      if (error) throw error;

      toast({ title: "Sent", description: "Your message was submitted." });
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "border-construction-steel text-construction-concrete hover:text-white hover:bg-construction-steel/20 active:scale-95",
            triggerClassName
          )}
          title="Communication"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-construction-slate border-construction-steel/30">
        <DialogHeader>
          <DialogTitle className="text-foreground">Communication</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-foreground">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-construction-dark border-construction-steel text-foreground"
              placeholder="e.g. I need help with…"
              maxLength={120}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message" className="text-foreground">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px] bg-construction-dark border-construction-steel text-foreground"
              placeholder="Describe what you need…"
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-hero hover:opacity-90 text-white"
            >
              {loading ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
