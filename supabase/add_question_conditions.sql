-- Ajouter la colonne condition aux questions de sondage
-- À exécuter dans l'éditeur SQL de votre projet Supabase

ALTER TABLE public.survey_questions
ADD COLUMN IF NOT EXISTS condition jsonb;

-- Exemple de structure JSON stockée :
-- { "q_order": 0, "op": "lte", "val": 3 }
-- q_order = index (0-based) de la question de référence
-- op      = "lte" | "gte" | "eq" | "neq"
-- val     = valeur à comparer (nombre ou texte)
