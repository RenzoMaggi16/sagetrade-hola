import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BrainCircuit, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface AnalysisResult {
  resumen: string;
  fortalezas: string[];
  areas_mejora: string[];
  consejos: string[];
  patron_emocional: string;
}

const AnalisisIA = () => {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyzeClick = async () => {
    setLoading(true);
    try {
      // 1. Obtener trades directamente desde el cliente
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Debes iniciar sesión para realizar el análisis");
        setLoading(false);
        return;
      }

      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);

      if (tradesError) throw new Error(tradesError.message);

      if (!trades || trades.length === 0) {
        toast.warning("No tienes operaciones registradas para analizar.");
        setLoading(false);
        return;
      }

      // 2. Preparar el Prompt (Misma lógica que teníamos en el servidor)
      const tradesJson = JSON.stringify(trades);
      const prompt = `
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
      `;

      // 3. Llamar a Gemini API directamente (Client-side) con Fallback de Modelos
      // NOTA: Usamos la key proporcionada directamente
      const API_KEY = "AIzaSyCO2O9-o4rH1P86emsnfyl4feFzjF3Rp_k";

      const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro"
      ];

      let response;
      let usedModel = "";
      let errorDetails = "";

      for (const model of modelsToTry) {
        try {
          console.log(`Intentando modelo: ${model}...`);
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });

          if (res.ok) {
            response = res;
            usedModel = model;
            break;
          } else {
            const txt = await res.text();
            console.warn(`Modelo ${model} falló:`, txt);
            errorDetails += `[${model}: ${res.status}] `;
          }
        } catch (e) {
          console.warn(`Error de red con modelo ${model}:`, e);
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Todos los modelos fallaron. Detalles: ${errorDetails}`);
      }

      const data = await response.json();
      console.log("Modelo exitoso:", usedModel);

      // 4. Parsear respuesta
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("La IA no devolvió resultados.");
      }

      const textResponse = data.candidates[0].content.parts[0].text;

      // Limpiar JSON (quitar backticks si existen)
      const cleanedJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

      let parsedResult: AnalysisResult;
      try {
        parsedResult = JSON.parse(cleanedJson);
      } catch (e) {
        console.error("Error parseando JSON:", cleanedJson);
        throw new Error("Error formato de respuesta de IA.");
      }

      setAnalysisResult(parsedResult);
      toast.success("Análisis completado con éxito");

    } catch (error) {
      console.error("Error al analizar operaciones:", error);
      toast.error("Error al analizar: " + (error.message || "Desconocido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 rounded-md bg-secondary text-foreground hover:bg-secondary/80 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="p-3 rounded-xl bg-primary/10 mr-3">
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Análisis con Inteligencia Artificial</h1>
        </div>

        {!analysisResult && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Analiza tu historial de trading</CardTitle>
              <CardDescription>
                Nuestra IA analizará tus operaciones y te proporcionará insights valiosos para mejorar tu desempeño.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleAnalyzeClick}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando operaciones...
                  </>
                ) : (
                  "Analizar Mis Operaciones"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {analysisResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen General</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{analysisResult.resumen}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>✅ Fortalezas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {analysisResult.fortalezas.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📈 Áreas de Mejora</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {analysisResult.areas_mejora.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💡 Consejos Accionables</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {analysisResult.consejos.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🧠 Patrón Emocional</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{analysisResult.patron_emocional}</p>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button onClick={() => setAnalysisResult(null)} variant="outline">
                Realizar nuevo análisis
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalisisIA;