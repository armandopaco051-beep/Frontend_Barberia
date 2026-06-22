import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const CAJA_ESTADO_ENDPOINT = 'ventas-caja/caja/estado/';
const CAJA_HISTORIAL_ENDPOINT = 'ventas-caja/caja/historial/';
const ABRIR_CAJA_ENDPOINT = 'ventas-caja/caja/abrir/';
const CERRAR_CAJA_ENDPOINT = 'ventas-caja/caja/cerrar/';

const EMPTY_APERTURA = { monto_apertura: '' };
const EMPTY_CIERRE = { monto_cierre: '', justificacion_cierre: '' };

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function idCaja(caja) {
  return caja?.id_caja || '';
}

function estaAbierta(caja) {
  return String(caja?.estado || '').toUpperCase() === 'ABIERTA';
}

function formatoMoneda(valor) {
  const numero = Number(valor || 0);
  return `Bs. ${numero.toFixed(2)}`;
}

function formatoFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

function nombreResponsable(caja) {
  return caja?.usuario_apertura_nombre || '-';
}

function nombreUsuarioCierre(caja) {
  return caja?.usuario_cierre_nombre || '-';
}

function badgeEstado(caja) {
  return estaAbierta(caja) ? 'badge-green' : 'badge-gray';
}

// CU18: Gestionar Caja.
// Conecta el frontend con los endpoints reales de ventas-caja para consultar
// caja actual, historial, apertura y cierre sin tocar el backend.
export default function Caja() {
  const [cajaActual, setCajaActual] = useState(null);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [aperturaForm, setAperturaForm] = useState({ ...EMPTY_APERTURA });
  const [cierreForm, setCierreForm] = useState({ ...EMPTY_CIERRE });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: consulta solo el estado actual de caja segun CajaEstadoView.
  const cargarCajaActual = async () => {
    try {
      const response = await api.get(CAJA_ESTADO_ENDPOINT);
      if (response.data?.estado === 'ABIERTA' && response.data?.caja) {
        setCajaActual(response.data.caja);
      } else {
        setCajaActual(null);
      }
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo consultar la caja actual.'), 'error');
    }
  };

  // READ: carga el historial completo que alimenta tabla, busqueda y detalle.
  const cargarHistorialCajas = async () => {
    try {
      const response = await api.get(CAJA_HISTORIAL_ENDPOINT);
      setHistorialCajas(Array.isArray(response.data?.cajas) ? response.data.cajas : []);
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo cargar el historial de cajas.'), 'error');
    }
  };

  const cargar = async () => {
    await Promise.all([cargarCajaActual(), cargarHistorialCajas()]);
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const cerrarModal = () => {
    setModal(null);
    setCajaSeleccionada(null);
    setAperturaForm({ ...EMPTY_APERTURA });
    setCierreForm({ ...EMPTY_CIERRE });
  };

  const abrirModalApertura = () => {
    if (cajaActual) {
      showToast('Ya existe una caja abierta. Cierrala antes de abrir otra.', 'error');
      return;
    }
    setAperturaForm({ ...EMPTY_APERTURA });
    setModal('abrir');
  };

  const abrirModalCierre = (caja = cajaActual) => {
    if (!caja || !estaAbierta(caja)) {
      showToast('No hay una caja abierta para cerrar.', 'error');
      return;
    }
    setCajaSeleccionada(caja);
    setCierreForm({ ...EMPTY_CIERRE });
    setModal('cerrar');
  };

  const abrirDetalle = (caja) => {
    setCajaSeleccionada(caja);
    setModal('detalle');
  };

  // CREATE: registra la apertura de caja con el monto inicial y responsable.
  const abrirCaja = async () => {
    if (!aperturaForm.monto_apertura || Number(aperturaForm.monto_apertura) < 0) {
      showToast('Ingresa un monto inicial valido.', 'error');
      return;
    }

    setLoading(true);
    // CajaAperturaSerializer solo recibe monto_apertura.
    const payload = {
      monto_apertura: aperturaForm.monto_apertura,
    };

    try {
      await api.post(ABRIR_CAJA_ENDPOINT, payload);
      showToast('Caja abierta correctamente.');
      cerrarModal();
      await cargarCajaActual();
      await cargarHistorialCajas();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo abrir la caja.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // UPDATE: cierra la caja activa usando el endpoint de accion del backend.
  const cerrarCaja = async () => {
    if (!cierreForm.monto_cierre || Number(cierreForm.monto_cierre) < 0) {
      showToast('Ingresa un monto final valido.', 'error');
      return;
    }

    setLoading(true);
    // CajaCerrarSerializer recibe monto_cierre y justificacion_cierre.
    const payload = {
      monto_cierre: cierreForm.monto_cierre,
      justificacion_cierre: cierreForm.justificacion_cierre,
    };

    try {
      await api.post(CERRAR_CAJA_ENDPOINT, payload);
      showToast('Caja cerrada correctamente.');
      cerrarModal();
      await cargarCajaActual();
      await cargarHistorialCajas();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo cerrar la caja.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const cajasFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return historialCajas.filter(caja => [
      idCaja(caja),
      caja?.estado,
      nombreResponsable(caja),
      caja?.fecha_apertura,
      caja?.fecha_cierre,
      formatoFecha(caja?.fecha_apertura),
      formatoFecha(caja?.fecha_cierre),
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, historialCajas]);

  const cajasCerradas = historialCajas.filter(caja => !estaAbierta(caja)).length;
  const cajaResumen = cajaActual || historialCajas[0] || null;
  const resumenSub = cajaActual ? 'Caja actual' : 'Última caja registrada';

  return (
    <div>
      <div className="ventas-caja-stats caja-stats">
        <div className="stat-card">
          <div className="label">Estado actual</div>
          <div className={`value ${cajaActual ? 'gold' : ''}`}>{cajaActual ? 'Abierta' : 'Cerrada'}</div>
          <div className="sub">{cajaActual ? `Caja #${idCaja(cajaActual)}` : 'No hay caja abierta'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Monto inicial</div>
          <div className="value">{formatoMoneda(cajaResumen?.monto_apertura)}</div>
          <div className="sub">{resumenSub}</div>
        </div>
        <div className="stat-card">
          <div className="label">Ingresos</div>
          <div className="value gold">{formatoMoneda(cajaResumen?.ingresos)}</div>
          <div className="sub">{resumenSub}</div>
        </div>
        <div className="stat-card">
          <div className="label">Egresos</div>
          <div className="value">{formatoMoneda(cajaResumen?.egresos)}</div>
          <div className="sub">{resumenSub}</div>
        </div>
        <div className="stat-card">
          <div className="label">Saldo actual</div>
          <div className="value gold">{formatoMoneda(cajaResumen?.saldo_actual)}</div>
          <div className="sub">{resumenSub}</div>
        </div>
        <div className="stat-card">
          <div className="label">Historial</div>
          <div className="value">{historialCajas.length}</div>
          <div className="sub">{cajasCerradas} cajas finalizadas</div>
        </div>
      </div>

      <div className="card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Gestión de caja</h3>
            <p className="ventas-caja-subtitle">Controla apertura, cierre y seguimiento diario de caja.</p>
          </div>
          <div className="ventas-caja-row-actions">
            <button className="btn-outline" onClick={cargar}>Actualizar</button>
            {cajaActual ? (
              <button className="btn-gold" onClick={abrirModalCierre}>Cerrar caja</button>
            ) : (
              <button className="btn-gold" onClick={abrirModalApertura}>Abrir caja</button>
            )}
          </div>
        </div>

        {cajaActual ? (
          <div className="caja-current">
            <div>
              <span className="ventas-caja-muted">Responsable</span>
              <strong>{nombreResponsable(cajaActual)}</strong>
            </div>
            <div>
              <span className="ventas-caja-muted">Apertura</span>
              <strong>{formatoFecha(cajaActual.fecha_apertura)}</strong>
            </div>
            <div>
              <span className="ventas-caja-muted">Monto inicial</span>
              <strong>{formatoMoneda(cajaActual.monto_apertura)}</strong>
            </div>
          </div>
        ) : (
          <div className="caja-current">
            <div>
              <span className="ventas-caja-muted">Estado</span>
              <strong>No hay caja abierta</strong>
            </div>
          </div>
        )}

        <div className="search-box ventas-caja-search caja-search">
          <input placeholder="Buscar por responsable, estado o fecha" value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <div className="caja-table-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Caja</th><th>Responsable</th><th>Apertura</th><th>Cierre</th><th>Monto inicial</th><th>Ingresos</th><th>Egresos</th><th>Saldo actual</th><th>Monto final</th><th>Diferencia</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {cajasFiltradas.length === 0 ? (
                <tr><td colSpan={12} className="ventas-caja-empty">No se encontraron cajas registradas.</td></tr>
              ) : cajasFiltradas.map(caja => (
                <tr key={idCaja(caja)}>
                  <td className="ventas-caja-name">#{idCaja(caja)}</td>
                  <td>{nombreResponsable(caja)}</td>
                  <td>{formatoFecha(caja.fecha_apertura)}</td>
                  <td>{formatoFecha(caja.fecha_cierre)}</td>
                  <td>{formatoMoneda(caja.monto_apertura)}</td>
                  <td>{formatoMoneda(caja.ingresos)}</td>
                  <td>{formatoMoneda(caja.egresos)}</td>
                  <td>{formatoMoneda(caja.saldo_actual)}</td>
                  <td>{estaAbierta(caja) ? '-' : formatoMoneda(caja.monto_cierre)}</td>
                  <td>{formatoMoneda(caja.diferencia)}</td>
                  <td><span className={`badge ${badgeEstado(caja)}`}>{estaAbierta(caja) ? 'Abierta' : 'Cerrada'}</span></td>
                  <td className="ventas-caja-row-actions">
                    <button className="btn-outline" onClick={() => abrirDetalle(caja)}>Ver detalle</button>
                    {estaAbierta(caja) && <button className="btn-gold" onClick={() => abrirModalCierre(caja)}>Cerrar caja</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'abrir' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Abrir caja</h3>
            <p>Registra el monto inicial para comenzar las operaciones del dia.</p>
            <div className="form-group">
              <label>Monto inicial</label>
              <input className="input-field" type="number" min="0" step="0.01" value={aperturaForm.monto_apertura} onChange={e => setAperturaForm({ ...aperturaForm, monto_apertura: e.target.value })} placeholder="Ej: 200.00" />
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-outline ventas-caja-modal-button" onClick={() => setAperturaForm({ ...EMPTY_APERTURA })}>Limpiar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={abrirCaja} disabled={loading}>{loading ? 'Guardando...' : 'Abrir caja'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cerrar' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Cerrar caja</h3>
            <p>Registra el monto final contado antes de cerrar la caja activa.</p>
            <div className="form-group">
              <label>Monto final</label>
              <input className="input-field" type="number" min="0" step="0.01" value={cierreForm.monto_cierre} onChange={e => setCierreForm({ ...cierreForm, monto_cierre: e.target.value })} placeholder="Ej: 850.00" />
            </div>
            <div className="form-group">
              <label>Justificacion de cierre</label>
              <textarea className="input-field ventas-caja-textarea" value={cierreForm.justificacion_cierre} onChange={e => setCierreForm({ ...cierreForm, justificacion_cierre: e.target.value })} placeholder="Detalle opcional de cierre" />
            </div>
            <div className="ventas-caja-modal-actions">
              <button className="btn-outline ventas-caja-modal-button" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-outline ventas-caja-modal-button" onClick={() => setCierreForm({ ...EMPTY_CIERRE })}>Limpiar</button>
              <button className="btn-gold ventas-caja-modal-button" onClick={cerrarCaja} disabled={loading}>{loading ? 'Cerrando...' : 'Cerrar caja'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && cajaSeleccionada && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box ventas-caja-plan-modal" onClick={e => e.stopPropagation()}>
            <h3>Detalle de caja #{idCaja(cajaSeleccionada)}</h3>
            <p>Resumen financiero y responsables registrados por el backend.</p>
            <div className="caja-detail-grid">
              {[
                ['Responsable', nombreResponsable(cajaSeleccionada)],
                ['Usuario cierre', nombreUsuarioCierre(cajaSeleccionada)],
                ['Fecha apertura', formatoFecha(cajaSeleccionada.fecha_apertura)],
                ['Fecha cierre', formatoFecha(cajaSeleccionada.fecha_cierre)],
                ['Monto inicial', formatoMoneda(cajaSeleccionada.monto_apertura)],
                ['Ingresos', formatoMoneda(cajaSeleccionada.ingresos)],
                ['Egresos', formatoMoneda(cajaSeleccionada.egresos)],
                ['Saldo esperado', formatoMoneda(cajaSeleccionada.saldo_esperado)],
                ['Saldo actual', formatoMoneda(cajaSeleccionada.saldo_actual)],
                ['Monto final', formatoMoneda(cajaSeleccionada.monto_cierre)],
                ['Diferencia', formatoMoneda(cajaSeleccionada.diferencia)],
                ['Estado', cajaSeleccionada.estado || '-'],
              ].map(([label, value]) => (
                <div key={label} className="caja-detail-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <button className="btn-gold ventas-caja-modal-button" onClick={cerrarModal}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
