import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { sanityClient } from "@/features/cms/client";

type Answer = { _id: string; question: string; answer: string; keywords?: string[] };
type Message = { role: "bot" | "user"; text: string };

function score(query: string, answer: Answer) {
  const q = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  const terms = [...new Set(q.split(/\s+/).filter((word) => word.length > 2))];
  const haystack = `${answer.question} ${answer.answer} ${(answer.keywords ?? []).join(" ")}`.toLowerCase();
  return terms.reduce((total, term) => total + (haystack.includes(term) ? (answer.keywords ?? []).some((keyword) => keyword.toLowerCase() === term) ? 3 : 1 : 0), 0);
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: "Hi! I can answer common questions about Drivwon. What are you looking for?" }]);
  const topAnswers = useMemo(() => answers.slice(0, 4), [answers]);

  useEffect(() => {
    sanityClient.fetch<Answer[]>(`*[_type == "faq" && active == true] | order(order asc){_id,question,answer,keywords}`)
      .then((result) => setAnswers(result ?? []))
      .catch((error) => console.error("Chatbot FAQ query failed", error));
  }, []);

  function ask(event: FormEvent) {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;
    const ranked = answers.map((answer) => ({ answer, points: score(query, answer) })).sort((a, b) => b.points - a.points);
    const best = ranked[0];
    const reply = best && best.points > 0
      ? best.answer.answer
      : "I don’t have a confident answer to that yet. Send the team a note and they’ll get back to you.";
    setMessages((current) => [...current, { role: "user", text: query }, { role: "bot", text: reply }]);
    setInput("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && <section className="mb-3 flex h-[min(32rem,calc(100vh-7rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101014] shadow-2xl" aria-label="Drivwon chat assistant">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex items-center gap-3"><span className="rounded-full bg-primary/20 p-2 text-primary"><Bot size={18} /></span><div><p className="font-semibold">Drivwon assistant</p><p className="text-xs text-muted-foreground">Answers from our published FAQs</p></div></div><button className="rounded-full p-2 text-muted-foreground hover:bg-white/10" aria-label="Close chat" onClick={() => setOpen(false)}><X size={18} /></button></header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.map((message, index) => <p key={index} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "ml-auto bg-primary text-white" : "bg-white/5 text-white"}`}>{message.text}</p>)}
          {messages.length === 1 && <div className="flex flex-wrap gap-2">{topAnswers.map((answer) => <button key={answer._id} onClick={() => { setInput(answer.question); }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-white">{answer.question}</button>)}</div>}
          {messages.length > 1 && messages[messages.length - 1].role === "bot" && messages[messages.length - 1].text.startsWith("I don’t have") && <Link href="/contact" className="inline-flex items-center text-sm text-primary hover:underline">Contact the team <Send size={13} className="ml-2" /></Link>}
        </div>
        <form onSubmit={ask} className="flex gap-2 border-t border-white/10 p-3"><label htmlFor="chat-message" className="sr-only">Your question</label><input id="chat-message" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary" /><button type="submit" aria-label="Send question" className="rounded-xl bg-primary px-3 text-white"><Send size={16} /></button></form>
      </section>}
      <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Close chat" : "Chat with Drivwon"} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105">{open ? <X size={22} /> : <MessageCircle size={22} />}</button>
    </div>
  );
}
