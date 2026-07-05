/** Contrato para el envío de emails transaccionales, para poder swappear el proveedor sin tocar los llamadores. */
export interface EmailSender {
  enviarRecuperacion(destinatario: string, token: string): Promise<void>;
}
