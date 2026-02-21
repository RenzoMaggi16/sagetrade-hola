import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    BrainCircuit,
    Send,
    ArrowLeft,
    Loader2,
    FileBarChart,
    Trash2,
    Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMentorIA, QUICK_QUESTIONS, calculateDisciplineScore } from "@/hooks/useMentorIA";
import { cn } from "@/lib/utils";

// ── Discipline Score Badge ─────────────────────────────────────
const DisciplineScoreBadge = ({ score }: { score: number }) => {
    const getColor = () => {
        if (score >= 80) return "from-emerald-500 to-green-400";
        if (score >= 60) return "from-yellow-500 to-amber-400";
        if (score >= 40) return "from-orange-500 to-amber-500";
        return "from-red-500 to-rose-400";
    };

    const getLabel = () => {
        if (score >= 80) return "Excelente";
        if (score >= 60) return "Bueno";
        if (score >= 40) return "Mejorable";
        return "Crítico";
    };

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card/80 border border-border/50 backdrop-blur-sm">
            <div
                className={cn(
                    "relative w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg",
                    getColor()
                )}
            >
                <span className="text-white font-bold text-lg">{score}</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Discipline Score
                </p>
                <p className="text-sm font-semibold text-foreground">{getLabel()}</p>
            </div>
        </div>
    );
};

// ── Chat Bubble ────────────────────────────────────────────────
const ChatBubble = ({
    role,
    content,
    isNew,
}: {
    role: "user" | "assistant";
    content: string;
    isNew?: boolean;
}) => {
    const isUser = role === "user";

    return (
        <div
            className={cn(
                "flex w-full mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            {!isUser && (
                <div className="flex-shrink-0 mr-3 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <BrainCircuit className="w-4 h-4 text-white" />
                    </div>
                </div>
            )}
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    isUser
                        ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-br-md shadow-lg shadow-violet-500/10"
                        : "bg-card/80 border border-border/60 text-foreground rounded-bl-md shadow-sm backdrop-blur-sm"
                )}
            >
                {content}
            </div>
        </div>
    );
};

// ── Typing Indicator ───────────────────────────────────────────
const TypingIndicator = () => (
    <div className="flex items-start mb-4 animate-in fade-in-0 duration-200">
        <div className="flex-shrink-0 mr-3 mt-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <BrainCircuit className="w-4 h-4 text-white animate-pulse" />
            </div>
        </div>
        <div className="bg-card/80 border border-border/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                <span className="text-sm text-muted-foreground">Analizando...</span>
            </div>
        </div>
    </div>
);

// ── Main Page ──────────────────────────────────────────────────
const MentorIA = () => {
    const {
        messages,
        isLoadingMessages,
        isTyping,
        sendMessage,
        sendQuickQuestion,
        generateWeeklyReport,
        clearChat,
        disciplineScore,
    } = useMentorIA();

    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || isTyping) return;
        setInput("");
        sendMessage(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Back Button */}
                <div className="mb-4">
                    <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 rounded-md bg-secondary text-foreground hover:bg-secondary/80 transition-colors duration-200 text-sm"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Dashboard
                    </Link>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-500/10 mr-4 border border-violet-500/20 shadow-lg shadow-violet-500/5">
                            <BrainCircuit className="h-8 w-8 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                                Mentor IA
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Analiza tu rendimiento y disciplina
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DisciplineScoreBadge score={disciplineScore} />
                    </div>
                </div>

                {/* Chat Container */}
                <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl shadow-black/5 overflow-hidden">
                    {/* Chat Messages */}
                    <ScrollArea ref={scrollRef} className="h-[500px] p-6">
                        {isLoadingMessages ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-500/10 flex items-center justify-center mb-6 border border-violet-500/20 shadow-lg shadow-violet-500/10">
                                    <Sparkles className="w-10 h-10 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    Tu mentor de trading está listo
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                                    Haz una pregunta o selecciona una de las opciones rápidas para recibir análisis profesional basado en tus datos reales.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {messages.map((msg, i) => (
                                    <ChatBubble
                                        key={msg.id}
                                        role={msg.role}
                                        content={msg.content}
                                        isNew={i >= messages.length - 2}
                                    />
                                ))}
                                {isTyping && <TypingIndicator />}
                            </div>
                        )}
                    </ScrollArea>

                    <Separator className="opacity-50" />

                    {/* Input Area */}
                    <div className="p-4">
                        <div className="flex items-end gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Escribe tu pregunta al mentor..."
                                    rows={1}
                                    className="w-full resize-none bg-background/50 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all duration-200"
                                    style={{ minHeight: "44px", maxHeight: "120px" }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = "44px";
                                        target.style.height = Math.min(target.scrollHeight, 120) + "px";
                                    }}
                                />
                            </div>
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                size="icon"
                                className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/20 transition-all duration-200 disabled:opacity-40"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Quick Questions */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {QUICK_QUESTIONS.map((q) => (
                                <button
                                    key={q.label}
                                    onClick={() => sendQuickQuestion(q.prompt)}
                                    disabled={isTyping}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span>{q.emoji}</span>
                                    <span>{q.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-3 flex items-center gap-2">
                            <Button
                                onClick={generateWeeklyReport}
                                disabled={isTyping}
                                variant="outline"
                                size="sm"
                                className="gap-2 rounded-lg border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 transition-all duration-200"
                            >
                                <FileBarChart className="h-3.5 w-3.5" />
                                Generar Informe Semanal
                            </Button>
                            {messages.length > 0 && (
                                <Button
                                    onClick={clearChat}
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 rounded-lg text-muted-foreground hover:text-red-400 transition-all duration-200 ml-auto"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Borrar historial
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default MentorIA;
