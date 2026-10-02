import {
  convertToModelMessages,
  embed,
  streamText,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  // 1. Recuperar o texto da ultima pergunta do usuario
  const ultimaMensagem = [...messages].reverse().find((m) => m.role === "user");
  const pergunta =
    ultimaMensagem?.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  // 2. Vetorizar a pergunta
  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-3-small"),
    value: pergunta,
  });
  const vetor = JSON.stringify(embedding);

  // 3. Busca por similaridade de cosseno no Neon (operador <=>)
  const sql = getDb();
  const contextos = await sql`
    SELECT
      nome_arquivo,
      resumo,
      transcricao_literal,
      nivel_confianca,
      (1 - (embedding <=> ${vetor}::vector))::real AS similaridade
    FROM documentos
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vetor}::vector
    LIMIT 4
  `;

  const contexto = contextos
    .map(
      (c, i) =>
        `[Documento ${i + 1}: ${c.nome_arquivo} | similaridade ${Number(c.similaridade).toFixed(2)} | confianca OCR ${Number(c.nivel_confianca ?? 0).toFixed(2)}]\n` +
        `Resumo: ${c.resumo}\n` +
        `Transcricao literal:\n${c.transcricao_literal}`
    )
    .join("\n\n---\n\n");

  // 4. Geracao ancorada (RAG) com streaming
  const result = streamText({
    model: openai("gpt-4o"),
    system:
      "Es um assistente de analise de documentos historicos brasileiros. Regras inviolaveis:\n" +
      "1. Responde EXCLUSIVAMENTE com base nos trechos em <contexto>. O teu conhecimento geral nao e fonte para factos documentais.\n" +
      '2. Se a informacao nao constar do contexto, responde exatamente: "A informacao nao consta dos documentos analisados."\n' +
      "3. Trechos marcados [ILEGIVEL] sao lacunas fisicas do original: NUNCA completes, estimes ou infiras o conteudo dessas lacunas.\n" +
      "4. Cita sempre o documento de origem das afirmacoes (ex.: [Documento 2]).\n" +
      "5. Preserva a ortografia de epoca em citacoes literais.\n\n" +
      `<contexto>\n${contexto || "Nenhum documento indexado ate ao momento."}\n</contexto>`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
