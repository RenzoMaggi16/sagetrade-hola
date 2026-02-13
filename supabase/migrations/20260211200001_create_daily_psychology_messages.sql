-- Create daily_psychology_messages table
create table if not exists public.daily_psychology_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz default now()
);

-- Insert 30+ default messages
insert into public.daily_psychology_messages (message) values
('El trading es 10% comprar, 10% vender y 80% esperar.'),
('No persigas el precio, deja que el precio venga a ti.'),
('Tu trabajo no es predecir el futuro, sino reaccionar a lo que ves.'),
('Un buen trader no tiene miedo de perder, tiene miedo de no seguir su plan.'),
('La disciplina es el puente entre tus metas y tus logros.'),
('El mercado es un dispositivo para transferir dinero del impaciente al paciente.'),
('Si no tienes un plan, estás planeando fallar.'),
('Acepta las pérdidas como parte del negocio.'),
('La consistencia es la clave del éxito en el trading.'),
('No operes por venganza después de una pérdida.'),
('Protege tu capital antes de pensar en ganancias.'),
('El mejor trade es a veces no hacer nada.'),
('Controla tus emociones o ellas te controlarán a ti.'),
('La paciencia paga.'),
('Opera lo que ves, no lo que piensas.'),
('El riesgo es lo único que puedes controlar realmente.'),
('No te enamores de una posición.'),
('Deja correr las ganancias y corta rápido las pérdidas.'),
('El mercado siempre tiene la razón.'),
('La humildad te mantendrá en el juego.'),
('Cada trade es independiente del anterior.'),
('No arriesgues más de lo que estás dispuesto a perder.'),
('La sobreoperativa es el enemigo silencioso.'),
('Mantén tu diario de trading actualizado.'),
('Aprende a disfrutar el proceso, no solo el resultado.'),
('La confianza se construye trade a trade siguiendo tu plan.'),
('El miedo a perder te hará perder.'),
('La avaricia rompe el saco.'),
('Sé un francotirador, no una ametralladora.'),
('El trading es un maratón, no un sprint.'),
('Tu mayor competencia eres tú mismo.'),
('La simplicidad es la máxima sofisticación en el trading.'),
('No dejes que una mala racha defina tu autoestima.'),
('Respeta tu stop loss siempre.'),
('El éxito deja huellas, estudia tus mejores trades.');
