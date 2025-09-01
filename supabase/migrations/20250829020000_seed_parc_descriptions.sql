-- Seed parc_description for known activities
-- Adjust patterns to match exact names in your DB if needed

-- Luge (été / luges)
update public.activities
set parc_description = '• Interdit aux enfants de moins de 2 ans; • Interdit aux femmes enceintes; • 2 enfants ne peuvent pas monter sur une même luge; • Les enfants de moins d’’1m40 doivent être accompagnés d’’un adulte; • La piste peut fermer si elle est humide.'
where name ~* '(\\bluge\\b)';
-- Poney
update public.activities
set parc_description = '• À partir de 9 mois et demi; • Poids maximum 40 kg; • Casque d’’équitation obligatoire (fourni sur place).'
where name ~* '(poney|pony)';
-- Trottinette électrique tout terrain
update public.activities
set parc_description = '• Caution obligatoire; • À partir de 7 ans; • Savoir faire du vélo; • Casque obligatoire.'
where name ~* '(trott?inette|trotinette|trottinette)';
-- Tir à l''arc
update public.activities
set parc_description = '• Taille minimale 1m20.'
where name ~* '(tir\\s*à\\s*l\''?arc|tir\\s*a\\s*l\''?arc|arc)';
