import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckIn } from './CheckIn';
import { ApiError, verifyDriver, verifyDriverPhone } from '../../api/backend';
import { checkIn, checkOut } from '../../services/shuttleService';
import { sendOtp } from '../../services/phoneAuth';
import { isTrustedOnThisDevice, trustOnThisDevice } from '../../utils/deviceTrust';

vi.mock('../../config/featureFlags', () => ({ PHONE_AUTH_ENABLED: true }));

vi.mock('../../api/backend', async () => {
  const actual = await vi.importActual<typeof import('../../api/backend')>('../../api/backend');
  return { ...actual, verifyDriver: vi.fn(), verifyDriverPhone: vi.fn() };
});

vi.mock('../../services/shuttleService', () => ({
  checkIn: vi.fn(),
  checkOut: vi.fn(),
}));

vi.mock('../../services/phoneAuth', () => ({
  sendOtp: vi.fn(),
  resetRecaptcha: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  signInAsDriver: vi.fn().mockResolvedValue(null),
}));

const mockVerifyDriver = vi.mocked(verifyDriver);
const mockVerifyDriverPhone = vi.mocked(verifyDriverPhone);
const mockSendOtp = vi.mocked(sendOtp);
const mockCheckIn = vi.mocked(checkIn);
const mockCheckOut = vi.mocked(checkOut);

async function fillLoginForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/phone number/i), '08031234567');
  await user.type(screen.getByLabelText(/pin/i), '1234');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('CheckIn phone OTP (PHONE_AUTH_ENABLED)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockVerifyDriver.mockReset();
    mockVerifyDriverPhone.mockReset();
    mockSendOtp.mockReset();
    mockCheckIn.mockReset();
    mockCheckOut.mockReset();
    mockCheckOut.mockResolvedValue(undefined);
  });

  it('shows the OTP entry screen when sending the code succeeds', async () => {
    mockSendOtp.mockResolvedValue({ confirm: vi.fn() });
    const user = userEvent.setup();
    render(<CheckIn />);

    await fillLoginForm(user);

    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument();
    expect(mockVerifyDriver).not.toHaveBeenCalled();
  });

  it('verifies the code, proceeds, and trusts the device', async () => {
    mockSendOtp.mockResolvedValue({ confirm: vi.fn().mockResolvedValue('fake-id-token') });
    mockVerifyDriverPhone.mockResolvedValue({
      driver_id: 'driver-001',
      name: 'Tunde Balogun',
      custom_token: null,
    });
    const user = userEvent.setup();
    render(<CheckIn />);

    await fillLoginForm(user);
    await user.type(await screen.findByLabelText(/6-digit code/i), '123456');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => expect(screen.getByText('Tunde Balogun')).toBeInTheDocument());
    expect(mockVerifyDriverPhone).toHaveBeenCalledWith('fake-id-token');
    expect(isTrustedOnThisDevice('08031234567')).toBe(true);
  });

  it('shows an error and stays on the OTP screen for a wrong code', async () => {
    mockSendOtp.mockResolvedValue({ confirm: vi.fn().mockResolvedValue('fake-id-token') });
    mockVerifyDriverPhone.mockRejectedValue(new ApiError('Invalid or expired Firebase ID token.', 401));
    const user = userEvent.setup();
    render(<CheckIn />);

    await fillLoginForm(user);
    await user.type(await screen.findByLabelText(/6-digit code/i), '000000');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or expired/i);
    expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument();
  });

  it('falls back to the PIN form when the backend is not configured (503)', async () => {
    mockSendOtp.mockResolvedValue({ confirm: vi.fn().mockResolvedValue('fake-id-token') });
    mockVerifyDriverPhone.mockRejectedValue(new ApiError('Firebase Admin is not configured.', 503));
    const user = userEvent.setup();
    render(<CheckIn />);

    await fillLoginForm(user);
    await user.type(await screen.findByLabelText(/6-digit code/i), '123456');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(await screen.findByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument();
  });

  it('lets the driver switch back to the PIN form from the OTP screen', async () => {
    mockSendOtp.mockResolvedValue({ confirm: vi.fn() });
    const user = userEvent.setup();
    render(<CheckIn />);

    await fillLoginForm(user);
    await screen.findByLabelText(/6-digit code/i);
    await user.click(screen.getByRole('button', { name: /use pin instead/i }));

    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
  });

  it('falls back to the PIN path when sending the code fails', async () => {
    mockSendOtp.mockRejectedValue(new Error('auth/operation-not-allowed'));
    mockVerifyDriver.mockResolvedValue({ driver_id: 'driver-001', name: 'Tunde Balogun', custom_token: null });
    const user = userEvent.setup();
    render(<CheckIn />);

    await fillLoginForm(user);

    await waitFor(() => expect(screen.getByText('Tunde Balogun')).toBeInTheDocument());
    expect(mockVerifyDriver).toHaveBeenCalledWith('08031234567', '1234');
  });

  it('skips OTP entirely on a device already trusted for this phone number', async () => {
    trustOnThisDevice('08031234567');
    mockVerifyDriver.mockResolvedValue({ driver_id: 'driver-001', name: 'Tunde Balogun', custom_token: null });
    const user = userEvent.setup();
    render(<CheckIn />);

    await fillLoginForm(user);

    await waitFor(() => expect(screen.getByText('Tunde Balogun')).toBeInTheDocument());
    expect(mockSendOtp).not.toHaveBeenCalled();
  });
});
