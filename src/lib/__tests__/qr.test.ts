import { describe, it, expect, vi } from 'vitest';
import { generateReservationQr } from '../qr';
import QRCode from 'qrcode';

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:qr') },
}));

describe('generateReservationQr', () => {
  it('returns data url', async () => {
    await expect(generateReservationQr('id123')).resolves.toBe('data:qr');
    expect(QRCode.toDataURL).toHaveBeenCalledWith('id123', {
      errorCorrectionLevel: 'M',
    });
  });
});
