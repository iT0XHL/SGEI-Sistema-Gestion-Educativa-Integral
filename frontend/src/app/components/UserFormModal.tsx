import { useState, useEffect } from 'react';
import {
  Eye, EyeOff, X, AlertTriangle, ChevronDown, Loader2,
} from 'lucide-react';
import {
  usuariosApi, docentesAdminApi, alumnosAdminApi,
  estructuraApi, periodosApi,
} from '../../lib/api/admin.api';
import type {
  UsuarioDTO, DocenteDTO, AlumnoDetalleDTO,
  CreateUsuarioPayload, CreateDocentePayload, CreateAlumnoPayload,
  UpdateUsuarioPayload, UpdateDocentePayload, UpdateAlumnoPayload,
  PeriodoDTO, SeccionDTO,
} from '../../lib/api/admin.api';

export type FormRol = 'Docente' | 'Admin' | 'Secretaria' | 'Alumno';

export interface UserFormData {
  usuario_login: string;
  password: string;
  confirmPassword: string;
  cambiaPassword: boolean;  // edit mode: true = show password fields
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  // Docente
  especialidad: string;
  email_institucional: string;
  fecha_nacimiento: string;
  sexo: string;
  titulo_profesional: string;
  fecha_ingreso: string;
  // Admin / Secretaria
  rol: 'Admin' | 'Secretaria';
  // Alumno
  seccion_id: string;
  periodo_id: string;
  codigo_siagie: string;
  direccion: string;
  distrito: string;
  telefono_emergencia: string;
  grupo_sanguineo: string;
  condicion_especial: string;
}

interface Props {
  mode: 'create' | 'edit';
  rol: FormRol;
  initialData?: Partial<UserFormData> & { id?: string };
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const SEXOS = ['M', 'F'] as const;
const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const ESPECIALIDADES = [
  'Matemática', 'Comunicación', 'Historia, Geografía y Economía',
  'Ciencias Sociales', 'Ciencia y Tecnología', 'Inglés',
  'Educación Física', 'Arte y Cultura', 'Educación para el Trabajo',
  'DPCC', 'Formación Religiosa', 'Tutoría', 'Computación e Informática',
];

function emptyFormData(rol: FormRol): UserFormData {
  return {
    usuario_login: '',
    password: '',
    confirmPassword: '',
    cambiaPassword: false,
    dni: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    telefono: '',
    especialidad: '',
    email_institucional: '',
    fecha_nacimiento: '',
    sexo: '',
    titulo_profesional: '',
    fecha_ingreso: '',
    rol: 'Admin',
    seccion_id: '',
    periodo_id: '',
    codigo_siagie: '',
    direccion: '',
    distrito: '',
    telefono_emergencia: '',
    grupo_sanguineo: '',
    condicion_especial: '',
  };
}

export default function UserFormModal({ mode, rol, initialData, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<UserFormData>(() => {
    const base = emptyFormData(rol);
    if (mode === 'edit' && initialData) {
      return { ...base, ...initialData, cambiaPassword: false };
    }
    if (rol === 'Admin' || rol === 'Secretaria') base.rol = rol;
    return base;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [periodos, setPeriodos] = useState<PeriodoDTO[]>([]);
  const [secciones, setSecciones] = useState<SeccionDTO[]>([]);
  const [grados, setGrados] = useState<{ id: string; nombre: string; nivel_id: string }[]>([]);

  useEffect(() => {
    if (rol !== 'Alumno') return;
    periodosApi.listar().then(setPeriodos).catch(() => {});
    estructuraApi.grados().then(setGrados).catch(() => {});
  }, [rol]);

  useEffect(() => {
    if (rol !== 'Alumno' || !form.periodo_id) return;
    estructuraApi.secciones({ periodoId: form.periodo_id }).then(setSecciones).catch(() => {});
  }, [rol, form.periodo_id]);

  function set<K extends keyof UserFormData>(key: K, value: UserFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const errors: Record<string, string> = {};
  if (submitAttempted) {
    if (!form.usuario_login.trim()) errors.email = 'Campo obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.usuario_login)) errors.email = 'Formato de correo inválido';
    if (mode === 'create' && form.password.length < 8 && !errors.email) errors.password = 'Mínimo 8 caracteres';
    if (mode === 'create' && form.password !== form.confirmPassword && !errors.password) errors.confirmPassword = 'No coinciden';
    if (mode === 'edit' && form.cambiaPassword) {
      if (form.password.length < 8) errors.password = 'Mínimo 8 caracteres';
      if (form.password !== form.confirmPassword && !errors.password) errors.confirmPassword = 'No coinciden';
    }
    if ((rol === 'Docente' || rol === 'Alumno')) {
      if (!form.nombres.trim()) errors.nombres = 'Campo obligatorio';
      if (!form.apellido_paterno.trim()) errors.apellidoPaterno = 'Campo obligatorio';
      if (!form.apellido_materno.trim()) errors.apellidoMaterno = 'Campo obligatorio';
      if (form.dni.length !== 8) errors.dni = 'Debe tener 8 dígitos';
    }
    if (rol === 'Docente') {
      if (!form.especialidad) errors.especialidad = 'Campo obligatorio';
    }
    if (rol === 'Alumno') {
      if (!form.seccion_id) errors.seccion = 'Campo obligatorio';
      if (!form.periodo_id) errors.periodo = 'Campo obligatorio';
      if (!form.sexo) errors.sexo = 'Campo obligatorio';
      if (!form.fecha_nacimiento) errors.fechaNacimiento = 'Campo obligatorio';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');

    if (Object.keys(errors).some(k => errors[k])) return;

    setSaving(true);
    try {
      if (mode === 'create') {
        await handleCreate();
      } else {
        await handleEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (rol === 'Docente') {
      const payload: CreateDocentePayload = {
        usuario_login: form.usuario_login.trim(),
        password: form.password,
        dni: form.dni,
        nombres: form.nombres.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim(),
        especialidad: form.especialidad,
        telefono: form.telefono.trim() || '000000000',
        email_institucional: form.email_institucional.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        sexo: (form.sexo as 'M' | 'F') || null,
        titulo_profesional: form.titulo_profesional.trim() || null,
        fecha_ingreso: form.fecha_ingreso || null,
      };
      await docentesAdminApi.crear(payload);
      onSuccess('Docente creado correctamente.');
    } else if (rol === 'Alumno') {
      const payload: CreateAlumnoPayload = {
        usuario_login: form.usuario_login.trim(),
        password: form.password,
        seccion_id: form.seccion_id,
        periodo_id: form.periodo_id,
        dni: form.dni,
        nombres: form.nombres.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim(),
        fecha_nacimiento: form.fecha_nacimiento,
        sexo: form.sexo as 'M' | 'F',
        codigo_siagie: form.codigo_siagie.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        distrito: form.distrito.trim() || undefined,
        telefono_emergencia: form.telefono_emergencia.trim() || undefined,
        grupo_sanguineo: form.grupo_sanguineo || undefined,
        condicion_especial: form.condicion_especial.trim() || undefined,
      };
      await alumnosAdminApi.crear(payload);
      onSuccess('Alumno creado correctamente.');
    } else {
      const payload: CreateUsuarioPayload = {
        usuario_login: form.usuario_login.trim(),
        password: form.password,
        rol: form.rol,
      };
      await usuariosApi.crear(payload);
      onSuccess(`Cuenta de ${form.rol === 'Admin' ? 'Administrador' : 'Secretaría'} creada correctamente.`);
    }
  }

  async function handleEdit() {
    const id = initialData?.id;
    if (!id) return;

    if (rol === 'Docente') {
      const payload: UpdateDocentePayload = {};
      if (form.nombres !== initialData.nombres) payload.nombres = form.nombres;
      if (form.apellido_paterno !== initialData.apellido_paterno) payload.apellido_paterno = form.apellido_paterno;
      if (form.apellido_materno !== initialData.apellido_materno) payload.apellido_materno = form.apellido_materno;
      if (form.dni !== initialData.dni) payload.dni = form.dni;
      if (form.especialidad !== initialData.especialidad) payload.especialidad = form.especialidad;
      if (form.telefono !== (initialData.telefono || '')) payload.telefono = form.telefono;
      if (form.usuario_login !== initialData.usuario_login) payload.usuario_login = form.usuario_login;
      if (form.sexo !== initialData.sexo) payload.sexo = form.sexo as 'M' | 'F' || null;
      if (form.fecha_nacimiento !== initialData.fecha_nacimiento) payload.fecha_nacimiento = form.fecha_nacimiento || null;
      if (form.email_institucional !== (initialData.email_institucional || '')) payload.email_institucional = form.email_institucional || null;
      if (form.titulo_profesional !== (initialData.titulo_profesional || '')) payload.titulo_profesional = form.titulo_profesional || null;
      if (form.fecha_ingreso !== initialData.fecha_ingreso) payload.fecha_ingreso = form.fecha_ingreso || null;
      await docentesAdminApi.actualizar(id, payload);
      if (form.cambiaPassword && form.password) {
        await docentesAdminApi.resetContrasena(id, { password_nueva: form.password, confirmacion: form.confirmPassword });
      }
      onSuccess('Docente actualizado correctamente.');
    } else if (rol === 'Alumno') {
      const payload: UpdateAlumnoPayload = {};
      if (form.nombres !== initialData.nombres) payload.nombres = form.nombres;
      if (form.apellido_paterno !== initialData.apellido_paterno) payload.apellido_paterno = form.apellido_paterno;
      if (form.apellido_materno !== initialData.apellido_materno) payload.apellido_materno = form.apellido_materno;
      if (form.dni !== initialData.dni) payload.dni = form.dni;
      if (form.usuario_login !== initialData.usuario_login) payload.usuario_login = form.usuario_login;
      if (form.sexo !== initialData.sexo) payload.sexo = form.sexo as 'M' | 'F';
      if (form.fecha_nacimiento !== initialData.fecha_nacimiento) payload.fecha_nacimiento = form.fecha_nacimiento;
      if (form.seccion_id !== initialData.seccion_id) payload.seccion_id = form.seccion_id;
      if (form.codigo_siagie !== (initialData.codigo_siagie || '')) payload.codigo_siagie = form.codigo_siagie || null;
      if (form.direccion !== (initialData.direccion || '')) payload.direccion = form.direccion || null;
      if (form.distrito !== (initialData.distrito || '')) payload.distrito = form.distrito || null;
      if (form.telefono_emergencia !== (initialData.telefono_emergencia || '')) payload.telefono_emergencia = form.telefono_emergencia || null;
      if (form.grupo_sanguineo !== (initialData.grupo_sanguineo || '')) payload.grupo_sanguineo = form.grupo_sanguineo || null;
      if (form.condicion_especial !== (initialData.condicion_especial || '')) payload.condicion_especial = form.condicion_especial || null;
      await alumnosAdminApi.actualizar(id, payload);
      if (form.cambiaPassword && form.password) {
        await alumnosAdminApi.resetContrasena(id, { password_nueva: form.password, confirmacion: form.confirmPassword });
      }
      onSuccess('Alumno actualizado correctamente.');
    } else {
      const payload: UpdateUsuarioPayload = {};
      if (form.usuario_login !== initialData.usuario_login) payload.usuario_login = form.usuario_login;
      if (Object.keys(payload).length > 0) {
        await usuariosApi.actualizar(id, payload);
      }
      if (form.cambiaPassword && form.password) {
        await usuariosApi.resetContrasena(id, { password_nueva: form.password, confirmacion: form.confirmPassword });
      }
      onSuccess(`Cuenta de ${form.rol === 'Admin' ? 'Administrador' : 'Secretaría'} actualizada correctamente.`);
    }
  }

  function InputField(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    error?: string;
    maxLength?: number;
    className?: string;
    disabled?: boolean;
  }) {
    const { label, value, onChange, placeholder, type = 'text', required, error: fieldError, maxLength, className, disabled } = props;
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          maxLength={maxLength}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
            fieldError
              ? 'border-red-400 bg-red-50 focus:ring-red-400'
              : 'border-slate-200 bg-slate-50 focus:ring-slate-400'
          }`}
        />
        {fieldError && <p className="mt-1 text-xs text-red-500">{fieldError}</p>}
      </div>
    );
  }

  function SelectField(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    required?: boolean;
    error?: string;
    className?: string;
    disabled?: boolean;
  }) {
    const { label, value, onChange, options, placeholder, required, error: fieldError, className, disabled } = props;
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={value}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
            className={`w-full appearance-none border text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
              fieldError
                ? 'border-red-400 bg-red-50 focus:ring-red-400'
                : value ? 'border-slate-200 bg-slate-50 text-slate-700 focus:ring-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500 focus:ring-slate-400'
            }`}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>
        {fieldError && <p className="mt-1 text-xs text-red-500">{fieldError}</p>}
      </div>
    );
  }

  function SectionTitle({ children }: { children: string }) {
    return (
      <div className="col-span-full border-b border-slate-100 pb-1.5 mb-1">
        <h4 className="text-sm font-semibold text-slate-600">{children}</h4>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-800">
            {mode === 'create' ? 'Crear' : 'Editar'} cuenta
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({rol === 'Admin' ? 'Administrador' : rol === 'Secretaria' ? 'Secretaría' : rol})
            </span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="size-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="size-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* ─── Credenciales ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SectionTitle>Credenciales de acceso</SectionTitle>

            <InputField
              label="Correo institucional"
              value={form.usuario_login}
              onChange={v => set('usuario_login', v)}
              placeholder="nombre.apellido@sgei.edu.pe"
              required
              error={errors.email}
              maxLength={50}
              className="sm:col-span-2"
            />

            {(mode === 'create' || (mode === 'edit' && form.cambiaPassword)) && (
              <>
                <InputField
                  label={mode === 'create' ? 'Contraseña' : 'Nueva contraseña'}
                  value={form.password}
                  onChange={v => set('password', v)}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  required={mode === 'create'}
                  error={errors.password}
                />
                <InputField
                  label="Confirmar contraseña"
                  value={form.confirmPassword}
                  onChange={v => set('confirmPassword', v)}
                  type="password"
                  placeholder="Repite la contraseña"
                  required={mode === 'create'}
                  error={errors.confirmPassword}
                />
              </>
            )}

            {mode === 'edit' && !form.cambiaPassword && (
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => set('cambiaPassword', true)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Cambiar contraseña
                </button>
              </div>
            )}
          </div>

          {/* ─── Staff: Rol ─── */}
          {(rol === 'Admin' || rol === 'Secretaria') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SectionTitle>Rol</SectionTitle>
              <SelectField
                label="Rol"
                value={form.rol}
                onChange={v => set('rol', v as 'Admin' | 'Secretaria')}
                options={[
                  { value: 'Admin', label: 'Administrador' },
                  { value: 'Secretaria', label: 'Secretaría' },
                ]}
                required
              />
            </div>
          )}

          {/* ─── Datos personales ─── */}
          {(rol === 'Docente' || rol === 'Alumno') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SectionTitle>Datos personales</SectionTitle>

              <InputField
                label="Nombres"
                value={form.nombres}
                onChange={v => set('nombres', v)}
                placeholder={rol === 'Docente' ? 'Ej. Juan Carlos' : 'Ej. María'}
                required
                error={errors.nombres}
                className="sm:col-span-2"
              />

              <InputField
                label="Apellido paterno"
                value={form.apellido_paterno}
                onChange={v => set('apellido_paterno', v)}
                placeholder="Ej. Pérez"
                required
                error={errors.apellidoPaterno}
              />
              <InputField
                label="Apellido materno"
                value={form.apellido_materno}
                onChange={v => set('apellido_materno', v)}
                placeholder="Ej. González"
                required
                error={errors.apellidoMaterno}
              />

              <InputField
                label="DNI"
                value={form.dni}
                onChange={v => set('dni', v.replace(/\D/g, '').slice(0, 8))}
                placeholder="8 dígitos"
                maxLength={8}
                required
                error={errors.dni}
                className="font-mono"
              />

              <SelectField
                label="Sexo"
                value={form.sexo}
                onChange={v => set('sexo', v)}
                options={SEXOS.map(s => ({ value: s, label: s === 'M' ? 'Masculino' : 'Femenino' }))}
                placeholder={rol === 'Alumno' ? 'Seleccionar…' : 'Opcional…'}
                required={rol === 'Alumno'}
                error={errors.sexo}
              />

              <InputField
                label="Fecha de nacimiento"
                value={form.fecha_nacimiento}
                onChange={v => set('fecha_nacimiento', v)}
                type="date"
                required={rol === 'Alumno'}
                error={errors.fechaNacimiento}
              />
            </div>
          )}

          {/* ─── Datos específicos: Docente ─── */}
          {rol === 'Docente' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SectionTitle>Datos del docente</SectionTitle>

              <SelectField
                label="Área / Especialidad"
                value={form.especialidad}
                onChange={v => set('especialidad', v)}
                options={ESPECIALIDADES.map(m => ({ value: m, label: m }))}
                placeholder="Seleccionar especialidad…"
                required
                error={errors.especialidad}
                className="sm:col-span-2"
              />

              <InputField
                label="Teléfono"
                value={form.telefono}
                onChange={v => set('telefono', v.replace(/\D/g, '').slice(0, 15))}
                placeholder="Ej. 987654321"
                type="tel"
                className="font-mono"
              />

              <InputField
                label="Correo personal"
                value={form.email_institucional}
                onChange={v => set('email_institucional', v)}
                placeholder="correo@ejemplo.com"
                type="email"
              />

              <InputField
                label="Título profesional"
                value={form.titulo_profesional}
                onChange={v => set('titulo_profesional', v)}
                placeholder="Ej. Licenciado en Educación"
                className="sm:col-span-2"
              />

              <InputField
                label="Fecha de ingreso"
                value={form.fecha_ingreso}
                onChange={v => set('fecha_ingreso', v)}
                type="date"
              />
            </div>
          )}

          {/* ─── Datos específicos: Alumno ─── */}
          {rol === 'Alumno' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SectionTitle>Ubicación académica</SectionTitle>

              <SelectField
                label="Período académico"
                value={form.periodo_id}
                onChange={v => { set('periodo_id', v); set('seccion_id', ''); }}
                options={periodos.map(p => ({ value: p.id, label: `${p.nombre} (${p.anio})` }))}
                placeholder="Seleccionar período…"
                required
                error={errors.periodo}
              />

              <SelectField
                label="Sección"
                value={form.seccion_id}
                onChange={v => set('seccion_id', v)}
                options={secciones.map(s => {
                  const grado = grados.find(g => g.id === s.grado.id) ?? { nombre: '' };
                  return { value: s.id, label: `${grado.nombre} - ${s.nombre} (${s.turno})` };
                })}
                placeholder={form.periodo_id ? 'Seleccionar sección…' : 'Primero elige un período'}
                required
                error={errors.seccion}
              />

              <SectionTitle>Datos complementarios</SectionTitle>

              <InputField
                label="Código SIAGIE"
                value={form.codigo_siagie}
                onChange={v => set('codigo_siagie', v)}
                placeholder="Opcional"
                maxLength={20}
              />

              <InputField
                label="Teléfono de emergencia"
                value={form.telefono_emergencia}
                onChange={v => set('telefono_emergencia', v.replace(/\D/g, '').slice(0, 15))}
                placeholder="Ej. 987654321"
                type="tel"
                className="font-mono"
              />

              <SelectField
                label="Grupo sanguíneo"
                value={form.grupo_sanguineo}
                onChange={v => set('grupo_sanguineo', v)}
                options={GRUPOS_SANGUINEOS.map(g => ({ value: g, label: g }))}
                placeholder="Opcional…"
              />

              <InputField
                label="Dirección"
                value={form.direccion}
                onChange={v => set('direccion', v)}
                placeholder="Opcional"
                className="sm:col-span-2"
              />

              <InputField
                label="Distrito"
                value={form.distrito}
                onChange={v => set('distrito', v)}
                placeholder="Opcional"
              />

              <InputField
                label="Condición especial"
                value={form.condicion_especial}
                onChange={v => set('condicion_especial', v)}
                placeholder="Opcional"
                className="sm:col-span-2"
              />
            </div>
          )}

          {/* ─── Acciones ─── */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="size-4 animate-spin" /> Guardando…</>
              ) : mode === 'create' ? 'Crear cuenta' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
