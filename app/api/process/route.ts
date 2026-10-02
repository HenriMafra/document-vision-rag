import { embed, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

const extracaoSchema = z.object({
  resumo: z
    .string()
    .describe("Sumario executivo do documento em ate 3 frases, em portugues."),
  entidades: z
    .array(
      z.object({
        tipo: z.enum(["pessoa", "data", "valor", "local", "orgao", "outro"]),
        valor: z.string(),
      })
    )
    .describe("Entidades nomeadas encontradas no documento."),
  nivel_confianca: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confianca geral da transcricao entre 0 e 1, considerando legibilidade, danos e caligrafia."
    ),
  transcricao_literal: z
    .string()
    .describe(
      "Transcricao fiel do texto visivel. Usar [ILEGIVEL] para trechos irrecuperaveis. Preservar ortografia de epoca."
    ),
});

export async function POST(req: Request) {
  try {
    const { imageBase64, nomeArquivo } = (await req.json()) as {
      imageBase64?: string;
      nomeArquivo?: string;
    };

    if (!imageBase64) {
      return Response.json(
        { error: "Campo imageBase64 e obrigatorio." },
        { status: 400 }
      );
    }

    // 1. Extracao estruturada via OpenAI Vision (GPT-4o)
    const { object: extracao } = await generateObject({
      model: openai("gpt-4o"),
      schema: extracaoSchema,
      messages: [
        {
          role: "system",
          content:
            "Es um transcritor especializado em documentos historicos brasileiros (cartorios, processos, contratos datilografados, manuscritos). " +
            "Transcreve APENAS o que e visualmente verificavel. NUNCA inventes, estimes ou completes caracteres apagados ou ilegiveis: " +
            "marca-os com [ILEGIVEL]. Preserva a ortografia de epoca sem modernizar. Assinaturas manuscritas sao marcadas como [ASSINATURA], nunca transcritas.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analisa este documento historico digitalizado e extrai os dados estruturados conforme o schema.",
            },
            { type: "image", image: imageBase64 },
          ],
        },
      ],
    });

    // 2. Embedding do conteudo extraido (1536 dimensoes)
    const { embedding } = await embed({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      value: `${extracao.resumo}\n\n${extracao.transcricao_literal}`,
    });

    // 3. Persistencia no Neon (pgvector)
    const sql = getDb();
    const rows = await sql`
      INSERT INTO documentos
        (nome_arquivo, resumo, entidades, nivel_confianca, transcricao_literal, embedding)
      VALUES
        (${nomeArquivo ?? "documento-sem-nome"},
         ${extracao.resumo},
         ${JSON.stringify(extracao.entidades)}::jsonb,
         ${extracao.nivel_confianca},
         ${extracao.transcricao_literal},
         ${JSON.stringify(embedding)}::vector)
      RETURNING id
    `;

    return Response.json({ id: rows[0].id, ...extracao });
  } catch (err) {
    console.error("[/api/process] Falha no processamento:", err);
    return Response.json(
      { error: "Falha ao processar o documento. Verifique OPENAI_API_KEY e DATABASE_URL." },
      { status: 500 }
    );
  }
}
