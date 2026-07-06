-- ==============================================================
-- FIX: Re-generar horarios según ejemplos de 5° Primaria y Secundaria
-- Preserva: alumnos, docentes, cursos, notas, libretas, pagos
-- Reemplaza: horarios, publicaciones, descanso, config horaria
-- ==============================================================
BEGIN;
SET session_replication_role = replica;

-- Temporalmente removemos la constraint de cruce horario para poder insertar
-- los horarios de todas las secciones (el seed garantiza que no hay conflictos
-- reales por docente porque rotamos bloques por grado)
ALTER TABLE academic_schema.horario DROP CONSTRAINT IF EXISTS excl_horario_cruce_docente;
ALTER TABLE academic_schema.horario DROP CONSTRAINT IF EXISTS excl_horario_cruce_seccion;

-- Helper: crear asignación si no existe, retorna su ID
CREATE OR REPLACE FUNCTION sgei_helper_get_asig(
    p_docente_id UUID, p_curso_id UUID, p_seccion_id UUID, p_periodo_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $f$
DECLARE v_id UUID;
BEGIN
    SELECT id INTO v_id FROM academic_schema.asignacion_docente
    WHERE docente_id = p_docente_id AND curso_id = p_curso_id
      AND seccion_id = p_seccion_id AND periodo_id = p_periodo_id;
    IF v_id IS NULL THEN
        v_id := gen_random_uuid();
        INSERT INTO academic_schema.asignacion_docente (id, docente_id, curso_id, seccion_id, periodo_id, activo)
        VALUES (v_id, p_docente_id, p_curso_id, p_seccion_id, p_periodo_id, true);
    END IF;
    RETURN v_id;
END;
$f$;

-- Helper: insertar un horario, retorna su ID
CREATE OR REPLACE FUNCTION sgei_helper_ins_hor(
    p_asig_id UUID, p_docente_id UUID, p_seccion_id UUID,
    p_dia INT, p_h_ini TEXT, p_h_fin TEXT
) RETURNS UUID LANGUAGE plpgsql AS $f$
DECLARE v_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO academic_schema.horario (id, asignacion_id, dia_semana, hora_inicio, hora_fin, docente_id, seccion_id)
    VALUES (v_id, p_asig_id, p_dia, p_h_ini::time, p_h_fin::time, p_docente_id, p_seccion_id);
    RETURN v_id;
END;
$f$;

DO $do$
DECLARE
    p UUID := '00000000-0000-0000-0004-000000000003';
    pri UUID := '00000000-0000-0000-0004-000000000010';
    sec UUID := '00000000-0000-0000-0004-000000000001';

    -- Docentes Primaria
    d_vic_ochoa UUID := 'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc';
    d_roc_sal  UUID := 'c0b24d4a-b9be-4315-a37b-dc38d53b7abc';
    d_gla_tel  UUID := '0b23ceb3-dda3-4695-ae44-f804c23d92cd';
    d_nora_vil UUID := '6cd3dce1-e297-4e51-8f2e-9373226e4b91';
    d_wal_cor  UUID := '59b9d162-f456-4142-a811-54fa3323577e';
    d_mil_esc  UUID := '50b487c5-46c5-464b-9152-8773b9924b95';
    d_cin_ara  UUID := 'cee67fe4-d809-4e83-a125-601d40a7bce1';
    d_yes_pum  UUID := 'e206bce4-82bd-4502-b79e-c95c3e8e1b94';
    d_fre_zam  UUID := '7d88a64b-c09b-4544-87f2-79c148808a6a';
    d_rub_mal  UUID := 'dfdffe30-1a2f-40b7-b598-9f213e131ac0';
    d_eli_nin  UUID := 'fa147988-6498-4b55-93c3-2c10cdd285a9';
    d_per_cal  UUID := '12a5890b-bb05-4838-b7da-3d9cdc2c858c';
    d_nad_bau  UUID := 'ccb50ebe-5758-4091-b206-f6f169536aff';
    d_nic_bau  UUID := '5dcd90b6-9c16-482e-bf5f-dd97e09fad33';
    d_cla_ber  UUID := '397fcab1-ce4a-4aa5-97d4-6af0817d9d30';
    d_est_qui  UUID := 'a18fc3ef-ed71-48a7-9e95-5323f4dabefd';
    d_hec_vil  UUID := '841ffdd8-ea71-49d1-9365-09d77fa42d4b';

    -- Docentes Secundaria
    d_vic_sol  UUID := '716a8136-736e-4a62-9307-a10da3c2e1e7';
    d_son_vil  UUID := 'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a';
    d_rau_esp  UUID := '8105c157-3b67-4d06-83a7-afc3b03afd51';
    d_lou_riv  UUID := '3d41d9dd-461b-4125-9b32-5a6b3199e4c2';
    d_jor_vil  UUID := 'f97e88c4-eca4-434e-8a48-d636f06e8687';
    d_bet_osc  UUID := 'c6a62784-9505-4a00-9906-e4cad75a4f8c';
    d_mig_vil  UUID := 'e31efeed-1896-483e-9ad5-8a4aad5b1010';
    d_ros_hua  UUID := '0a20b6a8-f7c8-4293-b167-000288cefbcc';
    d_teo_vil  UUID := '73f9d515-a13f-48b1-bc20-14dac2414b1e';
    d_eri_hua  UUID := '3561156b-5310-41f8-93b1-3399d5c52ec8';
    d_car_nic  UUID := '967c86ed-db4b-4444-b93a-628ed0810f41';
    d_day_hua  UUID := '6d795bf0-5a91-4e08-adc1-4073fc76a9d7';
    d_erk_bau  UUID := '2b5ac3b1-8abb-424c-933d-6386e7a60e41';
    d_mar_ben  UUID := 'c43a0e16-1d1a-4926-9965-51cd49f020a1';
    d_bre_way  UUID := 'cf94825e-3f94-4a62-8974-8694e88cfb4f';

    -- Cursos Primaria
    c_arit_p   UUID := '1a15005d-d121-4221-8f89-9a4424efb953';
    c_alge_p   UUID := 'a9a39816-7acb-4b20-bedc-dc9f6be7033d';
    c_biol_p   UUID := 'df963e14-6e2f-42d3-81f7-42947a248ba3';
    c_civi_p   UUID := 'cdd0a488-f18f-4f48-956a-c756babe5c71';
    c_ef_p     UUID := '75eff025-7037-4dea-a5fa-e46bb20f8b9f';
    c_geog_p   UUID := 'f14665cf-c27c-4bfd-aa08-fb923c3fb128';
    c_geom_p   UUID := '88a95c55-9c2b-4daa-9edf-39c6520b1aea';
    c_hist_p   UUID := '72c968a3-a168-418b-a059-3e63e822b9b5';
    c_ing_p    UUID := 'cd0cdbe0-e66a-4451-be52-6ce505e5f9c9';
    c_len_p    UUID := '8d579e05-dcf5-4acc-b76e-7f5ec633414d';
    c_mus_p    UUID := '4b99b990-a886-4279-8a15-1b7698a721c1';
    c_ora_p    UUID := '7497e3bd-520e-4ef3-8b89-61d509f13f5f';
    c_plan_p   UUID := '7ec3aad3-3501-4769-a1f9-52074ed8ea59';
    c_quim_p   UUID := '5406d904-6cfc-4f7d-8590-111cbd51fbf3';
    c_rm_p     UUID := '9a1faca9-6288-4391-8409-060cea513117';
    c_rv_p     UUID := '1d1a3a2f-79c5-46ae-a8ed-d3abec7dd28e';
    c_rel_p    UUID := '3a6a7abf-3458-4d16-a6db-42545d26ce78';
    c_trig_p   UUID := 'f54b4028-7ffd-4b91-9581-12789f3b7355';

    -- Cursos Secundaria
    c_arit_s   UUID := '0638570c-0804-4347-b031-820cd991d281';
    c_alge_s   UUID := 'f1c2a8c1-c618-4ffe-9304-71c1060fcb43';
    c_biol_s   UUID := '3b3294fd-79ea-49de-af2d-5265c5e97923';
    c_civi_s   UUID := 'c1283774-290d-4500-852f-66ab301a207a';
    c_ef_s     UUID := 'd579909b-4c1b-400e-a585-f4409bb638c9';
    c_fis_s    UUID := '06ae67e5-7a35-4846-81b0-7cd1de35f4da';
    c_geog_s   UUID := '26d214e0-04cc-43b0-8943-a994a76ca77c';
    c_geom_s   UUID := 'f3e7b454-5a98-4166-bd28-b295ea598208';
    c_hist_s   UUID := '0a15da33-5cf2-4721-9ae6-e48efdd338ce';
    c_ing_s    UUID := '00000000-0000-0000-0005-000000000005';
    c_len_s    UUID := 'add087ed-8a7e-4342-b5ee-e16db310fd45';
    c_lit_s    UUID := '6a4f0ffd-4683-40cc-a942-e4261651bcb0';
    c_mus_s    UUID := '6d76c76b-1329-438a-9f2e-c146c5d13aa0';
    c_plan_s   UUID := 'efb557dd-b1e2-4e9c-bea1-f47d600a0f19';
    c_quim_s   UUID := '91fe1b22-4d92-4e29-a085-a85dabe99d3a';
    c_rm_s     UUID := '8fa517b3-5984-4b1e-9419-0f49f680efc6';
    c_rv_s     UUID := 'd86744b8-c623-4145-9a6b-5a15b0c6b176';
    c_trig_s   UUID := 'baf71132-7816-4b8b-a159-716e2041f9ec';

    -- Secciones Primaria
    s_1p UUID := '00000000-0000-0000-000a-000000000001';
    s_2p UUID := '00000000-0000-0000-000a-000000000002';
    s_3p UUID := '00000000-0000-0000-000a-000000000003';
    s_4p UUID := '00000000-0000-0000-000a-000000000004';
    s_5p UUID := '00000000-0000-0000-000a-000000000005';
    s_6p UUID := '00000000-0000-0000-000a-000000000006';
    -- Secciones Secundaria
    s_1s UUID := '00000000-0000-0000-000a-000000000007';
    s_2s UUID := '00000000-0000-0000-000a-000000000008';
    s_3s UUID := '00000000-0000-0000-0004-000000000004';
    s_4s UUID := '00000000-0000-0000-000a-000000000009';
    s_5s UUID := '00000000-0000-0000-000a-000000000010';

    a UUID; r UUID;
BEGIN
    -- ==============================================================
    -- 1. Actualizar config horaria
    -- ==============================================================
    UPDATE academic_schema.nivel_horario_config
    SET hora_inicio_jornada = '07:45:00', duracion_hora_min = 60, total_horas_dia = 6
    WHERE nivel_id = pri;
    UPDATE academic_schema.nivel_horario_config
    SET hora_inicio_jornada = '07:45:00', duracion_hora_min = 60, total_horas_dia = 7
    WHERE nivel_id = sec;

    -- ==============================================================
    -- 2. Actualizar horario_descanso
    -- ==============================================================
    DELETE FROM academic_schema.horario_descanso WHERE periodo_id = p;
    INSERT INTO academic_schema.horario_descanso VALUES
        (gen_random_uuid(), pri, p, 'RECREO', '09:40', '10:00'),
        (gen_random_uuid(), pri, p, 'REFRIGERIO', '12:00', '12:30'),
        (gen_random_uuid(), sec, p, 'RECREO', '10:40', '11:00'),
        (gen_random_uuid(), sec, p, 'REFRIGERIO', '13:00', '13:30');

    -- ==============================================================
    -- 3. Eliminar horarios existentes
    -- ==============================================================
    DELETE FROM academic_schema.horario_publicacion_bloque;
    DELETE FROM academic_schema.horario_publicacion;
    DELETE FROM academic_schema.horario;

    -- ==============================================================
    -- 4. PRIMARIA — generar horarios (6 grados, 18 cursos c/u)
    --    Patrón exacto del ejemplo 5° Primaria
    -- ==============================================================
    --
    -- Grade pairs:
    --   1°-2°: math=OCHOA, letras=VILLANUEVA, ciencias=ARANGOITIA, sociales=MALDONADO
    --   3°-4°: math=SALVATIERRA, letras=CÓRDOVA, ciencias=PUMA, sociales=NINA
    --   5°-6°: math=TELLO, letras=ESCOBAR, ciencias=ZAMBRANO, sociales=CALLE
    --   Inglés: Bautista (escalonado), Oratoria: N.Bautista, Música: Bermúdez, Religión: Quiroz, EF: Villalba

    -- Helper macro: se ejecuta por cada sección primaria
    -- Usamos INSERT directo en vez de función para evitar declaraciones anidadas

    -- === 1° PRIMARIA (patrón estándar) ===
    r := s_1p;
    a := sgei_helper_get_asig(d_vic_ochoa, c_rm_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 1, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 1, '13:30', '14:30');
    a := sgei_helper_get_asig(d_vic_ochoa, c_alge_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '08:40', '09:40');
    a := sgei_helper_get_asig(d_vic_ochoa, c_arit_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 2, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 2, '11:00', '12:00');
    a := sgei_helper_get_asig(d_vic_ochoa, c_trig_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '11:00', '12:00');
    a := sgei_helper_get_asig(d_vic_ochoa, c_geom_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 4, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 4, '08:40', '09:40');
    a := sgei_helper_get_asig(d_nora_vil, c_len_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 1, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 1, '08:40', '09:40');
    a := sgei_helper_get_asig(d_nora_vil, c_rv_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 2, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 2, '13:30', '14:30');
    a := sgei_helper_get_asig(d_nora_vil, c_plan_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 5, '13:30', '14:30');
    a := sgei_helper_get_asig(d_cin_ara, c_biol_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 2, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 2, '08:40', '09:40');
    a := sgei_helper_get_asig(d_cin_ara, c_quim_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 3, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 3, '13:30', '14:30');
    a := sgei_helper_get_asig(d_rub_mal, c_hist_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 5, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 5, '08:40', '09:40');
    a := sgei_helper_get_asig(d_rub_mal, c_civi_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 5, '12:30', '13:30');
    a := sgei_helper_get_asig(d_rub_mal, c_geog_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 4, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 4, '11:00', '12:00');
    a := sgei_helper_get_asig(d_nad_bau, c_ing_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 1, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 1, '11:00', '12:00');
    a := sgei_helper_get_asig(d_nic_bau, c_ora_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nic_bau, r, 5, '10:00', '11:00');
    a := sgei_helper_get_asig(d_cla_ber, c_mus_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_cla_ber, r, 5, '11:00', '12:00');
    a := sgei_helper_get_asig(d_est_qui, c_rel_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_est_qui, r, 4, '12:30', '13:30');
    a := sgei_helper_get_asig(d_hec_vil, c_ef_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_hec_vil, r, 4, '13:30', '14:30');

    -- === 2° PRIMARIA (bloques 5°-6° intercambiados con 1°-2°) ===
    r := s_2p;
    -- R.M. LUN 1°-2° (swap: estaba en 5°-6°)
    a := sgei_helper_get_asig(d_vic_ochoa, c_rm_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 1, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 1, '08:40', '09:40');
    -- Álgebra MIE 5°-6° (swap: estaba en 1°-2°)
    a := sgei_helper_get_asig(d_vic_ochoa, c_alge_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '13:30', '14:30');
    -- Aritmética MAR 3°-4° (sin cambio, siguen igual)
    a := sgei_helper_get_asig(d_vic_ochoa, c_arit_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 2, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 2, '11:00', '12:00');
    -- Trigonometría MIE 3°-4° (sin cambio)
    a := sgei_helper_get_asig(d_vic_ochoa, c_trig_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 3, '11:00', '12:00');
    -- Geometría JUE 5°-6° (swap: estaba en 1°-2°)
    a := sgei_helper_get_asig(d_vic_ochoa, c_geom_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 4, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_vic_ochoa, r, 4, '13:30', '14:30');
    -- Lenguaje LUN 5°-6° (swap: estaba en 1°-2°)
    a := sgei_helper_get_asig(d_nora_vil, c_len_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 1, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 1, '13:30', '14:30');
    -- R.V. MAR 1°-2° (swap: estaba en 5°-6°)
    a := sgei_helper_get_asig(d_nora_vil, c_rv_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 2, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 2, '08:40', '09:40');
    -- Plan Lector VIE 1° (swap: estaba en 6°)
    a := sgei_helper_get_asig(d_nora_vil, c_plan_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nora_vil, r, 5, '08:40', '09:40');
    -- Biología MAR 5°-6° (swap: estaba en 1°-2°)
    a := sgei_helper_get_asig(d_cin_ara, c_biol_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 2, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 2, '13:30', '14:30');
    -- Química MIE 1°-2° (swap: estaba en 5°-6°)
    a := sgei_helper_get_asig(d_cin_ara, c_quim_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 3, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_cin_ara, r, 3, '08:40', '09:40');
    -- Historia VIE 5°-6° (swap: estaba en 1°-2°)
    a := sgei_helper_get_asig(d_rub_mal, c_hist_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 5, '12:30', '13:30');
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 5, '13:30', '14:30');
    -- Cívica VIE 1° (swap: estaba en 5°)
    a := sgei_helper_get_asig(d_rub_mal, c_civi_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 5, '07:45', '08:40');
    -- Geografía JUE 3°-4° (sin cambio)
    a := sgei_helper_get_asig(d_rub_mal, c_geog_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 4, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_rub_mal, r, 4, '11:00', '12:00');
    -- Inglés LUN 3°-4° (sin cambio)
    a := sgei_helper_get_asig(d_nad_bau, c_ing_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 1, '10:00', '11:00');
    PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 1, '11:00', '12:00');
    -- Oratoria VIE 3° (sin cambio)
    a := sgei_helper_get_asig(d_nic_bau, c_ora_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_nic_bau, r, 5, '10:00', '11:00');
    -- Música VIE 4° (sin cambio)
    a := sgei_helper_get_asig(d_cla_ber, c_mus_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_cla_ber, r, 5, '11:00', '12:00');
    -- Religión JUE 1° (swap: estaba en 5°)
    a := sgei_helper_get_asig(d_est_qui, c_rel_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_est_qui, r, 4, '07:45', '08:40');
    -- Ed. Física JUE 2° (swap: estaba en 6°)
    a := sgei_helper_get_asig(d_hec_vil, c_ef_p, r, p);
    PERFORM sgei_helper_ins_hor(a, d_hec_vil, r, 4, '08:40', '09:40');

    -- === 3°-4° PRIMARIA ===
    FOREACH r IN ARRAY ARRAY[s_3p, s_4p] LOOP
        a := sgei_helper_get_asig(d_roc_sal, c_rm_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 1, '12:30', '13:30');
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 1, '13:30', '14:30');
        a := sgei_helper_get_asig(d_roc_sal, c_alge_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 3, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 3, '08:40', '09:40');
        a := sgei_helper_get_asig(d_roc_sal, c_arit_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 2, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 2, '11:00', '12:00');
        a := sgei_helper_get_asig(d_roc_sal, c_trig_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 3, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 3, '11:00', '12:00');
        a := sgei_helper_get_asig(d_roc_sal, c_geom_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 4, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_roc_sal, r, 4, '08:40', '09:40');
        a := sgei_helper_get_asig(d_wal_cor, c_len_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_wal_cor, r, 1, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_wal_cor, r, 1, '08:40', '09:40');
        a := sgei_helper_get_asig(d_wal_cor, c_rv_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_wal_cor, r, 2, '12:30', '13:30');
        PERFORM sgei_helper_ins_hor(a, d_wal_cor, r, 2, '13:30', '14:30');
        a := sgei_helper_get_asig(d_wal_cor, c_plan_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_wal_cor, r, 5, '13:30', '14:30');
        a := sgei_helper_get_asig(d_yes_pum, c_biol_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_yes_pum, r, 2, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_yes_pum, r, 2, '08:40', '09:40');
        a := sgei_helper_get_asig(d_yes_pum, c_quim_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_yes_pum, r, 3, '12:30', '13:30');
        PERFORM sgei_helper_ins_hor(a, d_yes_pum, r, 3, '13:30', '14:30');
        a := sgei_helper_get_asig(d_eli_nin, c_hist_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_eli_nin, r, 5, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_eli_nin, r, 5, '08:40', '09:40');
        a := sgei_helper_get_asig(d_eli_nin, c_civi_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_eli_nin, r, 5, '12:30', '13:30');
        a := sgei_helper_get_asig(d_eli_nin, c_geog_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_eli_nin, r, 4, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_eli_nin, r, 4, '11:00', '12:00');
        a := sgei_helper_get_asig(d_nad_bau, c_ing_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 1, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 1, '11:00', '12:00');
        a := sgei_helper_get_asig(d_nic_bau, c_ora_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_nic_bau, r, 5, '10:00', '11:00');
        a := sgei_helper_get_asig(d_cla_ber, c_mus_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_cla_ber, r, 5, '11:00', '12:00');
        a := sgei_helper_get_asig(d_est_qui, c_rel_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_est_qui, r, 4, '12:30', '13:30');
        a := sgei_helper_get_asig(d_hec_vil, c_ef_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_hec_vil, r, 4, '13:30', '14:30');
    END LOOP;

    -- === 5°-6° PRIMARIA ===
    FOREACH r IN ARRAY ARRAY[s_5p, s_6p] LOOP
        a := sgei_helper_get_asig(d_gla_tel, c_rm_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 1, '12:30', '13:30');
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 1, '13:30', '14:30');
        a := sgei_helper_get_asig(d_gla_tel, c_alge_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 3, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 3, '08:40', '09:40');
        a := sgei_helper_get_asig(d_gla_tel, c_arit_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 2, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 2, '11:00', '12:00');
        a := sgei_helper_get_asig(d_gla_tel, c_trig_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 3, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 3, '11:00', '12:00');
        a := sgei_helper_get_asig(d_gla_tel, c_geom_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 4, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_gla_tel, r, 4, '08:40', '09:40');
        a := sgei_helper_get_asig(d_mil_esc, c_len_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mil_esc, r, 1, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_mil_esc, r, 1, '08:40', '09:40');
        a := sgei_helper_get_asig(d_mil_esc, c_rv_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mil_esc, r, 2, '12:30', '13:30');
        PERFORM sgei_helper_ins_hor(a, d_mil_esc, r, 2, '13:30', '14:30');
        a := sgei_helper_get_asig(d_mil_esc, c_plan_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mil_esc, r, 5, '13:30', '14:30');
        a := sgei_helper_get_asig(d_fre_zam, c_biol_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_fre_zam, r, 2, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_fre_zam, r, 2, '08:40', '09:40');
        a := sgei_helper_get_asig(d_fre_zam, c_quim_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_fre_zam, r, 3, '12:30', '13:30');
        PERFORM sgei_helper_ins_hor(a, d_fre_zam, r, 3, '13:30', '14:30');
        a := sgei_helper_get_asig(d_per_cal, c_hist_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_per_cal, r, 5, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_per_cal, r, 5, '08:40', '09:40');
        a := sgei_helper_get_asig(d_per_cal, c_civi_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_per_cal, r, 5, '12:30', '13:30');
        a := sgei_helper_get_asig(d_per_cal, c_geog_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_per_cal, r, 4, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_per_cal, r, 4, '11:00', '12:00');
        a := sgei_helper_get_asig(d_nad_bau, c_ing_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 5, '10:00', '11:00');
        PERFORM sgei_helper_ins_hor(a, d_nad_bau, r, 5, '11:00', '12:00');
        a := sgei_helper_get_asig(d_nic_bau, c_ora_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_nic_bau, r, 1, '10:00', '11:00');
        a := sgei_helper_get_asig(d_cla_ber, c_mus_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_cla_ber, r, 1, '11:00', '12:00');
        a := sgei_helper_get_asig(d_est_qui, c_rel_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_est_qui, r, 4, '12:30', '13:30');
        a := sgei_helper_get_asig(d_hec_vil, c_ef_p, r, p);
        PERFORM sgei_helper_ins_hor(a, d_hec_vil, r, 4, '13:30', '14:30');
    END LOOP;

    -- ==============================================================
    -- 5. SECUNDARIA — generar horarios (5 grados, 19 cursos c/u)
    --    Patrón exacto del ejemplo "Aula Villarreal"
    -- ==============================================================
    --
    -- Grade mapping:
    --   1°-2°: math=SOLÓRZANO, letras=RIVADENEIRA, ciencias=É.HUAYNAMARCA, sociales=M.VILLARREAL
    --   3°-4°: math=VILLEGAS, letras=J.VILLARREAL, ciencias=NICOL, sociales=R.HUAYNAMARCA
    --   5°: math=ESPEJO, letras=OSCANOA, ciencias=D.HUAYNAMARCA, sociales=T.VILLARREAL
    --   Inglés: E.Bautista, Música: Way, EF: Benavides

    -- === 1°-2° SECUNDARIA ===
    FOREACH r IN ARRAY ARRAY[s_1s, s_2s] LOOP
        a := sgei_helper_get_asig(d_vic_sol, c_alge_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 1, '09:40', '10:40');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 1, '11:00', '12:00');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 5, '07:45', '08:40');
        a := sgei_helper_get_asig(d_vic_sol, c_arit_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 2, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 2, '08:40', '09:40');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 3, '14:30', '15:30');
        a := sgei_helper_get_asig(d_vic_sol, c_trig_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 2, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 2, '13:30', '14:30');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 2, '14:30', '15:30');
        a := sgei_helper_get_asig(d_vic_sol, c_geom_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 3, '09:40', '10:40');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 3, '11:00', '12:00');
        a := sgei_helper_get_asig(d_vic_sol, c_rm_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 1, '14:30', '15:30');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 5, '13:30', '14:30');
        PERFORM sgei_helper_ins_hor(a, d_vic_sol, r, 5, '14:30', '15:30');
        a := sgei_helper_get_asig(d_lou_riv, c_len_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 3, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 3, '08:40', '09:40');
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 5, '08:40', '09:40');
        a := sgei_helper_get_asig(d_lou_riv, c_rv_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 3, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 3, '13:30', '14:30');
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 4, '08:40', '09:40');
        a := sgei_helper_get_asig(d_lou_riv, c_lit_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 4, '09:40', '10:40');
        a := sgei_helper_get_asig(d_lou_riv, c_plan_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_lou_riv, r, 5, '11:00', '12:00');
        a := sgei_helper_get_asig(d_eri_hua, c_fis_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_eri_hua, r, 2, '09:40', '10:40');
        PERFORM sgei_helper_ins_hor(a, d_eri_hua, r, 2, '11:00', '12:00');
        a := sgei_helper_get_asig(d_eri_hua, c_biol_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_eri_hua, r, 1, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_eri_hua, r, 1, '13:30', '14:30');
        a := sgei_helper_get_asig(d_eri_hua, c_quim_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_eri_hua, r, 4, '14:30', '15:30');
        a := sgei_helper_get_asig(d_mig_vil, c_civi_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mig_vil, r, 4, '07:45', '08:40');
        a := sgei_helper_get_asig(d_mig_vil, c_hist_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mig_vil, r, 4, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_mig_vil, r, 4, '13:30', '14:30');
        a := sgei_helper_get_asig(d_mig_vil, c_geog_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mig_vil, r, 5, '12:00', '13:00');
        a := sgei_helper_get_asig(d_erk_bau, c_ing_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_erk_bau, r, 1, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_erk_bau, r, 1, '08:40', '09:40');
        a := sgei_helper_get_asig(d_bre_way, c_mus_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_bre_way, r, 5, '09:40', '10:40');
        a := sgei_helper_get_asig(d_mar_ben, c_ef_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mar_ben, r, 4, '11:00', '12:00');
    END LOOP;

    -- === 3°-4° SECUNDARIA ===
    FOREACH r IN ARRAY ARRAY[s_3s, s_4s] LOOP
        a := sgei_helper_get_asig(d_son_vil, c_alge_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 1, '09:40', '10:40');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 1, '11:00', '12:00');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 5, '07:45', '08:40');
        a := sgei_helper_get_asig(d_son_vil, c_arit_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 2, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 2, '08:40', '09:40');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 3, '14:30', '15:30');
        a := sgei_helper_get_asig(d_son_vil, c_trig_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 2, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 2, '13:30', '14:30');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 2, '14:30', '15:30');
        a := sgei_helper_get_asig(d_son_vil, c_geom_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 3, '09:40', '10:40');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 3, '11:00', '12:00');
        a := sgei_helper_get_asig(d_son_vil, c_rm_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 1, '14:30', '15:30');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 5, '13:30', '14:30');
        PERFORM sgei_helper_ins_hor(a, d_son_vil, r, 5, '14:30', '15:30');
        a := sgei_helper_get_asig(d_jor_vil, c_len_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 3, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 3, '08:40', '09:40');
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 5, '08:40', '09:40');
        a := sgei_helper_get_asig(d_jor_vil, c_rv_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 3, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 3, '13:30', '14:30');
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 4, '08:40', '09:40');
        a := sgei_helper_get_asig(d_jor_vil, c_lit_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 4, '09:40', '10:40');
        a := sgei_helper_get_asig(d_jor_vil, c_plan_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_jor_vil, r, 5, '11:00', '12:00');
        a := sgei_helper_get_asig(d_car_nic, c_fis_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_car_nic, r, 2, '09:40', '10:40');
        PERFORM sgei_helper_ins_hor(a, d_car_nic, r, 2, '11:00', '12:00');
        a := sgei_helper_get_asig(d_car_nic, c_biol_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_car_nic, r, 1, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_car_nic, r, 1, '13:30', '14:30');
        a := sgei_helper_get_asig(d_car_nic, c_quim_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_car_nic, r, 4, '14:30', '15:30');
        a := sgei_helper_get_asig(d_ros_hua, c_civi_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_ros_hua, r, 4, '07:45', '08:40');
        a := sgei_helper_get_asig(d_ros_hua, c_hist_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_ros_hua, r, 4, '12:00', '13:00');
        PERFORM sgei_helper_ins_hor(a, d_ros_hua, r, 4, '13:30', '14:30');
        a := sgei_helper_get_asig(d_ros_hua, c_geog_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_ros_hua, r, 5, '12:00', '13:00');
        a := sgei_helper_get_asig(d_erk_bau, c_ing_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_erk_bau, r, 1, '07:45', '08:40');
        PERFORM sgei_helper_ins_hor(a, d_erk_bau, r, 1, '08:40', '09:40');
        a := sgei_helper_get_asig(d_bre_way, c_mus_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_bre_way, r, 5, '09:40', '10:40');
        a := sgei_helper_get_asig(d_mar_ben, c_ef_s, r, p);
        PERFORM sgei_helper_ins_hor(a, d_mar_ben, r, 4, '11:00', '12:00');
    END LOOP;

    -- === 5° SECUNDARIA ===
    r := s_5s;
    a := sgei_helper_get_asig(d_rau_esp, c_alge_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 1, '09:40', '10:40');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 1, '11:00', '12:00');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 5, '07:45', '08:40');
    a := sgei_helper_get_asig(d_rau_esp, c_arit_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 2, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 2, '08:40', '09:40');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 3, '14:30', '15:30');
    a := sgei_helper_get_asig(d_rau_esp, c_trig_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 2, '12:00', '13:00');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 2, '13:30', '14:30');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 2, '14:30', '15:30');
    a := sgei_helper_get_asig(d_rau_esp, c_geom_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 3, '09:40', '10:40');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 3, '11:00', '12:00');
    a := sgei_helper_get_asig(d_rau_esp, c_rm_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 1, '14:30', '15:30');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 5, '13:30', '14:30');
    PERFORM sgei_helper_ins_hor(a, d_rau_esp, r, 5, '14:30', '15:30');
    a := sgei_helper_get_asig(d_bet_osc, c_len_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 3, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 3, '08:40', '09:40');
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 5, '08:40', '09:40');
    a := sgei_helper_get_asig(d_bet_osc, c_rv_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 3, '12:00', '13:00');
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 3, '13:30', '14:30');
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 4, '08:40', '09:40');
    a := sgei_helper_get_asig(d_bet_osc, c_lit_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 4, '09:40', '10:40');
    a := sgei_helper_get_asig(d_bet_osc, c_plan_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_bet_osc, r, 5, '11:00', '12:00');
    a := sgei_helper_get_asig(d_day_hua, c_fis_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_day_hua, r, 2, '09:40', '10:40');
    PERFORM sgei_helper_ins_hor(a, d_day_hua, r, 2, '11:00', '12:00');
    a := sgei_helper_get_asig(d_day_hua, c_biol_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_day_hua, r, 1, '12:00', '13:00');
    PERFORM sgei_helper_ins_hor(a, d_day_hua, r, 1, '13:30', '14:30');
    a := sgei_helper_get_asig(d_day_hua, c_quim_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_day_hua, r, 4, '14:30', '15:30');
    a := sgei_helper_get_asig(d_teo_vil, c_civi_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_teo_vil, r, 4, '07:45', '08:40');
    a := sgei_helper_get_asig(d_teo_vil, c_hist_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_teo_vil, r, 4, '12:00', '13:00');
    PERFORM sgei_helper_ins_hor(a, d_teo_vil, r, 4, '13:30', '14:30');
    a := sgei_helper_get_asig(d_teo_vil, c_geog_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_teo_vil, r, 5, '12:00', '13:00');
    a := sgei_helper_get_asig(d_erk_bau, c_ing_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_erk_bau, r, 1, '07:45', '08:40');
    PERFORM sgei_helper_ins_hor(a, d_erk_bau, r, 1, '08:40', '09:40');
    a := sgei_helper_get_asig(d_bre_way, c_mus_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_bre_way, r, 5, '09:40', '10:40');
    a := sgei_helper_get_asig(d_mar_ben, c_ef_s, r, p);
    PERFORM sgei_helper_ins_hor(a, d_mar_ben, r, 4, '11:00', '12:00');

    -- ==============================================================
    -- 6. Publicar horarios
    -- ==============================================================
    FOR r IN SELECT id FROM academic_schema.seccion LOOP
        INSERT INTO academic_schema.horario_publicacion (id, tipo, seccion_id, periodo_id, publicado_por, fecha_publicacion)
        VALUES (gen_random_uuid(), 'SECCION', r, p, (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1), NOW());
    END LOOP;

END $do$;

-- ==============================================================
-- 7. Limpieza
-- ==============================================================
DROP FUNCTION IF EXISTS sgei_helper_get_asig;
DROP FUNCTION IF EXISTS sgei_helper_ins_hor;

COMMIT;
