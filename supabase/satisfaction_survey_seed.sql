-- ================================================================
-- Sondage de satisfaction Nouveau Concept — Seed
-- Exécutez ce SQL dans l'éditeur SQL de votre projet Supabase
-- ================================================================

DO $$
DECLARE
  v_survey_id uuid;
BEGIN
  INSERT INTO public.surveys (title, description, slug, is_active)
  VALUES (
    'Sondage de satisfaction – Nouveau Concept',
    'Aidez-nous à améliorer nos services en répondant à ce questionnaire. Cela prend moins de 2 minutes.',
    'satisfaction-nouveau-concept',
    true
  )
  RETURNING id INTO v_survey_id;

  INSERT INTO public.survey_questions (survey_id, question_text, question_type, options, required, "order")
  VALUES
    (v_survey_id,
     'Comment évaluez-vous votre expérience globale avec Nouveau Concept ?',
     'rating', '[]', true, 0),

    (v_survey_id,
     'Quelle est la probabilité que vous recommandiez Nouveau Concept à un proche ou un collègue ?',
     'nps', '[]', true, 1),

    (v_survey_id,
     'Le processus de réservation était-il simple ?',
     'choice', '["Très simple","Simple","Moyen","Difficile","Très difficile"]', false, 2),

    (v_survey_id,
     'Le véhicule est-il arrivé à l''heure prévue ?',
     'choice', '["Oui","Quelques minutes de retard","Plus de 15 minutes de retard"]', false, 3),

    (v_survey_id,
     'Comment jugez-vous l''état du véhicule ?',
     'choice', '["Excellent","Très bon","Bon","Moyen","Mauvais"]', false, 4),

    (v_survey_id,
     'Le véhicule était-il propre ?',
     'rating', '[]', false, 5),

    (v_survey_id,
     'Comment évaluez-vous le professionnalisme du chauffeur ?',
     'rating', '[]', false, 6),

    (v_survey_id,
     'Vous êtes-vous senti(e) en sécurité durant le trajet ?',
     'rating', '[]', false, 7),

    (v_survey_id,
     'Comment jugez-vous le rapport qualité/prix ?',
     'choice', '["Excellent","Bon","Correct","Faible"]', false, 8),

    (v_survey_id,
     'Avez-vous une suggestion ou un commentaire pour améliorer nos services ?',
     'text', '[]', false, 9);

  RAISE NOTICE 'Sondage créé avec succès ! ID = %', v_survey_id;
END $$;
