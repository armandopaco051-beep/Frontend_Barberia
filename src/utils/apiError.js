function collectMessages(value) {
  if (value === null || value === undefined) return [];

  if (typeof value === 'string') {
    const message = value.trim();
    if (!message) return [];

    // Algunos 404 del backend llegan como una pagina HTML completa.
    // Evitamos mostrar ese HTML crudo dentro del toast del frontend.
    if (/^<!doctype html/i.test(message) || /^<html/i.test(message)) {
      return ['Endpoint no encontrado en el backend. Verifica la ruta configurada.'];
    }

    return [message];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMessages(item));
  }

  if (typeof value !== 'object') {
    return [];
  }

  const priorityKeys = ['error', 'detail', 'message', 'mensaje', 'bloqueado', 'non_field_errors'];
  for (const key of priorityKeys) {
    if (key in value) {
      const nestedMessages = collectMessages(value[key]);
      if (nestedMessages.length) return nestedMessages;
    }
  }

  return Object.entries(value).flatMap(([field, fieldValue]) => {
    const messages = collectMessages(fieldValue);
    if (!messages.length) return [];
    const label = field.replace(/_/g, ' ');
    return messages.map((message) => `${label}: ${message}`);
  });
}

export function formatApiError(data, fallback = 'Ocurrio un error.') {
  const message = collectMessages(data).join(' | ');
  return message || fallback;
}
