import QRCode from 'qrcode';

export async function generateReservationQr(id: string): Promise<string> {
  return QRCode.toDataURL(id, { errorCorrectionLevel: 'M' });
}
