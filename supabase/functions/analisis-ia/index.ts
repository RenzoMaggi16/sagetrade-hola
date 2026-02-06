// supabase/functions/analisis-ia/index.ts
// --- VERSIÓN FINAL Y FUNCIONAL ---

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_AI_KEY') || 'AIzaSyCO2O9-o4rH1P86emsnfyl4feFzjF3Rp_k';
// Usamos gemini-1.5-flash que es más rápido y estable para este caso de uso
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`

// El prompt maestro que le daremos a la IA
const getAnalysisPrompt = (tradesJson: string) => `
  Actúa como un coach de trading profesional y un analista de datos experto. Tu misión es analizar el siguiente historial de operaciones de un trader y proporcionarle un feedback personalizado, objetivo y accionable.

  Aquí están los datos de las operaciones en formato JSON:
  ${tradesJson}

  Basado en estos datos, por favor, realiza el siguiente análisis y responde ÚNICAMENTE con un objeto JSON válido que siga esta estructura exacta:
  {
    "resumen": "Un párrafo breve (2-3 líneas) que resuma el rendimiento general y el comportamiento observado del trader.",
    "fortalezas": [
      "Identifica y describe la mayor fortaleza del trader (ej. 'Buena gestión de la ganancia, tus profits son 2.5x mayores que tus pérdidas').",
      "Identifica y describe una segunda fortaleza (ej. 'Excelente disciplina en tus reglas de entrada.')"
    ],
    "areas_mejora": [
      "Identifica y describe la debilidad o el área de mejora más importante (ej. 'Tiendes a sobre-operar después de una pérdida grande.').",
      "Identifica y describe una segunda área de mejora (ej. 'Los días martes son consistentemente negativos para ti.')"
    ],
    "consejos": [
      "Proporciona un consejo práctico y directo basado en las áreas de mejora.",
      "Proporciona un segundo consejo práctico."
    ],
    "patron_emocional": "Analiza la correlación entre la columna 'emocion' (si existe) y el 'pnl_neto'. Describe si las emociones registradas están impactando los resultados y ofrece un consejo breve."
  }
`

serve(async (req) => {
  // Manejo de la solicitud CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 0. Validar API Key de Google
    if (!GOOGLE_API_KEY) {
      console.error("Falta la variable de entorno GOOGLE_AI_KEY");
      return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta (Falta API Key de IA)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 1. Crear el cliente de Supabase y autenticar al usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 2. Obtener los trades del usuario
    const { data: trades, error: tradesError } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)

    if (tradesError) {
      throw new Error(tradesError.message)
    }

    // 3. ¡IMPORTANTE! Manejar el caso de 0 trades
    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ error: 'No tienes operaciones registradas para analizar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Usamos 400 (Bad Request) que es más descriptivo
      })
    }

    // 4. Construir el prompt y llamar a la API de Gemini
    const tradesJson = JSON.stringify(trades)
    const prompt = getAnalysisPrompt(tradesJson)

    const geminiReqBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiReqBody),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("Error de Gemini API:", errorText)
      throw new Error(`Error de la API de IA: ${geminiResponse.status} ${geminiResponse.statusText}`)
    }

    const geminiResult = await geminiResponse.json()

    // 5. Extraer y parsear la respuesta de la IA
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
      throw new Error("La IA no devolvió candidatos.");
    }

    const analysisText = geminiResult.candidates[0].content.parts[0].text
    // Limpiar el string de cualquier markdown (```json ... ```) que la IA pueda añadir
    const cleanedJsonText = analysisText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    let analysisJson;
    try {
      analysisJson = JSON.parse(cleanedJsonText)
    } catch (e) {
      console.error("Error parseando JSON de IA:", cleanedJsonText);
      throw new Error("La IA devolvió un formato inválido. Inténtalo de nuevo.");
    }

    // 6. Devolver el análisis real al frontend
    return new Response(JSON.stringify(analysisJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Error en function analisis-ia:", error)
    return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor de análisis' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})