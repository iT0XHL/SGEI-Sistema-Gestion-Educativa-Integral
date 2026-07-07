-- ============================================================
-- SGEI — seed.sql (ESTADO FINAL COMPLETO)
-- 220 alumnos | 32 docentes | 1 Admin + 2 Secretarías
-- 37 cursos finos + 4 competencias estándar c/u
-- Horarios corregidos sin conflictos
-- Libretas Bimestre I publicadas | SIAGIE funcional
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Wipe existing data so this seed is repeatable
TRUNCATE
    academic_schema.nivel,
    academic_schema.institucion_educativa,
    academic_schema.periodo_academico,
    academic_schema.config_escala_literal,
    academic_schema.competencia,
    academic_schema.docente,
    academic_schema.actividad,
    academic_schema.material,
    academic_schema.simulacro,
    academic_schema.plantilla_libreta,
    academic_schema.situacion_final_alumno,
    auth_schema.credencial,
    auth_schema.token_recuperacion,
    financial_schema.concepto_pago,
    financial_schema.notificacion,
    audit_schema.sesion_auditoria,
    audit_schema.integracion_siagie,
    audit_schema.libreta_revision
CASCADE;

DROP TABLE IF EXISTS pg_temp.tmp_hash;
CREATE TEMP TABLE tmp_hash AS SELECT crypt('demo1234', gen_salt('bf', 12)) AS h;

DO $do$
DECLARE
    v_periodo    UUID := '00000000-0000-0000-0004-000000000003';
    v_primaria   UUID := '00000000-0000-0000-0004-000000000010';
    v_secundaria UUID := '00000000-0000-0000-0004-000000000001';
    v_g1p UUID := '00000000-0000-0000-0004-000000000011';
    v_g2p UUID := '00000000-0000-0000-0004-000000000012';
    v_g3p UUID := '00000000-0000-0000-0004-000000000013';
    v_g4p UUID := '00000000-0000-0000-0004-000000000014';
    v_g5p UUID := '00000000-0000-0000-0004-000000000015';
    v_g6p UUID := '00000000-0000-0000-0004-000000000016';
    v_g1s UUID := '00000000-0000-0000-0004-000000000017';
    v_g2s UUID := '00000000-0000-0000-0004-000000000018';
    v_g3s UUID := '00000000-0000-0000-0004-000000000002';
    v_g4s UUID := '00000000-0000-0000-0004-000000000019';
    v_g5s UUID := '00000000-0000-0000-0004-000000000020';
    v_s1p UUID := '00000000-0000-0000-000a-000000000001';
    v_s2p UUID := '00000000-0000-0000-000a-000000000002';
    v_s3p UUID := '00000000-0000-0000-000a-000000000003';
    v_s4p UUID := '00000000-0000-0000-000a-000000000004';
    v_s5p UUID := '00000000-0000-0000-000a-000000000005';
    v_s6p UUID := '00000000-0000-0000-000a-000000000006';
    v_s1s UUID := '00000000-0000-0000-000a-000000000007';
    v_s2s UUID := '00000000-0000-0000-000a-000000000008';
    v_s3s UUID := '00000000-0000-0000-0004-000000000004';
    v_s4s UUID := '00000000-0000-0000-000a-000000000009';
    v_s5s UUID := '00000000-0000-0000-000a-000000000010';
    v_s1b UUID := '00000000-0000-0000-000a-000000000011';
    v_s2b UUID := '00000000-0000-0000-000a-000000000012';
    v_s3b UUID := '00000000-0000-0000-000a-000000000013';
    v_s4b UUID := '00000000-0000-0000-000a-000000000014';
    v_s5b UUID := '00000000-0000-0000-000a-000000000015';
    v_b1 UUID := '00000000-0000-0000-0007-000000000001';
    v_b2 UUID := '00000000-0000-0000-0007-000000000002';
    v_b3 UUID := '00000000-0000-0000-0007-000000000003';
    v_b4 UUID := '00000000-0000-0000-0007-000000000004';
    v_c_ing_s UUID := '00000000-0000-0000-0005-000000000005';
    v_cred_admin UUID := '00000000-0000-0000-0001-000000000001';
    v_cred_sec1  UUID := '00000000-0000-0000-0001-000000000002';
    v_cred_sec2  UUID := '00000000-0000-0000-0001-000000000022';
    v_perf_admin UUID := '00000000-0000-0000-0002-000000000001';
    v_perf_sec1  UUID := '00000000-0000-0000-0002-000000000002';
    v_perf_sec2  UUID := '00000000-0000-0000-0002-000000000022';
    v_hash TEXT;
    v_a UUID; v_r UUID;
BEGIN
    v_hash := crypt('demo1234', gen_salt('bf', 12));
    PERFORM set_config('app.current_user_id', v_perf_admin::text, true);

    -- S1: INSTITUCIÓN + PERIODO + BIMESTRES + NIVELES + GRADOS + SECCIONES
    INSERT INTO academic_schema.institucion_educativa (id,codigo_modular,nombre,codigo_ugel,nombre_ugel,direccion,distrito,provincia,departamento,gestion,telefono,email_institucional,resolucion_creacion)
    VALUES ('00000000-0000-0000-0004-000000000001','0000000','IEP Demo - Virgen del Carmen','0701','UGEL 07','Av. Demo 123','Lima','Lima','Lima','Privada','01-2345678','ie@demo.edu.pe','RD N° 000-2026')
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.periodo_academico (id,año,nombre,fecha_inicio,fecha_fin,activo)
    VALUES (v_periodo,2026,'Año Académico 2026','2026-03-01','2026-12-20',true)
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.bimestre (id,nombre,periodo_id,fecha_inicio,fecha_fin,numero) VALUES
    (v_b1,'Bimestre I',v_periodo,'2026-03-01','2026-05-09',1),
    (v_b2,'Bimestre II',v_periodo,'2026-05-12','2026-07-18',2),
    (v_b3,'Bimestre III',v_periodo,'2026-08-04','2026-10-10',3),
    (v_b4,'Bimestre IV',v_periodo,'2026-10-13','2026-12-20',4)
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.nivel (id,nombre) VALUES (v_primaria,'Primaria'),(v_secundaria,'Secundaria') ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.grado (id,nivel_id,nombre,orden) VALUES
    (v_g1p,v_primaria,'1° Primaria',1),(v_g2p,v_primaria,'2° Primaria',2),(v_g3p,v_primaria,'3° Primaria',3),
    (v_g4p,v_primaria,'4° Primaria',4),(v_g5p,v_primaria,'5° Primaria',5),(v_g6p,v_primaria,'6° Primaria',6),
    (v_g1s,v_secundaria,'1° Secundaria',1),(v_g2s,v_secundaria,'2° Secundaria',2),(v_g3s,v_secundaria,'3° Secundaria',3),
    (v_g4s,v_secundaria,'4° Secundaria',4),(v_g5s,v_secundaria,'5° Secundaria',5)
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.seccion (id,grado_id,periodo_id,nombre,cupo_maximo) VALUES
    (v_s1p,v_g1p,v_periodo,'A',30),(v_s2p,v_g2p,v_periodo,'A',30),(v_s3p,v_g3p,v_periodo,'A',30),
    (v_s4p,v_g4p,v_periodo,'A',30),(v_s5p,v_g5p,v_periodo,'A',30),(v_s6p,v_g6p,v_periodo,'A',30),
    (v_s1s,v_g1s,v_periodo,'A',30),(v_s2s,v_g2s,v_periodo,'A',30),(v_s3s,v_g3s,v_periodo,'A',30),
    (v_s4s,v_g4s,v_periodo,'A',30),(v_s5s,v_g5s,v_periodo,'A',30),
    (v_s1b,v_g1s,v_periodo,'B',30),(v_s2b,v_g2s,v_periodo,'B',30),(v_s3b,v_g3s,v_periodo,'B',30),
    (v_s4b,v_g4s,v_periodo,'B',30),(v_s5b,v_g5s,v_periodo,'B',30)
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.config_escala_literal (periodo_id,escala,rango_inferior,rango_superior) VALUES
    (v_periodo,'AD',18,20),(v_periodo,'A',14,17),(v_periodo,'B',11,13),(v_periodo,'C',0,10)
    ON CONFLICT DO NOTHING;

    -- S2: ÁREAS ACADÉMICAS (16)
    INSERT INTO academic_schema.area_academica (id,nivel_id,nombre,orden) VALUES
    ('a1000001-0000-0000-0000-000000000001',v_secundaria,'Comunicación',1),
    ('a1000001-0000-0000-0000-000000000002',v_secundaria,'Matemática',2),
    ('a1000001-0000-0000-0000-000000000003',v_secundaria,'Ciencia y Tecnología',3),
    ('a1000001-0000-0000-0000-000000000004',v_secundaria,'Ciencias Sociales',4),
    ('a1000001-0000-0000-0000-000000000005',v_secundaria,'DPCC',5),
    ('a1000001-0000-0000-0000-000000000006',v_secundaria,'Arte y Cultura',6),
    ('a1000001-0000-0000-0000-000000000007',v_secundaria,'Inglés',7),
    ('a1000001-0000-0000-0000-000000000008',v_secundaria,'Educación Física',8),
    ('a1000002-0000-0000-0000-000000000001',v_primaria,'Comunicación',1),
    ('a1000002-0000-0000-0000-000000000002',v_primaria,'Matemática',2),
    ('a1000002-0000-0000-0000-000000000003',v_primaria,'Ciencia y Tecnología',3),
    ('a1000002-0000-0000-0000-000000000004',v_primaria,'Ciencias Sociales',4),
    ('a1000002-0000-0000-0000-000000000005',v_primaria,'DPCC',5),
    ('a1000002-0000-0000-0000-000000000006',v_primaria,'Arte y Cultura',6),
    ('a1000002-0000-0000-0000-000000000007',v_primaria,'Inglés',7),
    ('a1000002-0000-0000-0000-000000000008',v_primaria,'Educación Física',8)
    ON CONFLICT DO NOTHING;

    -- S3: CURSOS FINOS (37) - UUIDs de fix-horarios.sql
    INSERT INTO academic_schema.curso (id,nivel_id,nombre,horas_semanales) VALUES
    ('1a15005d-d121-4221-8f89-9a4424efb953',v_primaria,'Aritmética',2),
    ('a9a39816-7acb-4b20-bedc-dc9f6be7033d',v_primaria,'Álgebra',2),
    ('9a1faca9-6288-4391-8409-060cea513117',v_primaria,'R.M.',2),
    ('f54b4028-7ffd-4b91-9581-12789f3b7355',v_primaria,'Trigonometría',2),
    ('88a95c55-9c2b-4daa-9edf-39c6520b1aea',v_primaria,'Geometría',2),
    ('8d579e05-dcf5-4acc-b76e-7f5ec633414d',v_primaria,'Lenguaje',2),
    ('1d1a3a2f-79c5-46ae-a8ed-d3abec7dd28e',v_primaria,'R.V.',2),
    ('7ec3aad3-3501-4769-a1f9-52074ed8ea59',v_primaria,'Plan Lector',1),
    ('cdd0a488-f18f-4f48-956a-c756babe5c71',v_primaria,'Cívica',1),
    ('f14665cf-c27c-4bfd-aa08-fb923c3fb128',v_primaria,'Geografía',2),
    ('72c968a3-a168-418b-a059-3e63e822b9b5',v_primaria,'Historia',2),
    ('df963e14-6e2f-42d3-81f7-42947a248ba3',v_primaria,'Biología',2),
    ('5406d904-6cfc-4f7d-8590-111cbd51fbf3',v_primaria,'Química',2),
    ('cd0cdbe0-e66a-4451-be52-6ce505e5f9c9',v_primaria,'Inglés',2),
    ('75eff025-7037-4dea-a5fa-e46bb20f8b9f',v_primaria,'Educación Física',1),
    ('3a6a7abf-3458-4d16-a6db-42545d26ce78',v_primaria,'Religión',1),
    ('7497e3bd-520e-4ef3-8b89-61d509f13f5f',v_primaria,'Oratoria',1),
    ('4b99b990-a886-4279-8a15-1b7698a721c1',v_primaria,'Música',1),
    ('0638570c-0804-4347-b031-820cd991d281',v_secundaria,'Aritmética',3),
    ('f1c2a8c1-c618-4ffe-9304-71c1060fcb43',v_secundaria,'Álgebra',3),
    ('8fa517b3-5984-4b1e-9419-0f49f680efc6',v_secundaria,'R.M.',3),
    ('baf71132-7816-4b8b-a159-716e2041f9ec',v_secundaria,'Trigonometría',2),
    ('f3e7b454-5a98-4166-bd28-b295ea598208',v_secundaria,'Geometría',2),
    ('add087ed-8a7e-4342-b5ee-e16db310fd45',v_secundaria,'Lenguaje',2),
    ('d86744b8-c623-4145-9a6b-5a15b0c6b176',v_secundaria,'R.V.',3),
    ('6a4f0ffd-4683-40cc-a942-e4261651bcb0',v_secundaria,'Literatura',1),
    ('efb557dd-b1e2-4e9c-bea1-f47d600a0f19',v_secundaria,'Plan Lector',1),
    ('c1283774-290d-4500-852f-66ab301a207a',v_secundaria,'Cívica',1),
    ('26d214e0-04cc-43b0-8943-a994a76ca77c',v_secundaria,'Geografía',1),
    ('0a15da33-5cf2-4721-9ae6-e48efdd338ce',v_secundaria,'Historia',2),
    ('06ae67e5-7a35-4846-81b0-7cd1de35f4da',v_secundaria,'Física',2),
    ('3b3294fd-79ea-49de-af2d-5265c5e97923',v_secundaria,'Biología',2),
    ('91fe1b22-4d92-4e29-a085-a85dabe99d3a',v_secundaria,'Química',2),
    (v_c_ing_s,v_secundaria,'Inglés',2),
    ('d579909b-4c1b-400e-a585-f4409bb638c9',v_secundaria,'Educación Física',1),
    ('6d76c76b-1329-438a-9f2e-c146c5d13aa0',v_secundaria,'Música',1)
    ON CONFLICT DO NOTHING;

    -- Mapear cursos a áreas
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Comunicación' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre IN ('Lenguaje','R.V.','Literatura','Plan Lector');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Matemática' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre IN ('R.M.','Aritmética','Álgebra','Trigonometría','Geometría');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencia y Tecnología' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre IN ('Física','Química','Biología');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencias Sociales' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre IN ('Historia','Geografía');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='DPCC' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre='Cívica';
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Arte y Cultura' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre='Música';
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Inglés' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre='Inglés';
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Educación Física' AND nivel_id=v_secundaria) WHERE nivel_id=v_secundaria AND nombre='Educación Física';
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Comunicación' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre IN ('Lenguaje','R.V.','Plan Lector');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Matemática' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre IN ('R.M.','Aritmética','Álgebra','Trigonometría','Geometría');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencia y Tecnología' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre IN ('Biología','Química');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencias Sociales' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre IN ('Historia','Geografía');
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='DPCC' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre='Cívica';
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Arte y Cultura' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre='Música';
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Inglés' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre='Inglés';
    UPDATE academic_schema.curso SET area_academica_id=(SELECT id FROM academic_schema.area_academica WHERE nombre='Educación Física' AND nivel_id=v_primaria) WHERE nivel_id=v_primaria AND nombre='Educación Física';

    -- grado_curso
    INSERT INTO academic_schema.grado_curso (grado_id,curso_id)
    SELECT g.id,c.id FROM academic_schema.grado g JOIN academic_schema.curso c ON c.nivel_id=g.nivel_id
    WHERE c.id!=v_c_ing_s ON CONFLICT DO NOTHING;
    INSERT INTO academic_schema.grado_curso (grado_id,curso_id)
    SELECT g.id,v_c_ing_s FROM academic_schema.grado g WHERE g.nivel_id=v_secundaria ON CONFLICT DO NOTHING;

    -- S4: COMPETENCIAS (4 estándar por curso)
    INSERT INTO academic_schema.competencia (curso_id,grado_id,nombre,tipo,orden,peso)
    SELECT cu.id,NULL,crit.nombre,'regular',crit.orden,25.00
    FROM academic_schema.curso cu CROSS JOIN (VALUES ('Prueba de entrada',1),('Prueba de Salida',2),('Examen',3),('Desarrollo',4)) AS crit(nombre,orden);

    -- S5: CONFIG HORARIA
    UPDATE academic_schema.nivel_horario_config SET hora_inicio_jornada='07:45:00',duracion_hora_min=60,total_horas_dia=6 WHERE nivel_id=v_primaria;
    UPDATE academic_schema.nivel_horario_config SET hora_inicio_jornada='07:45:00',duracion_hora_min=60,total_horas_dia=7 WHERE nivel_id=v_secundaria;

    INSERT INTO academic_schema.horario_descanso (id,nivel_id,periodo_id,tipo,hora_inicio,hora_fin) VALUES
    (gen_random_uuid(),v_primaria,v_periodo,'RECREO','09:40','10:00'),
    (gen_random_uuid(),v_primaria,v_periodo,'REFRIGERIO','12:00','12:30'),
    (gen_random_uuid(),v_secundaria,v_periodo,'RECREO','10:40','11:00'),
    (gen_random_uuid(),v_secundaria,v_periodo,'REFRIGERIO','13:00','13:30')
    ON CONFLICT DO NOTHING;

    -- S6: AUTH (Admin + 2 Secretarias)
    INSERT INTO auth_schema.credencial (id,usuario_login,password_hash,activo,debe_cambiar_password) VALUES
    (v_cred_admin,'director@sgei.edu.pe',v_hash,true,false),
    (v_cred_sec1,'secretaria@sgei.edu.pe',v_hash,true,false),
    (v_cred_sec2,'secretaria2@sgei.edu.pe',v_hash,true,false)
    ON CONFLICT DO NOTHING;

    INSERT INTO auth_schema.perfil_usuario (id,credencial_id,rol,entidad_tipo,entidad_id) VALUES
    (v_perf_admin,v_cred_admin,'Admin','admin',v_perf_admin),
    (v_perf_sec1,v_cred_sec1,'Secretaria','secretaria',v_perf_sec1),
    (v_perf_sec2,v_cred_sec2,'Secretaria','secretaria',v_perf_sec2)
    ON CONFLICT DO NOTHING;

    -- S7: DOCENTES (32) - credenciales + perfiles + docentes
    INSERT INTO auth_schema.credencial (id,usuario_login,password_hash,nombres,apellido_paterno,apellido_materno,activo,debe_cambiar_password) VALUES
    ('00000000-0000-0000-0001-000000000101','rocio.salvatierra@sgei.edu.pe',v_hash,'Rocío','Salvatierra','Neyra',true,false),
    ('00000000-0000-0000-0001-000000000102','victor.ochoa@sgei.edu.pe',v_hash,'Víctor','Ochoa','Farfán',true,false),
    ('00000000-0000-0000-0001-000000000103','gladys.tello@sgei.edu.pe',v_hash,'Gladys','Tello','Ancco',true,false),
    ('00000000-0000-0000-0001-000000000104','milagros.escobar@sgei.edu.pe',v_hash,'Milagros','Escobar','Quiñones',true,false),
    ('00000000-0000-0000-0001-000000000105','walter.cordova@sgei.edu.pe',v_hash,'Walter','Córdova','Bejar',true,false),
    ('00000000-0000-0000-0001-000000000106','nora.villanueva@sgei.edu.pe',v_hash,'Nora','Villanueva','Osco',true,false),
    ('00000000-0000-0000-0001-000000000107','ruben.maldonado@sgei.edu.pe',v_hash,'Rubén','Maldonado','Sifuentes',true,false),
    ('00000000-0000-0000-0001-000000000108','elizabeth.nina@sgei.edu.pe',v_hash,'Elizabeth','Nina','Ttito',true,false),
    ('00000000-0000-0000-0001-000000000109','percy.calle@sgei.edu.pe',v_hash,'Percy','Calle','Ramos',true,false),
    ('00000000-0000-0000-0001-000000000110','cinthia.arangoitia@sgei.edu.pe',v_hash,'Cinthia','Arangoitia','Del Pozo',true,false),
    ('00000000-0000-0000-0001-000000000111','freddy.zambrano@sgei.edu.pe',v_hash,'Freddy','Zambrano','Osorio',true,false),
    ('00000000-0000-0000-0001-000000000112','yesenia.puma@sgei.edu.pe',v_hash,'Yesenia','Puma','Achata',true,false),
    ('00000000-0000-0000-0001-000000000113','nadia.bautista@sgei.edu.pe',v_hash,'Nadia','Bautista','Cano',true,false),
    ('00000000-0000-0000-0001-000000000114','hector.villalba@sgei.edu.pe',v_hash,'Héctor','Villalba','Soncco',true,false),
    ('00000000-0000-0000-0001-000000000115','esther.quiroz@sgei.edu.pe',v_hash,'Esther','Quiroz','Alarcón',true,false),
    ('00000000-0000-0000-0001-000000000116','bautista.nicol@sgei.edu.pe',v_hash,'Nicol','Bautista','Reyes',true,false),
    ('00000000-0000-0000-0001-000000000117','claudio.bermudez@sgei.edu.pe',v_hash,'Claudio','Bermúdez','Way',true,false),
    ('00000000-0000-0000-0001-000000000201','victor.nicol@sgei.edu.pe',v_hash,'Víctor','Solórzano','Nicol',true,false),
    ('00000000-0000-0000-0001-000000000202','sonia.villegas@sgei.edu.pe',v_hash,'Sonia','Villegas','Chumpitaz',true,false),
    ('00000000-0000-0000-0001-000000000203','raul.espejo@sgei.edu.pe',v_hash,'Raúl','Espejo','Tirado',true,false),
    ('00000000-0000-0000-0001-000000000204','lourdes.rivadeneira@sgei.edu.pe',v_hash,'Lourdes','Rivadeneira','Guzman',true,false),
    ('00000000-0000-0000-0001-000000000205','jorge.villarreal@sgei.edu.pe',v_hash,'Jorge','Villarreal','Chacón',true,false),
    ('00000000-0000-0000-0001-000000000206','betty.oscanoa@sgei.edu.pe',v_hash,'Betty','Oscanoa','Millones',true,false),
    ('00000000-0000-0000-0001-000000000207','miguel.villarreal@sgei.edu.pe',v_hash,'Miguel','Villarreal','Choque',true,false),
    ('00000000-0000-0000-0001-000000000208','rosa.huaynamarca@sgei.edu.pe',v_hash,'Rosa','Huaynamarca','Ccama',true,false),
    ('00000000-0000-0000-0001-000000000209','teodoro.villarreal@sgei.edu.pe',v_hash,'Teodoro','Villarreal','Peña',true,false),
    ('00000000-0000-0000-0001-000000000210','erika.huaynamarca@sgei.edu.pe',v_hash,'Érika','Huaynamarca','Solís',true,false),
    ('00000000-0000-0000-0001-000000000211','carlos.nicol@sgei.edu.pe',v_hash,'Carlos','Nicol','Ferrand',true,false),
    ('00000000-0000-0000-0001-000000000212','daysi.huaynamarca@sgei.edu.pe',v_hash,'Daysi','Huaynamarca','Rojas',true,false),
    ('00000000-0000-0000-0001-000000000213','erick.bautista@sgei.edu.pe',v_hash,'Erick','Bautista','Wong',true,false),
    ('00000000-0000-0000-0001-000000000214','marco.benavides@sgei.edu.pe',v_hash,'Marco','Benavides','Ilizarbe',true,false),
    ('00000000-0000-0000-0001-000000000215','brenda.way@sgei.edu.pe',v_hash,'Brenda','Way','Chavarria',true,false)
    ON CONFLICT DO NOTHING;

    INSERT INTO auth_schema.perfil_usuario (id,credencial_id,rol,entidad_tipo,entidad_id) VALUES
    ('00000000-0000-0000-0002-000000000101','00000000-0000-0000-0001-000000000101','Docente','docente','c0b24d4a-b9be-4315-a37b-dc38d53b7abc'),
    ('00000000-0000-0000-0002-000000000102','00000000-0000-0000-0001-000000000102','Docente','docente','a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc'),
    ('00000000-0000-0000-0002-000000000103','00000000-0000-0000-0001-000000000103','Docente','docente','0b23ceb3-dda3-4695-ae44-f804c23d92cd'),
    ('00000000-0000-0000-0002-000000000104','00000000-0000-0000-0001-000000000104','Docente','docente','50b487c5-46c5-464b-9152-8773b9924b95'),
    ('00000000-0000-0000-0002-000000000105','00000000-0000-0000-0001-000000000105','Docente','docente','59b9d162-f456-4142-a811-54fa3323577e'),
    ('00000000-0000-0000-0002-000000000106','00000000-0000-0000-0001-000000000106','Docente','docente','6cd3dce1-e297-4e51-8f2e-9373226e4b91'),
    ('00000000-0000-0000-0002-000000000107','00000000-0000-0000-0001-000000000107','Docente','docente','dfdffe30-1a2f-40b7-b598-9f213e131ac0'),
    ('00000000-0000-0000-0002-000000000108','00000000-0000-0000-0001-000000000108','Docente','docente','fa147988-6498-4b55-93c3-2c10cdd285a9'),
    ('00000000-0000-0000-0002-000000000109','00000000-0000-0000-0001-000000000109','Docente','docente','12a5890b-bb05-4838-b7da-3d9cdc2c858c'),
    ('00000000-0000-0000-0002-000000000110','00000000-0000-0000-0001-000000000110','Docente','docente','cee67fe4-d809-4e83-a125-601d40a7bce1'),
    ('00000000-0000-0000-0002-000000000111','00000000-0000-0000-0001-000000000111','Docente','docente','7d88a64b-c09b-4544-87f2-79c148808a6a'),
    ('00000000-0000-0000-0002-000000000112','00000000-0000-0000-0001-000000000112','Docente','docente','e206bce4-82bd-4502-b79e-c95c3e8e1b94'),
    ('00000000-0000-0000-0002-000000000113','00000000-0000-0000-0001-000000000113','Docente','docente','ccb50ebe-5758-4091-b206-f6f169536aff'),
    ('00000000-0000-0000-0002-000000000114','00000000-0000-0000-0001-000000000114','Docente','docente','841ffdd8-ea71-49d1-9365-09d77fa42d4b'),
    ('00000000-0000-0000-0002-000000000115','00000000-0000-0000-0001-000000000115','Docente','docente','a18fc3ef-ed71-48a7-9e95-5323f4dabefd'),
    ('00000000-0000-0000-0002-000000000116','00000000-0000-0000-0001-000000000116','Docente','docente','5dcd90b6-9c16-482e-bf5f-dd97e09fad33'),
    ('00000000-0000-0000-0002-000000000117','00000000-0000-0000-0001-000000000117','Docente','docente','397fcab1-ce4a-4aa5-97d4-6af0817d9d30'),
    ('00000000-0000-0000-0002-000000000201','00000000-0000-0000-0001-000000000201','Docente','docente','716a8136-736e-4a62-9307-a10da3c2e1e7'),
    ('00000000-0000-0000-0002-000000000202','00000000-0000-0000-0001-000000000202','Docente','docente','a9e0de70-6ef9-4b3b-a39e-871ec569fd7a'),
    ('00000000-0000-0000-0002-000000000203','00000000-0000-0000-0001-000000000203','Docente','docente','8105c157-3b67-4d06-83a7-afc3b03afd51'),
    ('00000000-0000-0000-0002-000000000204','00000000-0000-0000-0001-000000000204','Docente','docente','3d41d9dd-461b-4125-9b32-5a6b3199e4c2'),
    ('00000000-0000-0000-0002-000000000205','00000000-0000-0000-0001-000000000205','Docente','docente','f97e88c4-eca4-434e-8a48-d636f06e8687'),
    ('00000000-0000-0000-0002-000000000206','00000000-0000-0000-0001-000000000206','Docente','docente','c6a62784-9505-4a00-9906-e4cad75a4f8c'),
    ('00000000-0000-0000-0002-000000000207','00000000-0000-0000-0001-000000000207','Docente','docente','e31efeed-1896-483e-9ad5-8a4aad5b1010'),
    ('00000000-0000-0000-0002-000000000208','00000000-0000-0000-0001-000000000208','Docente','docente','0a20b6a8-f7c8-4293-b167-000288cefbcc'),
    ('00000000-0000-0000-0002-000000000209','00000000-0000-0000-0001-000000000209','Docente','docente','73f9d515-a13f-48b1-bc20-14dac2414b1e'),
    ('00000000-0000-0000-0002-000000000210','00000000-0000-0000-0001-000000000210','Docente','docente','3561156b-5310-41f8-93b1-3399d5c52ec8'),
    ('00000000-0000-0000-0002-000000000211','00000000-0000-0000-0001-000000000211','Docente','docente','967c86ed-db4b-4444-b93a-628ed0810f41'),
    ('00000000-0000-0000-0002-000000000212','00000000-0000-0000-0001-000000000212','Docente','docente','6d795bf0-5a91-4e08-adc1-4073fc76a9d7'),
    ('00000000-0000-0000-0002-000000000213','00000000-0000-0000-0001-000000000213','Docente','docente','2b5ac3b1-8abb-424c-933d-6386e7a60e41'),
    ('00000000-0000-0000-0002-000000000214','00000000-0000-0000-0001-000000000214','Docente','docente','c43a0e16-1d1a-4926-9965-51cd49f020a1'),
    ('00000000-0000-0000-0002-000000000215','00000000-0000-0000-0001-000000000215','Docente','docente','cf94825e-3f94-4a62-8974-8694e88cfb4f')
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.docente (id,perfil_usuario_id,dni,nombres,apellido_paterno,apellido_materno,especialidad,telefono,email_institucional,activo,fecha_ingreso) VALUES
    ('c0b24d4a-b9be-4315-a37b-dc38d53b7abc','00000000-0000-0000-0002-000000000101','72000001','Rocío','Salvatierra','Neyra','Matemática (Primaria)','987654321','rocio.salvatierra@sgei.edu.pe',true,'2026-03-01'),
    ('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','00000000-0000-0000-0002-000000000102','72000002','Víctor','Ochoa','Farfán','Matemática (Primaria)','987654321','victor.ochoa@sgei.edu.pe',true,'2026-03-01'),
    ('0b23ceb3-dda3-4695-ae44-f804c23d92cd','00000000-0000-0000-0002-000000000103','72000003','Gladys','Tello','Ancco','Matemática (Primaria)','987654321','gladys.tello@sgei.edu.pe',true,'2026-03-01'),
    ('50b487c5-46c5-464b-9152-8773b9924b95','00000000-0000-0000-0002-000000000104','72000004','Milagros','Escobar','Quiñones','Letras (Primaria)','987654321','milagros.escobar@sgei.edu.pe',true,'2026-03-01'),
    ('59b9d162-f456-4142-a811-54fa3323577e','00000000-0000-0000-0002-000000000105','72000005','Walter','Córdova','Bejar','Letras (Primaria)','987654321','walter.cordova@sgei.edu.pe',true,'2026-03-01'),
    ('6cd3dce1-e297-4e51-8f2e-9373226e4b91','00000000-0000-0000-0002-000000000106','72000006','Nora','Villanueva','Osco','Letras (Primaria)','987654321','nora.villanueva@sgei.edu.pe',true,'2026-03-01'),
    ('dfdffe30-1a2f-40b7-b598-9f213e131ac0','00000000-0000-0000-0002-000000000107','72000007','Rubén','Maldonado','Sifuentes','Sociales (Primaria)','987654321','ruben.maldonado@sgei.edu.pe',true,'2026-03-01'),
    ('fa147988-6498-4b55-93c3-2c10cdd285a9','00000000-0000-0000-0002-000000000108','72000008','Elizabeth','Nina','Ttito','Sociales (Primaria)','987654321','elizabeth.nina@sgei.edu.pe',true,'2026-03-01'),
    ('12a5890b-bb05-4838-b7da-3d9cdc2c858c','00000000-0000-0000-0002-000000000109','72000009','Percy','Calle','Ramos','Sociales (Primaria)','987654321','percy.calle@sgei.edu.pe',true,'2026-03-01'),
    ('cee67fe4-d809-4e83-a125-601d40a7bce1','00000000-0000-0000-0002-000000000110','72000010','Cinthia','Arangoitia','Del Pozo','Ciencias (Primaria)','987654321','cinthia.arangoitia@sgei.edu.pe',true,'2026-03-01'),
    ('7d88a64b-c09b-4544-87f2-79c148808a6a','00000000-0000-0000-0002-000000000111','72000011','Freddy','Zambrano','Osorio','Ciencias (Primaria)','987654321','freddy.zambrano@sgei.edu.pe',true,'2026-03-01'),
    ('e206bce4-82bd-4502-b79e-c95c3e8e1b94','00000000-0000-0000-0002-000000000112','72000012','Yesenia','Puma','Achata','Ciencias (Primaria)','987654321','yesenia.puma@sgei.edu.pe',true,'2026-03-01'),
    ('ccb50ebe-5758-4091-b206-f6f169536aff','00000000-0000-0000-0002-000000000113','72000013','Nadia','Bautista','Cano','Inglés (Primaria)','987654321','nadia.bautista@sgei.edu.pe',true,'2026-03-01'),
    ('841ffdd8-ea71-49d1-9365-09d77fa42d4b','00000000-0000-0000-0002-000000000114','72000014','Héctor','Villalba','Soncco','Ed. Física (Primaria)','987654321','hector.villalba@sgei.edu.pe',true,'2026-03-01'),
    ('a18fc3ef-ed71-48a7-9e95-5323f4dabefd','00000000-0000-0000-0002-000000000115','72000015','Esther','Quiroz','Alarcón','Religión (Primaria)','987654321','esther.quiroz@sgei.edu.pe',true,'2026-03-01'),
    ('5dcd90b6-9c16-482e-bf5f-dd97e09fad33','00000000-0000-0000-0002-000000000116','72000016','Nicol','Bautista','Reyes','Oratoria (Primaria)','987654321','bautista.nicol@sgei.edu.pe',true,'2026-03-01'),
    ('397fcab1-ce4a-4aa5-97d4-6af0817d9d30','00000000-0000-0000-0002-000000000117','72000017','Claudio','Bermúdez','Way','Música (Primaria)','987654321','claudio.bermudez@sgei.edu.pe',true,'2026-03-01'),
    ('716a8136-736e-4a62-9307-a10da3c2e1e7','00000000-0000-0000-0002-000000000201','72000018','Víctor','Solórzano','Nicol','Matemática (Secundaria)','987654321','victor.nicol@sgei.edu.pe',true,'2026-03-01'),
    ('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','00000000-0000-0000-0002-000000000202','72000019','Sonia','Villegas','Chumpitaz','Matemática (Secundaria)','987654321','sonia.villegas@sgei.edu.pe',true,'2026-03-01'),
    ('8105c157-3b67-4d06-83a7-afc3b03afd51','00000000-0000-0000-0002-000000000203','72000020','Raúl','Espejo','Tirado','Matemática (Secundaria)','987654321','raul.espejo@sgei.edu.pe',true,'2026-03-01'),
    ('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','00000000-0000-0000-0002-000000000204','72000021','Lourdes','Rivadeneira','Guzman','Letras (Secundaria)','987654321','lourdes.rivadeneira@sgei.edu.pe',true,'2026-03-01'),
    ('f97e88c4-eca4-434e-8a48-d636f06e8687','00000000-0000-0000-0002-000000000205','72000022','Jorge','Villarreal','Chacón','Letras (Secundaria)','987654321','jorge.villarreal@sgei.edu.pe',true,'2026-03-01'),
    ('c6a62784-9505-4a00-9906-e4cad75a4f8c','00000000-0000-0000-0002-000000000206','72000023','Betty','Oscanoa','Millones','Letras (Secundaria)','987654321','betty.oscanoa@sgei.edu.pe',true,'2026-03-01'),
    ('e31efeed-1896-483e-9ad5-8a4aad5b1010','00000000-0000-0000-0002-000000000207','72000024','Miguel','Villarreal','Choque','Sociales (Secundaria)','987654321','miguel.villarreal@sgei.edu.pe',true,'2026-03-01'),
    ('0a20b6a8-f7c8-4293-b167-000288cefbcc','00000000-0000-0000-0002-000000000208','72000025','Rosa','Huaynamarca','Ccama','Sociales (Secundaria)','987654321','rosa.huaynamarca@sgei.edu.pe',true,'2026-03-01'),
    ('73f9d515-a13f-48b1-bc20-14dac2414b1e','00000000-0000-0000-0002-000000000209','72000026','Teodoro','Villarreal','Peña','Sociales (Secundaria)','987654321','teodoro.villarreal@sgei.edu.pe',true,'2026-03-01'),
    ('3561156b-5310-41f8-93b1-3399d5c52ec8','00000000-0000-0000-0002-000000000210','72000027','Érika','Huaynamarca','Solís','Ciencias (Secundaria)','987654321','erika.huaynamarca@sgei.edu.pe',true,'2026-03-01'),
    ('967c86ed-db4b-4444-b93a-628ed0810f41','00000000-0000-0000-0002-000000000211','72000028','Carlos','Nicol','Ferrand','Ciencias (Secundaria)','987654321','carlos.nicol@sgei.edu.pe',true,'2026-03-01'),
    ('6d795bf0-5a91-4e08-adc1-4073fc76a9d7','00000000-0000-0000-0002-000000000212','72000029','Daysi','Huaynamarca','Rojas','Ciencias (Secundaria)','987654321','daysi.huaynamarca@sgei.edu.pe',true,'2026-03-01'),
    ('2b5ac3b1-8abb-424c-933d-6386e7a60e41','00000000-0000-0000-0002-000000000213','72000030','Erick','Bautista','Wong','Inglés (Secundaria)','987654321','erick.bautista@sgei.edu.pe',true,'2026-03-01'),
    ('c43a0e16-1d1a-4926-9965-51cd49f020a1','00000000-0000-0000-0002-000000000214','72000031','Marco','Benavides','Ilizarbe','Ed. Física (Secundaria)','987654321','marco.benavides@sgei.edu.pe',true,'2026-03-01'),
    ('cf94825e-3f94-4a62-8974-8694e88cfb4f','00000000-0000-0000-0002-000000000215','72000032','Brenda','Way','Chavarria','Música (Secundaria)','987654321','brenda.way@sgei.edu.pe',true,'2026-03-01')
    ON CONFLICT DO NOTHING;

    -- S8: HORARIOS (fix-horarios.sql) + helper functions
    ALTER TABLE academic_schema.horario DISABLE TRIGGER tg_validar_cruce_horario;
    ALTER TABLE academic_schema.horario DROP CONSTRAINT IF EXISTS excl_horario_cruce_docente;
    ALTER TABLE academic_schema.horario DROP CONSTRAINT IF EXISTS excl_horario_cruce_seccion;
    DELETE FROM academic_schema.horario_publicacion_bloque;
    DELETE FROM academic_schema.horario_publicacion;
    DELETE FROM academic_schema.horario;

    CREATE OR REPLACE FUNCTION pg_temp.sgei_get_asig(p_docente_id UUID,p_curso_id UUID,p_seccion_id UUID,p_periodo_id UUID) RETURNS UUID LANGUAGE plpgsql AS $f$
    DECLARE v_id UUID;
    BEGIN
        SELECT id INTO v_id FROM academic_schema.asignacion_docente
        WHERE docente_id=p_docente_id AND curso_id=p_curso_id AND seccion_id=p_seccion_id AND periodo_id=p_periodo_id;
        IF v_id IS NULL THEN
            v_id:=gen_random_uuid();
            INSERT INTO academic_schema.asignacion_docente (id,docente_id,curso_id,seccion_id,periodo_id,activo)
            VALUES (v_id,p_docente_id,p_curso_id,p_seccion_id,p_periodo_id,true);
        END IF;
        RETURN v_id;
    END $f$;

    CREATE OR REPLACE FUNCTION pg_temp.sgei_ins_hor(p_asig_id UUID,p_docente_id UUID,p_seccion_id UUID,p_dia INT,p_h_ini TEXT,p_h_fin TEXT) RETURNS UUID LANGUAGE plpgsql AS $f$
    DECLARE v_id UUID:=gen_random_uuid();
    BEGIN
        INSERT INTO academic_schema.horario (id,asignacion_id,dia_semana,hora_inicio,hora_fin,docente_id,seccion_id)
        VALUES (v_id,p_asig_id,p_dia,p_h_ini::time,p_h_fin::time,p_docente_id,p_seccion_id);
        RETURN v_id;
    END $f$;
    -- 1° PRIMARIA schedule
    v_r := v_s1p;
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','9a1faca9-6288-4391-8409-060cea513117',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,1,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,1,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','a9a39816-7acb-4b20-bedc-dc9f6be7033d',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','1a15005d-d121-4221-8f89-9a4424efb953',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,2,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,2,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','f54b4028-7ffd-4b91-9581-12789f3b7355',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','88a95c55-9c2b-4daa-9edf-39c6520b1aea',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,4,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,4,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('6cd3dce1-e297-4e51-8f2e-9373226e4b91','8d579e05-dcf5-4acc-b76e-7f5ec633414d',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,1,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,1,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('6cd3dce1-e297-4e51-8f2e-9373226e4b91','1d1a3a2f-79c5-46ae-a8ed-d3abec7dd28e',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,2,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,2,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('6cd3dce1-e297-4e51-8f2e-9373226e4b91','7ec3aad3-3501-4769-a1f9-52074ed8ea59',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,5,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('cee67fe4-d809-4e83-a125-601d40a7bce1','df963e14-6e2f-42d3-81f7-42947a248ba3',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,2,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,2,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('cee67fe4-d809-4e83-a125-601d40a7bce1','5406d904-6cfc-4f7d-8590-111cbd51fbf3',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,3,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,3,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('dfdffe30-1a2f-40b7-b598-9f213e131ac0','72c968a3-a168-418b-a059-3e63e822b9b5',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,5,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,5,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('dfdffe30-1a2f-40b7-b598-9f213e131ac0','cdd0a488-f18f-4f48-956a-c756babe5c71',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,5,'12:30','13:30');
    v_a := pg_temp.sgei_get_asig('dfdffe30-1a2f-40b7-b598-9f213e131ac0','f14665cf-c27c-4bfd-aa08-fb923c3fb128',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,4,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,4,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('ccb50ebe-5758-4091-b206-f6f169536aff','cd0cdbe0-e66a-4451-be52-6ce505e5f9c9',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,1,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,1,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('5dcd90b6-9c16-482e-bf5f-dd97e09fad33','7497e3bd-520e-4ef3-8b89-61d509f13f5f',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'5dcd90b6-9c16-482e-bf5f-dd97e09fad33',v_r,5,'10:00','11:00');
    v_a := pg_temp.sgei_get_asig('397fcab1-ce4a-4aa5-97d4-6af0817d9d30','4b99b990-a886-4279-8a15-1b7698a721c1',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'397fcab1-ce4a-4aa5-97d4-6af0817d9d30',v_r,5,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('a18fc3ef-ed71-48a7-9e95-5323f4dabefd','3a6a7abf-3458-4d16-a6db-42545d26ce78',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a18fc3ef-ed71-48a7-9e95-5323f4dabefd',v_r,4,'12:30','13:30');
    v_a := pg_temp.sgei_get_asig('841ffdd8-ea71-49d1-9365-09d77fa42d4b','75eff025-7037-4dea-a5fa-e46bb20f8b9f',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'841ffdd8-ea71-49d1-9365-09d77fa42d4b',v_r,4,'13:30','14:30');

    -- 2° PRIMARIA
    v_r := v_s2p;
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','9a1faca9-6288-4391-8409-060cea513117',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,1,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,1,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','a9a39816-7acb-4b20-bedc-dc9f6be7033d',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','1a15005d-d121-4221-8f89-9a4424efb953',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,2,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,2,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','f54b4028-7ffd-4b91-9581-12789f3b7355',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,3,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc','88a95c55-9c2b-4daa-9edf-39c6520b1aea',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,4,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'a70e0a83-eee0-4313-b0c1-3c1a8cd0c4bc',v_r,4,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('6cd3dce1-e297-4e51-8f2e-9373226e4b91','8d579e05-dcf5-4acc-b76e-7f5ec633414d',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,1,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,1,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('6cd3dce1-e297-4e51-8f2e-9373226e4b91','1d1a3a2f-79c5-46ae-a8ed-d3abec7dd28e',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,2,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,2,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('6cd3dce1-e297-4e51-8f2e-9373226e4b91','7ec3aad3-3501-4769-a1f9-52074ed8ea59',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'6cd3dce1-e297-4e51-8f2e-9373226e4b91',v_r,5,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('cee67fe4-d809-4e83-a125-601d40a7bce1','df963e14-6e2f-42d3-81f7-42947a248ba3',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,2,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,2,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('cee67fe4-d809-4e83-a125-601d40a7bce1','5406d904-6cfc-4f7d-8590-111cbd51fbf3',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,3,'07:45','08:40');
    PERFORM pg_temp.sgei_ins_hor(v_a,'cee67fe4-d809-4e83-a125-601d40a7bce1',v_r,3,'08:40','09:40');
    v_a := pg_temp.sgei_get_asig('dfdffe30-1a2f-40b7-b598-9f213e131ac0','72c968a3-a168-418b-a059-3e63e822b9b5',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,5,'12:30','13:30');
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,5,'13:30','14:30');
    v_a := pg_temp.sgei_get_asig('dfdffe30-1a2f-40b7-b598-9f213e131ac0','cdd0a488-f18f-4f48-956a-c756babe5c71',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,5,'07:45','08:40');
    v_a := pg_temp.sgei_get_asig('dfdffe30-1a2f-40b7-b598-9f213e131ac0','f14665cf-c27c-4bfd-aa08-fb923c3fb128',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,4,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'dfdffe30-1a2f-40b7-b598-9f213e131ac0',v_r,4,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('ccb50ebe-5758-4091-b206-f6f169536aff','cd0cdbe0-e66a-4451-be52-6ce505e5f9c9',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,1,'10:00','11:00');
    PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,1,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('5dcd90b6-9c16-482e-bf5f-dd97e09fad33','7497e3bd-520e-4ef3-8b89-61d509f13f5f',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'5dcd90b6-9c16-482e-bf5f-dd97e09fad33',v_r,5,'10:00','11:00');
    v_a := pg_temp.sgei_get_asig('397fcab1-ce4a-4aa5-97d4-6af0817d9d30','4b99b990-a886-4279-8a15-1b7698a721c1',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'397fcab1-ce4a-4aa5-97d4-6af0817d9d30',v_r,5,'11:00','12:00');
    v_a := pg_temp.sgei_get_asig('a18fc3ef-ed71-48a7-9e95-5323f4dabefd','3a6a7abf-3458-4d16-a6db-42545d26ce78',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'a18fc3ef-ed71-48a7-9e95-5323f4dabefd',v_r,4,'07:45','08:40');
    v_a := pg_temp.sgei_get_asig('841ffdd8-ea71-49d1-9365-09d77fa42d4b','75eff025-7037-4dea-a5fa-e46bb20f8b9f',v_r,v_periodo);
    PERFORM pg_temp.sgei_ins_hor(v_a,'841ffdd8-ea71-49d1-9365-09d77fa42d4b',v_r,4,'08:40','09:40');

    -- S3-4 PRIMARIA
    FOREACH v_r IN ARRAY ARRAY[v_s3p,v_s4p] LOOP
        v_a := pg_temp.sgei_get_asig('c0b24d4a-b9be-4315-a37b-dc38d53b7abc','9a1faca9-6288-4391-8409-060cea513117',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,1,'12:30','13:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,1,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('c0b24d4a-b9be-4315-a37b-dc38d53b7abc','a9a39816-7acb-4b20-bedc-dc9f6be7033d',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,3,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,3,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('c0b24d4a-b9be-4315-a37b-dc38d53b7abc','1a15005d-d121-4221-8f89-9a4424efb953',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,2,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,2,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('c0b24d4a-b9be-4315-a37b-dc38d53b7abc','f54b4028-7ffd-4b91-9581-12789f3b7355',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,3,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,3,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('c0b24d4a-b9be-4315-a37b-dc38d53b7abc','88a95c55-9c2b-4daa-9edf-39c6520b1aea',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,4,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'c0b24d4a-b9be-4315-a37b-dc38d53b7abc',v_r,4,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('59b9d162-f456-4142-a811-54fa3323577e','8d579e05-dcf5-4acc-b76e-7f5ec633414d',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'59b9d162-f456-4142-a811-54fa3323577e',v_r,1,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'59b9d162-f456-4142-a811-54fa3323577e',v_r,1,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('59b9d162-f456-4142-a811-54fa3323577e','1d1a3a2f-79c5-46ae-a8ed-d3abec7dd28e',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'59b9d162-f456-4142-a811-54fa3323577e',v_r,2,'12:30','13:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'59b9d162-f456-4142-a811-54fa3323577e',v_r,2,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('59b9d162-f456-4142-a811-54fa3323577e','7ec3aad3-3501-4769-a1f9-52074ed8ea59',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'59b9d162-f456-4142-a811-54fa3323577e',v_r,5,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('e206bce4-82bd-4502-b79e-c95c3e8e1b94','df963e14-6e2f-42d3-81f7-42947a248ba3',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e206bce4-82bd-4502-b79e-c95c3e8e1b94',v_r,2,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'e206bce4-82bd-4502-b79e-c95c3e8e1b94',v_r,2,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('e206bce4-82bd-4502-b79e-c95c3e8e1b94','5406d904-6cfc-4f7d-8590-111cbd51fbf3',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e206bce4-82bd-4502-b79e-c95c3e8e1b94',v_r,3,'12:30','13:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'e206bce4-82bd-4502-b79e-c95c3e8e1b94',v_r,3,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('fa147988-6498-4b55-93c3-2c10cdd285a9','72c968a3-a168-418b-a059-3e63e822b9b5',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'fa147988-6498-4b55-93c3-2c10cdd285a9',v_r,5,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'fa147988-6498-4b55-93c3-2c10cdd285a9',v_r,5,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('fa147988-6498-4b55-93c3-2c10cdd285a9','cdd0a488-f18f-4f48-956a-c756babe5c71',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'fa147988-6498-4b55-93c3-2c10cdd285a9',v_r,5,'12:30','13:30');
        v_a := pg_temp.sgei_get_asig('fa147988-6498-4b55-93c3-2c10cdd285a9','f14665cf-c27c-4bfd-aa08-fb923c3fb128',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'fa147988-6498-4b55-93c3-2c10cdd285a9',v_r,4,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'fa147988-6498-4b55-93c3-2c10cdd285a9',v_r,4,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('ccb50ebe-5758-4091-b206-f6f169536aff','cd0cdbe0-e66a-4451-be52-6ce505e5f9c9',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,1,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,1,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('5dcd90b6-9c16-482e-bf5f-dd97e09fad33','7497e3bd-520e-4ef3-8b89-61d509f13f5f',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'5dcd90b6-9c16-482e-bf5f-dd97e09fad33',v_r,5,'10:00','11:00');
        v_a := pg_temp.sgei_get_asig('397fcab1-ce4a-4aa5-97d4-6af0817d9d30','4b99b990-a886-4279-8a15-1b7698a721c1',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'397fcab1-ce4a-4aa5-97d4-6af0817d9d30',v_r,5,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('a18fc3ef-ed71-48a7-9e95-5323f4dabefd','3a6a7abf-3458-4d16-a6db-42545d26ce78',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a18fc3ef-ed71-48a7-9e95-5323f4dabefd',v_r,4,'12:30','13:30');
        v_a := pg_temp.sgei_get_asig('841ffdd8-ea71-49d1-9365-09d77fa42d4b','75eff025-7037-4dea-a5fa-e46bb20f8b9f',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'841ffdd8-ea71-49d1-9365-09d77fa42d4b',v_r,4,'13:30','14:30');
    END LOOP;

    -- S5-6 PRIMARIA
    FOREACH v_r IN ARRAY ARRAY[v_s5p,v_s6p] LOOP
        v_a := pg_temp.sgei_get_asig('0b23ceb3-dda3-4695-ae44-f804c23d92cd','9a1faca9-6288-4391-8409-060cea513117',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,1,'12:30','13:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,1,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('0b23ceb3-dda3-4695-ae44-f804c23d92cd','a9a39816-7acb-4b20-bedc-dc9f6be7033d',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,3,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,3,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('0b23ceb3-dda3-4695-ae44-f804c23d92cd','1a15005d-d121-4221-8f89-9a4424efb953',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,2,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,2,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('0b23ceb3-dda3-4695-ae44-f804c23d92cd','f54b4028-7ffd-4b91-9581-12789f3b7355',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,3,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,3,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('0b23ceb3-dda3-4695-ae44-f804c23d92cd','88a95c55-9c2b-4daa-9edf-39c6520b1aea',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,4,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'0b23ceb3-dda3-4695-ae44-f804c23d92cd',v_r,4,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('50b487c5-46c5-464b-9152-8773b9924b95','8d579e05-dcf5-4acc-b76e-7f5ec633414d',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'50b487c5-46c5-464b-9152-8773b9924b95',v_r,1,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'50b487c5-46c5-464b-9152-8773b9924b95',v_r,1,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('50b487c5-46c5-464b-9152-8773b9924b95','1d1a3a2f-79c5-46ae-a8ed-d3abec7dd28e',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'50b487c5-46c5-464b-9152-8773b9924b95',v_r,2,'12:30','13:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'50b487c5-46c5-464b-9152-8773b9924b95',v_r,2,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('50b487c5-46c5-464b-9152-8773b9924b95','7ec3aad3-3501-4769-a1f9-52074ed8ea59',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'50b487c5-46c5-464b-9152-8773b9924b95',v_r,5,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('7d88a64b-c09b-4544-87f2-79c148808a6a','df963e14-6e2f-42d3-81f7-42947a248ba3',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'7d88a64b-c09b-4544-87f2-79c148808a6a',v_r,2,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'7d88a64b-c09b-4544-87f2-79c148808a6a',v_r,2,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('7d88a64b-c09b-4544-87f2-79c148808a6a','5406d904-6cfc-4f7d-8590-111cbd51fbf3',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'7d88a64b-c09b-4544-87f2-79c148808a6a',v_r,3,'12:30','13:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'7d88a64b-c09b-4544-87f2-79c148808a6a',v_r,3,'13:30','14:30');
        v_a := pg_temp.sgei_get_asig('12a5890b-bb05-4838-b7da-3d9cdc2c858c','72c968a3-a168-418b-a059-3e63e822b9b5',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'12a5890b-bb05-4838-b7da-3d9cdc2c858c',v_r,5,'07:45','08:40');
        PERFORM pg_temp.sgei_ins_hor(v_a,'12a5890b-bb05-4838-b7da-3d9cdc2c858c',v_r,5,'08:40','09:40');
        v_a := pg_temp.sgei_get_asig('12a5890b-bb05-4838-b7da-3d9cdc2c858c','cdd0a488-f18f-4f48-956a-c756babe5c71',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'12a5890b-bb05-4838-b7da-3d9cdc2c858c',v_r,5,'12:30','13:30');
        v_a := pg_temp.sgei_get_asig('12a5890b-bb05-4838-b7da-3d9cdc2c858c','f14665cf-c27c-4bfd-aa08-fb923c3fb128',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'12a5890b-bb05-4838-b7da-3d9cdc2c858c',v_r,4,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'12a5890b-bb05-4838-b7da-3d9cdc2c858c',v_r,4,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('ccb50ebe-5758-4091-b206-f6f169536aff','cd0cdbe0-e66a-4451-be52-6ce505e5f9c9',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,5,'10:00','11:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'ccb50ebe-5758-4091-b206-f6f169536aff',v_r,5,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('5dcd90b6-9c16-482e-bf5f-dd97e09fad33','7497e3bd-520e-4ef3-8b89-61d509f13f5f',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'5dcd90b6-9c16-482e-bf5f-dd97e09fad33',v_r,1,'10:00','11:00');
        v_a := pg_temp.sgei_get_asig('397fcab1-ce4a-4aa5-97d4-6af0817d9d30','4b99b990-a886-4279-8a15-1b7698a721c1',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'397fcab1-ce4a-4aa5-97d4-6af0817d9d30',v_r,1,'11:00','12:00');
        v_a := pg_temp.sgei_get_asig('a18fc3ef-ed71-48a7-9e95-5323f4dabefd','3a6a7abf-3458-4d16-a6db-42545d26ce78',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a18fc3ef-ed71-48a7-9e95-5323f4dabefd',v_r,4,'12:30','13:30');
        v_a := pg_temp.sgei_get_asig('841ffdd8-ea71-49d1-9365-09d77fa42d4b','75eff025-7037-4dea-a5fa-e46bb20f8b9f',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'841ffdd8-ea71-49d1-9365-09d77fa42d4b',v_r,4,'13:30','14:30');
    END LOOP;


    -- ================================================================
    --  SECUNDARIA schedules (1°-5° Secundaria, A+B)
    --  Subjects per grade from DDL: 17 courses × 2–3h/wk
    -- ================================================================

    -- 1° SECUNDARIA (A+B)
    FOREACH v_r IN ARRAY ARRAY[v_s1s,v_s1b] LOOP
        v_a := pg_temp.sgei_get_asig('716a8136-736e-4a62-9307-a10da3c2e1e7','0638570c-0804-4347-b031-820cd991d281',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,1,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,3,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,5,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','f1c2a8c1-c618-4ffe-9304-71c1060fcb43',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,1,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,2,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,4,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','8fa517b3-5984-4b1e-9419-0f49f680efc6',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'08:30','09:15');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','baf71132-7816-4b8b-a159-716e2041f9ec',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,3,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,5,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','f3e7b454-5a98-4166-bd28-b295ea598208',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,1,'09:15','10:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','add087ed-8a7e-4342-b5ee-e16db310fd45',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,1,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,3,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('f97e88c4-eca4-434e-8a48-d636f06e8687','d86744b8-c623-4145-9a6b-5a15b0c6b176',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,1,'10:45','11:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,3,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,5,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('c6a62784-9505-4a00-9906-e4cad75a4f8c','6a4f0ffd-4683-40cc-a942-e4261651bcb0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c6a62784-9505-4a00-9906-e4cad75a4f8c',v_r,2,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','efb557dd-b1e2-4e9c-bea1-f47d600a0f19',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,4,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('e31efeed-1896-483e-9ad5-8a4aad5b1010','c1283774-290d-4500-852f-66ab301a207a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e31efeed-1896-483e-9ad5-8a4aad5b1010',v_r,2,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('0a20b6a8-f7c8-4293-b167-000288cefbcc','26d214e0-04cc-43b0-8943-a994a76ca77c',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0a20b6a8-f7c8-4293-b167-000288cefbcc',v_r,3,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('73f9d515-a13f-48b1-bc20-14dac2414b1e','0a15da33-5cf2-4721-9ae6-e48efdd338ce',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,1,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,4,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('3561156b-5310-41f8-93b1-3399d5c52ec8','06ae67e5-7a35-4846-81b0-7cd1de35f4da',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,2,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,5,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('967c86ed-db4b-4444-b93a-628ed0810f41','3b3294fd-79ea-49de-af2d-5265c5e97923',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,1,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,3,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('6d795bf0-5a91-4e08-adc1-4073fc76a9d7','91fe1b22-4d92-4e29-a085-a85dabe99d3a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,2,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,4,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_c_ing_s,v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,3,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,5,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('c43a0e16-1d1a-4926-9965-51cd49f020a1','d579909b-4c1b-400e-a585-f4409bb638c9',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c43a0e16-1d1a-4926-9965-51cd49f020a1',v_r,4,'12:15','13:00');
        v_a := pg_temp.sgei_get_asig('cf94825e-3f94-4a62-8974-8694e88cfb4f','6d76c76b-1329-438a-9f2e-c146c5d13aa0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'cf94825e-3f94-4a62-8974-8694e88cfb4f',v_r,5,'12:15','13:00');
        v_a := pg_temp.sgei_get_asig('e31efeed-1896-483e-9ad5-8a4aad5b1010','c1283774-290d-4500-852f-66ab301a207a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e31efeed-1896-483e-9ad5-8a4aad5b1010',v_r,2,'10:45','11:30');
    END LOOP;

    -- 2° SECUNDARIA (A+B)
    FOREACH v_r IN ARRAY ARRAY[v_s2s,v_s2b] LOOP
        v_a := pg_temp.sgei_get_asig('716a8136-736e-4a62-9307-a10da3c2e1e7','0638570c-0804-4347-b031-820cd991d281',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,1,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,3,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,5,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','f1c2a8c1-c618-4ffe-9304-71c1060fcb43',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,1,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,2,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,4,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','8fa517b3-5984-4b1e-9419-0f49f680efc6',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'08:30','09:15');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','baf71132-7816-4b8b-a159-716e2041f9ec',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,3,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,5,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','f3e7b454-5a98-4166-bd28-b295ea598208',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,1,'09:15','10:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','add087ed-8a7e-4342-b5ee-e16db310fd45',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,1,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,3,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('f97e88c4-eca4-434e-8a48-d636f06e8687','d86744b8-c623-4145-9a6b-5a15b0c6b176',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,1,'10:45','11:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,3,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,5,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('c6a62784-9505-4a00-9906-e4cad75a4f8c','6a4f0ffd-4683-40cc-a942-e4261651bcb0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c6a62784-9505-4a00-9906-e4cad75a4f8c',v_r,2,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','efb557dd-b1e2-4e9c-bea1-f47d600a0f19',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,4,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('e31efeed-1896-483e-9ad5-8a4aad5b1010','c1283774-290d-4500-852f-66ab301a207a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e31efeed-1896-483e-9ad5-8a4aad5b1010',v_r,2,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('0a20b6a8-f7c8-4293-b167-000288cefbcc','26d214e0-04cc-43b0-8943-a994a76ca77c',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0a20b6a8-f7c8-4293-b167-000288cefbcc',v_r,3,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('73f9d515-a13f-48b1-bc20-14dac2414b1e','0a15da33-5cf2-4721-9ae6-e48efdd338ce',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,1,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,4,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('3561156b-5310-41f8-93b1-3399d5c52ec8','06ae67e5-7a35-4846-81b0-7cd1de35f4da',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,2,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,5,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('967c86ed-db4b-4444-b93a-628ed0810f41','3b3294fd-79ea-49de-af2d-5265c5e97923',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,1,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,3,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('6d795bf0-5a91-4e08-adc1-4073fc76a9d7','91fe1b22-4d92-4e29-a085-a85dabe99d3a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,2,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,4,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_c_ing_s,v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,3,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,5,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('c43a0e16-1d1a-4926-9965-51cd49f020a1','d579909b-4c1b-400e-a585-f4409bb638c9',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c43a0e16-1d1a-4926-9965-51cd49f020a1',v_r,4,'12:15','13:00');
        v_a := pg_temp.sgei_get_asig('cf94825e-3f94-4a62-8974-8694e88cfb4f','6d76c76b-1329-438a-9f2e-c146c5d13aa0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'cf94825e-3f94-4a62-8974-8694e88cfb4f',v_r,5,'12:15','13:00');
    END LOOP;

    -- 3° SECUNDARIA (A+B)
    FOREACH v_r IN ARRAY ARRAY[v_s3s,v_s3b] LOOP
        v_a := pg_temp.sgei_get_asig('716a8136-736e-4a62-9307-a10da3c2e1e7','0638570c-0804-4347-b031-820cd991d281',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,1,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,3,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,5,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','f1c2a8c1-c618-4ffe-9304-71c1060fcb43',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,1,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,2,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,4,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','8fa517b3-5984-4b1e-9419-0f49f680efc6',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'08:30','09:15');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','baf71132-7816-4b8b-a159-716e2041f9ec',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,3,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,5,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','f3e7b454-5a98-4166-bd28-b295ea598208',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,1,'09:15','10:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','add087ed-8a7e-4342-b5ee-e16db310fd45',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,1,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,3,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('f97e88c4-eca4-434e-8a48-d636f06e8687','d86744b8-c623-4145-9a6b-5a15b0c6b176',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,1,'10:45','11:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,3,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,5,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('c6a62784-9505-4a00-9906-e4cad75a4f8c','6a4f0ffd-4683-40cc-a942-e4261651bcb0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c6a62784-9505-4a00-9906-e4cad75a4f8c',v_r,2,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','efb557dd-b1e2-4e9c-bea1-f47d600a0f19',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,4,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('e31efeed-1896-483e-9ad5-8a4aad5b1010','c1283774-290d-4500-852f-66ab301a207a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e31efeed-1896-483e-9ad5-8a4aad5b1010',v_r,2,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('0a20b6a8-f7c8-4293-b167-000288cefbcc','26d214e0-04cc-43b0-8943-a994a76ca77c',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0a20b6a8-f7c8-4293-b167-000288cefbcc',v_r,3,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('73f9d515-a13f-48b1-bc20-14dac2414b1e','0a15da33-5cf2-4721-9ae6-e48efdd338ce',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,1,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,4,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('3561156b-5310-41f8-93b1-3399d5c52ec8','06ae67e5-7a35-4846-81b0-7cd1de35f4da',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,2,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,5,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('967c86ed-db4b-4444-b93a-628ed0810f41','3b3294fd-79ea-49de-af2d-5265c5e97923',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,1,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,3,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('6d795bf0-5a91-4e08-adc1-4073fc76a9d7','91fe1b22-4d92-4e29-a085-a85dabe99d3a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,2,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,4,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_c_ing_s,v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,3,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,5,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('c43a0e16-1d1a-4926-9965-51cd49f020a1','d579909b-4c1b-400e-a585-f4409bb638c9',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c43a0e16-1d1a-4926-9965-51cd49f020a1',v_r,4,'12:15','13:00');
        v_a := pg_temp.sgei_get_asig('cf94825e-3f94-4a62-8974-8694e88cfb4f','6d76c76b-1329-438a-9f2e-c146c5d13aa0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'cf94825e-3f94-4a62-8974-8694e88cfb4f',v_r,5,'12:15','13:00');
    END LOOP;

    -- 4° SECUNDARIA (A+B)
    FOREACH v_r IN ARRAY ARRAY[v_s4s,v_s4b] LOOP
        v_a := pg_temp.sgei_get_asig('716a8136-736e-4a62-9307-a10da3c2e1e7','0638570c-0804-4347-b031-820cd991d281',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,1,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,3,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,5,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','f1c2a8c1-c618-4ffe-9304-71c1060fcb43',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,1,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,2,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,4,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','8fa517b3-5984-4b1e-9419-0f49f680efc6',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'08:30','09:15');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','baf71132-7816-4b8b-a159-716e2041f9ec',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,3,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,5,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','f3e7b454-5a98-4166-bd28-b295ea598208',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,1,'09:15','10:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','add087ed-8a7e-4342-b5ee-e16db310fd45',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,1,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,3,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('f97e88c4-eca4-434e-8a48-d636f06e8687','d86744b8-c623-4145-9a6b-5a15b0c6b176',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,1,'10:45','11:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,3,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,5,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('c6a62784-9505-4a00-9906-e4cad75a4f8c','6a4f0ffd-4683-40cc-a942-e4261651bcb0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c6a62784-9505-4a00-9906-e4cad75a4f8c',v_r,2,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','efb557dd-b1e2-4e9c-bea1-f47d600a0f19',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,4,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('e31efeed-1896-483e-9ad5-8a4aad5b1010','c1283774-290d-4500-852f-66ab301a207a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e31efeed-1896-483e-9ad5-8a4aad5b1010',v_r,2,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('0a20b6a8-f7c8-4293-b167-000288cefbcc','26d214e0-04cc-43b0-8943-a994a76ca77c',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0a20b6a8-f7c8-4293-b167-000288cefbcc',v_r,3,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('73f9d515-a13f-48b1-bc20-14dac2414b1e','0a15da33-5cf2-4721-9ae6-e48efdd338ce',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,1,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,4,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('3561156b-5310-41f8-93b1-3399d5c52ec8','06ae67e5-7a35-4846-81b0-7cd1de35f4da',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,2,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,5,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('967c86ed-db4b-4444-b93a-628ed0810f41','3b3294fd-79ea-49de-af2d-5265c5e97923',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,1,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,3,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('6d795bf0-5a91-4e08-adc1-4073fc76a9d7','91fe1b22-4d92-4e29-a085-a85dabe99d3a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,2,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,4,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_c_ing_s,v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,3,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,5,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('c43a0e16-1d1a-4926-9965-51cd49f020a1','d579909b-4c1b-400e-a585-f4409bb638c9',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c43a0e16-1d1a-4926-9965-51cd49f020a1',v_r,4,'12:15','13:00');
        v_a := pg_temp.sgei_get_asig('cf94825e-3f94-4a62-8974-8694e88cfb4f','6d76c76b-1329-438a-9f2e-c146c5d13aa0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'cf94825e-3f94-4a62-8974-8694e88cfb4f',v_r,5,'12:15','13:00');
    END LOOP;

    -- 5° SECUNDARIA (A+B)
    FOREACH v_r IN ARRAY ARRAY[v_s5s,v_s5b] LOOP
        v_a := pg_temp.sgei_get_asig('716a8136-736e-4a62-9307-a10da3c2e1e7','0638570c-0804-4347-b031-820cd991d281',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,1,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,3,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'716a8136-736e-4a62-9307-a10da3c2e1e7',v_r,5,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','f1c2a8c1-c618-4ffe-9304-71c1060fcb43',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,1,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,2,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,4,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','8fa517b3-5984-4b1e-9419-0f49f680efc6',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'07:45','08:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,2,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'08:30','09:15');
        v_a := pg_temp.sgei_get_asig('a9e0de70-6ef9-4b3b-a39e-871ec569fd7a','baf71132-7816-4b8b-a159-716e2041f9ec',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,3,'08:30','09:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'a9e0de70-6ef9-4b3b-a39e-871ec569fd7a',v_r,5,'07:45','08:30');
        v_a := pg_temp.sgei_get_asig('8105c157-3b67-4d06-83a7-afc3b03afd51','f3e7b454-5a98-4166-bd28-b295ea598208',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,1,'09:15','10:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'8105c157-3b67-4d06-83a7-afc3b03afd51',v_r,4,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','add087ed-8a7e-4342-b5ee-e16db310fd45',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,1,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,3,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('f97e88c4-eca4-434e-8a48-d636f06e8687','d86744b8-c623-4145-9a6b-5a15b0c6b176',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,1,'10:45','11:30');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,3,'10:00','10:45');
        PERFORM pg_temp.sgei_ins_hor(v_a,'f97e88c4-eca4-434e-8a48-d636f06e8687',v_r,5,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('c6a62784-9505-4a00-9906-e4cad75a4f8c','6a4f0ffd-4683-40cc-a942-e4261651bcb0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c6a62784-9505-4a00-9906-e4cad75a4f8c',v_r,2,'09:15','10:00');
        v_a := pg_temp.sgei_get_asig('3d41d9dd-461b-4125-9b32-5a6b3199e4c2','efb557dd-b1e2-4e9c-bea1-f47d600a0f19',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3d41d9dd-461b-4125-9b32-5a6b3199e4c2',v_r,4,'10:00','10:45');
        v_a := pg_temp.sgei_get_asig('e31efeed-1896-483e-9ad5-8a4aad5b1010','c1283774-290d-4500-852f-66ab301a207a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'e31efeed-1896-483e-9ad5-8a4aad5b1010',v_r,2,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('0a20b6a8-f7c8-4293-b167-000288cefbcc','26d214e0-04cc-43b0-8943-a994a76ca77c',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'0a20b6a8-f7c8-4293-b167-000288cefbcc',v_r,3,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('73f9d515-a13f-48b1-bc20-14dac2414b1e','0a15da33-5cf2-4721-9ae6-e48efdd338ce',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,1,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'73f9d515-a13f-48b1-bc20-14dac2414b1e',v_r,4,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('3561156b-5310-41f8-93b1-3399d5c52ec8','06ae67e5-7a35-4846-81b0-7cd1de35f4da',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,2,'11:30','12:15');
        PERFORM pg_temp.sgei_ins_hor(v_a,'3561156b-5310-41f8-93b1-3399d5c52ec8',v_r,5,'10:45','11:30');
        v_a := pg_temp.sgei_get_asig('967c86ed-db4b-4444-b93a-628ed0810f41','3b3294fd-79ea-49de-af2d-5265c5e97923',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,1,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'967c86ed-db4b-4444-b93a-628ed0810f41',v_r,3,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('6d795bf0-5a91-4e08-adc1-4073fc76a9d7','91fe1b22-4d92-4e29-a085-a85dabe99d3a',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,2,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'6d795bf0-5a91-4e08-adc1-4073fc76a9d7',v_r,4,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_c_ing_s,v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,3,'12:15','13:00');
        PERFORM pg_temp.sgei_ins_hor(v_a,'2b5ac3b1-8abb-424c-933d-6386e7a60e41',v_r,5,'11:30','12:15');
        v_a := pg_temp.sgei_get_asig('c43a0e16-1d1a-4926-9965-51cd49f020a1','d579909b-4c1b-400e-a585-f4409bb638c9',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'c43a0e16-1d1a-4926-9965-51cd49f020a1',v_r,4,'12:15','13:00');
        v_a := pg_temp.sgei_get_asig('cf94825e-3f94-4a62-8974-8694e88cfb4f','6d76c76b-1329-438a-9f2e-c146c5d13aa0',v_r,v_periodo);
        PERFORM pg_temp.sgei_ins_hor(v_a,'cf94825e-3f94-4a62-8974-8694e88cfb4f',v_r,5,'12:15','13:00');
    END LOOP;

    -- Drop temp helpers
    DROP FUNCTION IF EXISTS pg_temp.sgei_get_asig(UUID,UUID,UUID,UUID);
    DROP FUNCTION IF EXISTS pg_temp.sgei_ins_hor(UUID,UUID,UUID,INT,TEXT,TEXT);

    RAISE NOTICE 'Horarios OK (Primaria + Secundaria A+B)';
    ALTER TABLE academic_schema.horario ENABLE TRIGGER tg_validar_cruce_horario;


    -- ================================================================
    --  S9: ALUMNOS (220) via INSERT con nombres predefinidos
    -- ================================================================
    WITH datos AS (
        SELECT g,
            (ARRAY['Carlos','María','José','Ana','Luis','Carmen','Jorge','Rosa','Miguel','Elena','Juan','Patricia','Pedro','Sofía','Diego','Laura','Andrés','Valeria','Pablo','Lucía'])[1+(g%20)] AS nombres,
            (ARRAY['García','Rodríguez','Martínez','López','Hernández','González','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Castillo','Reyes','Ortiz','Morales','Quispe','Huamán','Mamani','Cóndor'])[1+(g%20)] AS apellido_paterno,
            (ARRAY['García','Rodríguez','Martínez','López','Hernández','González','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Castillo','Reyes','Ortiz','Morales','Quispe','Huamán','Mamani','Cóndor'])[1+(g%20)] AS apellido_materno
        FROM generate_series(1,220) g
    )
    INSERT INTO auth_schema.credencial (id,usuario_login,password_hash,nombres,apellido_paterno,apellido_materno,activo,debe_cambiar_password)
    SELECT
        ('00000000-0000-0000-0001-'||lpad(to_hex(1024+g),12,'0'))::UUID,
        translate(lower(d.nombres),'áéíóúüñ','aeiouun')||'.'||
        translate(lower(d.apellido_paterno),'áéíóúüñ','aeiouun')||
        lpad(g::text,4,'0')||'@sgei.edu.pe',
        v_hash,
        d.nombres, d.apellido_paterno, d.apellido_materno,
        true, false
    FROM datos d
    ON CONFLICT DO NOTHING;

    INSERT INTO auth_schema.perfil_usuario (id,credencial_id,rol,entidad_tipo,entidad_id)
    SELECT
        ('00000000-0000-0000-0002-'||lpad(to_hex(1280+g),12,'0'))::UUID,
        ('00000000-0000-0000-0001-'||lpad(to_hex(1024+g),12,'0'))::UUID,
        'Alumno','alumno',
        ('00000000-0000-0000-0003-'||lpad(to_hex(g),12,'0'))::UUID
    FROM generate_series(1,220) g
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_schema.alumno (id,perfil_usuario_id,seccion_id,periodo_id,dni,nombres,apellido_paterno,apellido_materno,fecha_nacimiento,sexo,direccion,telefono_emergencia,activo)
    SELECT
        ('00000000-0000-0000-0003-'||lpad(to_hex(g),12,'0'))::UUID,
        ('00000000-0000-0000-0002-'||lpad(to_hex(1280+g),12,'0'))::UUID,
        (ARRAY[v_s1p,v_s2p,v_s3p,v_s4p,v_s5p,v_s6p,v_s1s,v_s2s,v_s3s,v_s4s,v_s5s,v_s1b,v_s2b,v_s3b,v_s4b,v_s5b])[1+((g-1)/14)],
        v_periodo,
        lpad((30000000+g)::text,8,'0'),
        (ARRAY['Carlos','María','José','Ana','Luis','Carmen','Jorge','Rosa','Miguel','Elena','Juan','Patricia','Pedro','Sofía','Diego','Laura','Andrés','Valeria','Pablo','Lucía'])[1+(g%20)],
        (ARRAY['García','Rodríguez','Martínez','López','Hernández','González','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Castillo','Reyes','Ortiz','Morales','Quispe','Huamán','Mamani','Cóndor'])[1+(g%20)],
        (ARRAY['García','Rodríguez','Martínez','López','Hernández','González','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Castillo','Reyes','Ortiz','Morales','Quispe','Huamán','Mamani','Cóndor'])[1+(g%20)],
        '2010-01-01'::date + g,
        CASE WHEN g%2=0 THEN 'M' ELSE 'F' END,
        'Av. Alumno '||g,
        '9876'||lpad(g::text,4,'0'),
        true
    FROM generate_series(1,220) g
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '220 alumnos insertados';

    -- ================================================================
    --  S10: NOTAS (Bimestre I — 4 competencias por alumno × 220 alumnos)
    --       tipo_evaluacion='Final', nota aleatoria 11-20
    -- ================================================================
    INSERT INTO academic_schema.nota (id,alumno_id,competencia_id,bimestre_id,docente_id,nota_vigesimal,tipo_evaluacion,observacion)
    WITH alumnos AS (
        SELECT id AS alumno_id, seccion_id FROM academic_schema.alumno WHERE periodo_id = v_periodo AND activo = true
    ), notas_data AS (
        SELECT
            a.alumno_id,
            comp.id AS competencia_id,
            floor(random()*10+11)::numeric(4,2) AS nv,
            COALESCE((SELECT d.id FROM academic_schema.docente d
                JOIN academic_schema.asignacion_docente ad ON ad.docente_id = d.id
                WHERE ad.seccion_id = a.seccion_id AND ad.curso_id = comp.curso_id
                LIMIT 1), (SELECT id FROM academic_schema.docente LIMIT 1)) AS did
        FROM alumnos a
        JOIN academic_schema.competencia comp ON comp.grado_id IS NULL
          AND comp.curso_id IN (
            SELECT gc.curso_id FROM academic_schema.grado_curso gc
            JOIN academic_schema.seccion s ON s.grado_id = gc.grado_id AND s.id = a.seccion_id
          )
    )
    SELECT gen_random_uuid(), alumno_id, competencia_id, v_b1, did, nv, 'Final', 'Nota Bimestre I'
    FROM notas_data
    ON CONFLICT (alumno_id, competencia_id, bimestre_id) DO NOTHING;

    RAISE NOTICE 'Notas Bimestre I insertadas';

    -- ================================================================
    --  S11: LIBRETAS (Bimestre I — PUBLICADA para todos)
    -- ================================================================
    INSERT INTO academic_schema.libreta (id,alumno_id,periodo_id,bimestre_id,estado,version,generada_por,fecha_generacion,aprobada_por,fecha_aprobacion,publicada_por,fecha_publicacion)
    SELECT
        gen_random_uuid(),
        a.id,
        v_periodo,
        v_b1,
        'PUBLICADA',
        1,
        v_perf_sec1, NOW(), v_perf_sec1, NOW(), v_perf_sec1, NOW()
    FROM academic_schema.alumno a
    WHERE a.periodo_id = v_periodo AND a.activo = true
    ON CONFLICT (alumno_id, periodo_id, bimestre_id) DO NOTHING;

    RAISE NOTICE 'Libretas Bimestre I publicadas';

    -- ================================================================
    --  S12: PAGOS (conceptos + registros de pago)
    -- ================================================================
    INSERT INTO financial_schema.concepto_pago (id,nombre,monto_base,activo) VALUES
    (gen_random_uuid(),'Matrícula 2026',150.00,true),
    (gen_random_uuid(),'Mensualidad Marzo',250.00,true),
    (gen_random_uuid(),'Mensualidad Abril',250.00,true),
    (gen_random_uuid(),'Mensualidad Mayo',250.00,true),
    (gen_random_uuid(),'Mensualidad Junio',250.00,true),
    (gen_random_uuid(),'Cuota APAFA',50.00,true),
    (gen_random_uuid(),'Seguro Escolar',35.00,true)
    ON CONFLICT DO NOTHING;

    -- TODOS los alumnos quedan AL DÍA (no deudores): matrícula + Mar/Abr/May 'Pagado'.
    -- fn_tiene_deuda_pendiente solo cuenta 'Pendiente'/'Rechazado', así que ninguna
    -- libreta se bloquea por deuda (fn_bloquea_libreta = FALSE para todos).
    INSERT INTO financial_schema.pago (id,alumno_id,concepto_id,periodo_id,mes,monto,estado,fecha_vencimiento,fecha_pago,generado_por)
    SELECT gen_random_uuid(), a.id, c.id, v_periodo, cp.mes, c.monto_base,
           'Pagado', cp.venc, cp.venc - 3, v_perf_sec1
    FROM academic_schema.alumno a
    CROSS JOIN (VALUES
        ('Matrícula 2026',    3, DATE '2026-03-15'),
        ('Mensualidad Marzo', 3, DATE '2026-03-31'),
        ('Mensualidad Abril', 4, DATE '2026-04-30'),
        ('Mensualidad Mayo',  5, DATE '2026-05-31')
    ) AS cp(nombre, mes, venc)
    JOIN financial_schema.concepto_pago c ON c.nombre = cp.nombre
    WHERE a.periodo_id = v_periodo AND a.activo = true;

    -- Mensualidad Junio: la mayoría 'Pagado'; un grupo de 15 la deja 'Pendiente'
    -- para luego subir su boleta (queda 'En_Revision' vía trigger). 'En_Revision'
    -- NO es deuda, así que estos alumnos TAMPOCO son deudores: solo dan trabajo de
    -- validación a Secretaría (flujo de validación de pagos con datos reales).
    INSERT INTO financial_schema.pago (id,alumno_id,concepto_id,periodo_id,mes,monto,estado,fecha_vencimiento,fecha_pago,generado_por)
    SELECT gen_random_uuid(), q.id, c.id, v_periodo, 6, c.monto_base,
           CASE WHEN q.rn <= 15 THEN 'Pendiente'::financial_schema.estado_pago
                ELSE 'Pagado'::financial_schema.estado_pago END,
           DATE '2026-06-30',
           CASE WHEN q.rn <= 15 THEN NULL ELSE DATE '2026-06-27' END,
           v_perf_sec1
    FROM (SELECT id, row_number() OVER (ORDER BY dni) AS rn
          FROM academic_schema.alumno WHERE periodo_id = v_periodo AND activo = true) q
    CROSS JOIN (SELECT id, monto_base FROM financial_schema.concepto_pago WHERE nombre='Mensualidad Junio') c;

    -- Boletas subidas por esos 15 alumnos → el trigger tg_boleta_insertada
    -- transiciona su pago de 'Pendiente' a 'En_Revision' automáticamente.
    INSERT INTO financial_schema.boleta_pago (id,pago_id,url_archivo,nombre_archivo,banco,numero_operacion,estado_revision,fecha_subida)
    SELECT gen_random_uuid(), p.id,
           '/uploads/demo/boleta-'||p.id||'.jpg', 'voucher-junio.jpg',
           (ARRAY['BCP','Interbank','BBVA','Scotiabank'])[1+(row_number() OVER (ORDER BY p.id))::int % 4],
           'OP'||lpad((row_number() OVER (ORDER BY p.id))::text,6,'0'),
           'En_Revision', NOW()
    FROM financial_schema.pago p
    WHERE p.periodo_id = v_periodo AND p.mes = 6 AND p.estado = 'Pendiente';

    RAISE NOTICE 'Pagos insertados (todos al día; 15 boletas En_Revision para validar)';

    -- ================================================================
    --  S13: ASISTENCIA (muestra — marzo 2026)
    -- ================================================================
    INSERT INTO academic_schema.asistencia (id,alumno_id,seccion_id,fecha,estado,justificacion,registrado_por)
    SELECT
        gen_random_uuid() AS id,
        a.id,
        a.seccion_id,
        '2026-03-10'::date + (g % 5) AS fecha,
        CASE WHEN random() < 0.1 THEN 'F'::academic_schema.estado_asistencia WHEN random() < 0.15 THEN 'T'::academic_schema.estado_asistencia ELSE 'P'::academic_schema.estado_asistencia END,
        NULL,
        'c0b24d4a-b9be-4315-a37b-dc38d53b7abc'
    FROM generate_series(1,220) g
    JOIN academic_schema.alumno a ON a.id = ('00000000-0000-0000-0003-'||lpad(to_hex(g),12,'0'))::UUID
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Asistencia insertada';

    -- ================================================================
    --  S14: REFRESH MATERIALIZED VIEWS
    --  IMPORTANTE: estas dos MV se crean en el DDL ANTES de existir datos,
    --  por lo que quedan vacías. El backend las consume directamente
    --  (LibretaRepository → mv_libreta_alumno, SiagieRepository → formato_siagie),
    --  así que hay que refrescarlas aquí para que un clon nuevo muestre datos
    --  de inmediato (libretas y export SIAGIE) sin esperar a un refresh manual.
    -- ================================================================
    BEGIN
        REFRESH MATERIALIZED VIEW academic_schema.mv_libreta_alumno;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
    BEGIN
        REFRESH MATERIALIZED VIEW audit_schema.formato_siagie;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    RAISE NOTICE 'Seed completada exitosamente.';
END $do$;

-- ================================================================
--  S15: SIMULACROS DE ADMISIÓN (banco de preguntas + examen armado)
--  · Simulacro Nº1 'Activo' (Bimestre I): banco de 5 preguntas por
--    (grado, curso) de Secundaria — sección A — del docente asignado.
--  · Examen armado (snapshot inmutable) para 5° de Secundaria.
--  · Simulacro Nº2 'Borrador' (Bimestre II), aún sin preguntas.
--  Las tablas de simulacro NO tienen trigger de auditoría, por eso va
--  en un bloque propio y autónomo (re-SELECTea período/bimestre/grado).
-- ================================================================
DO $sim$
DECLARE
    v_periodo UUID;
    v_b1 UUID; v_b2 UUID; v_g5s UUID;
    v_admin UUID := '00000000-0000-0000-0002-000000000001';
    v_sim1 UUID := gen_random_uuid();
    v_sim2 UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_periodo FROM academic_schema.periodo_academico WHERE activo = true LIMIT 1;
    SELECT id INTO v_b1 FROM academic_schema.bimestre WHERE periodo_id = v_periodo AND numero = 1;
    SELECT id INTO v_b2 FROM academic_schema.bimestre WHERE periodo_id = v_periodo AND numero = 2;
    SELECT g.id INTO v_g5s
      FROM academic_schema.grado g JOIN academic_schema.nivel n ON n.id = g.nivel_id
      WHERE n.nombre = 'Secundaria' AND g.orden = 5 LIMIT 1;

    INSERT INTO academic_schema.simulacro (id,periodo_id,bimestre_id,numero,nombre,estado,created_by) VALUES
      (v_sim1, v_periodo, v_b1, 1, 'Simulacro de Admisión I',  'Activo',   v_admin),
      (v_sim2, v_periodo, v_b2, 2, 'Simulacro de Admisión II', 'Borrador', v_admin);

    -- Banco: exactamente 5 preguntas por (grado, curso) de Secundaria (sección A).
    -- DISTINCT ON garantiza UN solo docente por (grado, curso) → 5 preguntas por bloque,
    -- evitando choques de 'orden' al armar el examen (snapshot).
    WITH asig AS (
        SELECT DISTINCT ON (s.grado_id, ad.curso_id)
               ad.docente_id, ad.curso_id, s.grado_id, s.id AS seccion_id, cu.nombre AS curso_nombre, g.nombre AS grado_nombre
        FROM academic_schema.asignacion_docente ad
        JOIN academic_schema.seccion s ON s.id = ad.seccion_id AND s.nombre = 'A'
        JOIN academic_schema.grado  g ON g.id = s.grado_id
        JOIN academic_schema.nivel  n ON n.id = g.nivel_id AND n.nombre = 'Secundaria'
        JOIN academic_schema.curso  cu ON cu.id = ad.curso_id
        WHERE ad.periodo_id = v_periodo AND ad.activo = true
        ORDER BY s.grado_id, ad.curso_id, ad.docente_id
    )
    INSERT INTO academic_schema.simulacro_pregunta
        (id, simulacro_id, docente_id, curso_id, grado_id, seccion_id,
         enunciado, alt_a, alt_b, alt_c, alt_d, alt_e, respuesta_correcta, orden)
    SELECT gen_random_uuid(), v_sim1, a.docente_id, a.curso_id, a.grado_id, a.seccion_id,
           'Pregunta '||q.n||' de '||a.curso_nombre||' — '||a.grado_nombre||' (marque la alternativa correcta)',
           'Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D', 'Alternativa E',
           (ARRAY['A','B','C','D','E'])[q.n], q.n
    FROM asig a
    CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS q(n);

    -- Examen armado para 5° de Secundaria: un examen por curso (orden secuencial)…
    INSERT INTO academic_schema.simulacro_examen (id, simulacro_id, grado_id, curso_id, orden)
    SELECT gen_random_uuid(), v_sim1, d.grado_id, d.curso_id,
           row_number() OVER (ORDER BY cu.nombre)
    FROM (SELECT DISTINCT grado_id, curso_id
          FROM academic_schema.simulacro_pregunta
          WHERE simulacro_id = v_sim1 AND grado_id = v_g5s) d
    JOIN academic_schema.curso cu ON cu.id = d.curso_id;

    -- …y su snapshot inmutable (copia el contenido de las 5 preguntas del banco).
    INSERT INTO academic_schema.simulacro_examen_pregunta
        (id, examen_id, pregunta_id, orden, enunciado, imagen_url, alt_a, alt_b, alt_c, alt_d, alt_e, respuesta_correcta)
    SELECT gen_random_uuid(), se.id, sp.id, sp.orden,
           sp.enunciado, sp.imagen_url, sp.alt_a, sp.alt_b, sp.alt_c, sp.alt_d, sp.alt_e, sp.respuesta_correcta
    FROM academic_schema.simulacro_examen se
    JOIN academic_schema.simulacro_pregunta sp
      ON sp.simulacro_id = se.simulacro_id AND sp.grado_id = se.grado_id AND sp.curso_id = se.curso_id;

    RAISE NOTICE 'Simulacros OK (banco Secundaria + examen 5° armado)';
END $sim$;

-- ================================================================
--  S16: PUBLICACIÓN DE HORARIOS (snapshot desnormalizado)
--  El horario "borrador" vive en academic_schema.horario, pero los
--  portales de Alumno (GET /api/alumnos/:id/horario) y Docente
--  (GET /api/docentes/:id/horario) solo leen el SNAPSHOT PUBLICADO
--  (horario_publicacion + _bloque). Sin esto devuelven 404
--  "Horario publicado no encontrado". Aquí publicamos TODAS las
--  secciones y TODOS los docentes que ya tienen bloques cargados,
--  replicando exactamente lo que hace HorarioPublicacionRepository.publicar().
-- ================================================================
DO $pub$
DECLARE
    v_periodo    UUID;
    v_perf_admin UUID := '00000000-0000-0000-0002-000000000001';
BEGIN
    SELECT id INTO v_periodo FROM academic_schema.periodo_academico WHERE activo = true LIMIT 1;

    -- ── Publicación por SECCIÓN ────────────────────────────────
    WITH pub AS (
        INSERT INTO academic_schema.horario_publicacion (tipo, seccion_id, periodo_id, publicado_por)
        SELECT 'SECCION', s.id, v_periodo, v_perf_admin
        FROM academic_schema.seccion s
        WHERE s.periodo_id = v_periodo
          AND EXISTS (
              SELECT 1 FROM academic_schema.asignacion_docente ad
              JOIN academic_schema.horario h ON h.asignacion_id = ad.id
              WHERE ad.seccion_id = s.id AND ad.periodo_id = v_periodo)
        RETURNING id, seccion_id
    )
    INSERT INTO academic_schema.horario_publicacion_bloque
        (publicacion_id, horario_id_origen, dia_semana, hora_inicio, hora_fin, aula_snapshot,
         curso_nombre_snapshot, docente_nombre_snapshot, seccion_nombre_snapshot,
         grado_nombre_snapshot, nivel_nombre_snapshot)
    SELECT pub.id, h.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.aula,
           cu.nombre,
           d.nombres||' '||d.apellido_paterno||' '||COALESCE(d.apellido_materno,''),
           s.nombre, g.nombre, niv.nombre
    FROM pub
    JOIN academic_schema.seccion s ON s.id = pub.seccion_id
    JOIN academic_schema.grado  g   ON g.id = s.grado_id
    JOIN academic_schema.nivel  niv ON niv.id = g.nivel_id
    JOIN academic_schema.asignacion_docente ad ON ad.seccion_id = s.id AND ad.periodo_id = v_periodo
    JOIN academic_schema.horario h  ON h.asignacion_id = ad.id
    JOIN academic_schema.curso   cu ON cu.id = ad.curso_id
    JOIN academic_schema.docente d  ON d.id = ad.docente_id;

    -- ── Publicación por DOCENTE ────────────────────────────────
    WITH pub AS (
        INSERT INTO academic_schema.horario_publicacion (tipo, docente_id, periodo_id, publicado_por)
        SELECT 'DOCENTE', d.id, v_periodo, v_perf_admin
        FROM academic_schema.docente d
        WHERE EXISTS (
            SELECT 1 FROM academic_schema.asignacion_docente ad
            JOIN academic_schema.horario h ON h.asignacion_id = ad.id
            WHERE ad.docente_id = d.id AND ad.periodo_id = v_periodo)
        RETURNING id, docente_id
    )
    INSERT INTO academic_schema.horario_publicacion_bloque
        (publicacion_id, horario_id_origen, dia_semana, hora_inicio, hora_fin, aula_snapshot,
         curso_nombre_snapshot, docente_nombre_snapshot, seccion_nombre_snapshot,
         grado_nombre_snapshot, nivel_nombre_snapshot)
    SELECT pub.id, h.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.aula,
           cu.nombre,
           d.nombres||' '||d.apellido_paterno||' '||COALESCE(d.apellido_materno,''),
           s.nombre, g.nombre, niv.nombre
    FROM pub
    JOIN academic_schema.docente d  ON d.id = pub.docente_id
    JOIN academic_schema.asignacion_docente ad ON ad.docente_id = d.id AND ad.periodo_id = v_periodo
    JOIN academic_schema.horario h  ON h.asignacion_id = ad.id
    JOIN academic_schema.curso   cu ON cu.id = ad.curso_id
    JOIN academic_schema.seccion s  ON s.id = ad.seccion_id
    JOIN academic_schema.grado   g  ON g.id = s.grado_id
    JOIN academic_schema.nivel   niv ON niv.id = g.nivel_id;

    RAISE NOTICE 'Horarios publicados (secciones + docentes)';
END $pub$;

-- ================================================================
--  ÍNDICES FALTANTES (FK sin cobertura)
--  Se ejecutan fuera de transacción para persistir incluso si el
--  seed falla. Cada bloque captura undefined_table por si alguna
--  tabla no se creó.
-- ================================================================

-- financial_schema.pago · concepto_id → concepto_pago
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_pago_concepto ON financial_schema.pago (concepto_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- financial_schema.pago · generado_por → perfil_usuario
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_pago_generado_por ON financial_schema.pago (generado_por);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- financial_schema.boleta_pago · revisado_por → perfil_usuario
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_boleta_pago_revisado_por ON financial_schema.boleta_pago (revisado_por);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- financial_schema.boleta_pago · ORDER BY fecha_subida DESC (sin filtro)
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_boleta_fecha_subida ON financial_schema.boleta_pago (fecha_subida DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- financial_schema.boleta_pago · filtro por estado_revision + ORDER BY fecha_subida
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_boleta_estado_fecha ON financial_schema.boleta_pago (estado_revision, fecha_subida DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- academic_schema.asistencia_docente · registrado_por → perfil_usuario
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_asistencia_docente_registrado_por ON academic_schema.asistencia_docente (registrado_por);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- academic_schema.libreta · generada_por / aprobada_por / publicada_por → perfil_usuario
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_libreta_generada_por ON academic_schema.libreta (generada_por);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_libreta_aprobada_por ON academic_schema.libreta (aprobada_por);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_libreta_publicada_por ON academic_schema.libreta (publicada_por);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- audit_schema.sesion_auditoria · columnas de búsqueda frecuente
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_sesion_auditoria_usuario ON audit_schema.sesion_auditoria (usuario_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_sesion_auditoria_entidad ON audit_schema.sesion_auditoria (entidad_afectada, entidad_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- audit_schema.historial_nota · nota_id / modificado_por
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_historial_nota_nota ON audit_schema.historial_nota (nota_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_historial_nota_modificado_por ON audit_schema.historial_nota (modificado_por);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- academic_schema.horario_publicacion_bloque · rango de horas
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_horario_publicacion_bloque_inicio ON academic_schema.horario_publicacion_bloque (hora_inicio);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- financial_schema.notificacion · orden por fecha
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_notificacion_created_at ON financial_schema.notificacion (created_at);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

