"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileUp,
  Loader2,
  MessageSquareText,
  ScanText,
  Send,
} from "lucide-react";

type Entidade = {
  tipo: "pessoa" | "data" | "valor" | "local" | "orgao" | "outro";
  valor: string;
};

type Extracao = {
  id: number;
  resumo: string;
  entidades: Entidade[];
  nivel_confianca: number;
  transcricao_literal: string;
};

function BadgeConfianca({ nivel }: { nivel: number }) {
  const pct = Math.round(nivel * 100);
  const cor =
    nivel >= 0.85
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : nivel >= 0.6
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cor}`}>
      Confianca {pct}%{nivel < 0.85 ? " — revisao humana recomendada" : ""}
    </span>
  );
}

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [extracao, setExtracao] = useState<Extracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat();
  const ocupado = status === "submitted" || status === "streaming";

  async function processarArquivo(file: File) {
    setErro(null);
    setExtracao(null);
    setProcessando(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setPreview(dataUrl);

      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, nomeArquivo: file.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha no processamento.");
      setExtracao(json as Extracao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao processar o documento.");
    } finally {
      setProcessando(false);
    }
  }

  function enviarPergunta(e: React.FormEvent) {
    e.preventDefault();
    const texto = input.trim();
    if (!texto || ocupado) return;
    sendMessage({ text: texto });
    setInput("");
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b px-6 py-3">
        <h1 className="text-lg font-bold tracking-tight">
          Palimpsesto <span className="text-muted-foreground">MVP</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Analise semantica de documentos historicos — OCR multimodal + RAG (Neon pgvector)
        </p>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2">
        {/* ===================== LADO ESQUERDO: INGESTAO ===================== */}
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanText className="h-4 w-4" /> Documento &amp; Extracao
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <ScrollArea className="h-full pr-3">
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:bg-muted/50"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para enviar a imagem do documento (PNG/JPG)
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void processarArquivo(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Pre-visualizacao do documento"
                  className="mt-4 max-h-64 w-full rounded-md border object-contain"
                />
              )}

              {processando && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A processar: visao GPT-4o → embedding → Neon…
                </div>
              )}

              {erro && (
                <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {erro}
                </p>
              )}

              {extracao && (
                <div className="mt-4 space-y-4">
                  <BadgeConfianca nivel={extracao.nivel_confianca} />

                  <section>
                    <h3 className="mb-1 text-sm font-semibold">Resumo executivo</h3>
                    <p className="text-sm text-muted-foreground">{extracao.resumo}</p>
                  </section>

                  <section>
                    <h3 className="mb-1 text-sm font-semibold">
                      Entidades ({extracao.entidades.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {extracao.entidades.map((ent, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs"
                          title={ent.tipo}
                        >
                          <b className="uppercase text-muted-foreground">{ent.tipo}</b>{" "}
                          {ent.valor}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-1 text-sm font-semibold">Transcricao literal</h3>
                    <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">
                      {extracao.transcricao_literal}
                    </pre>
                  </section>

                  <section>
                    <h3 className="mb-1 text-sm font-semibold">JSON bruto</h3>
                    <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                      {JSON.stringify(extracao, null, 2)}
                    </pre>
                  </section>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ===================== LADO DIREITO: CHAT RAG ===================== */}
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-4 w-4" /> Chat com o acervo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <ScrollArea className="min-h-0 flex-1 pr-3">
              {messages.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Envie um documento e faca perguntas como:
                  <br />
                  «Quem sao as partes deste contrato?»
                  <br />
                  «Qual a data e o valor da transacao?»
                </p>
              )}
              <div className="space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {m.parts.map((p, i) =>
                      p.type === "text" ? <span key={i}>{p.text}</span> : null
                    )}
                  </div>
                ))}
                {status === "submitted" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> A consultar o acervo…
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={enviarPergunta} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo ao documento…"
                disabled={ocupado}
              />
              <Button type="submit" size="icon" disabled={ocupado || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
