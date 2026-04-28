import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

export interface CreateDeliveryAsaasPixChargeRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerCpfCnpj?: string;
  amount: number;
  description?: string;
  externalReference?: string;
}

export interface CreateDeliveryAsaasPixChargeResponse {
  paymentId: string;
  invoiceUrl: string;
  pixCopyPaste?: string;
  pixQrCodeImage?: string;
  status: string;
}

const createAsaasPixChargeFn = httpsCallable<
  CreateDeliveryAsaasPixChargeRequest,
  CreateDeliveryAsaasPixChargeResponse
>(functions, 'createDeliveryAsaasPixCharge');

export async function createDeliveryAsaasPixCharge(
  payload: CreateDeliveryAsaasPixChargeRequest
): Promise<CreateDeliveryAsaasPixChargeResponse> {
  const { data } = await createAsaasPixChargeFn(payload);
  if (!data?.paymentId) {
    throw new Error('Falha ao gerar cobrança PIX.');
  }
  return data;
}
