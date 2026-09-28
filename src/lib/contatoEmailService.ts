import emailjs from '@emailjs/browser';

export interface ContatoEmailPayload {
  from_name: string;
  reply_to: string;
  message: string;
}

export async function enviarContatoEmail(payload: ContatoEmailPayload): Promise<void> {
  const serviceId = import.meta.env.VITE_SERVICE_ID;
  const templateId = import.meta.env.VITE_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Configuração de e-mail indisponível.');
  }

  await emailjs.send(
    serviceId,
    templateId,
    { ...payload } as Record<string, unknown>,
    publicKey
  );
}
