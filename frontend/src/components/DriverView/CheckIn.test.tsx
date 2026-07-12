import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckIn } from './CheckIn';
import { ApiError, verifyDriver } from '../../api/backend';
import { checkIn } from '../../services/shuttleService';

vi.mock('../../api/backend', async () => {
  const actual = await vi.importActual<typeof import('../../api/backend')>('../../api/backend');
  return { ...actual, verifyDriver: vi.fn() };
});

vi.mock('../../services/shuttleService', () => ({
  checkIn: vi.fn(),
}));

const mockVerifyDriver = vi.mocked(verifyDriver);
const mockCheckIn = vi.mocked(checkIn);

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/phone number/i), '08031234567');
  await user.type(screen.getByLabelText(/pin/i), '1234');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

async function signInAndPickRoute(user: ReturnType<typeof userEvent.setup>) {
  await signIn(user);
  await user.click(await screen.findByRole('button', { name: /cits ↔ bariga/i }));
}

describe('CheckIn', () => {
  beforeEach(() => {
    mockVerifyDriver.mockReset();
    mockCheckIn.mockReset();
  });

  it('shows the sign-in form by default', () => {
    render(<CheckIn />);
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pin/i)).toBeInTheDocument();
  });

  it('lets the driver choose which route they are driving today after verifying', async () => {
    mockVerifyDriver.mockResolvedValue({ driver_id: 'driver-001', name: 'Tunde Balogun' });
    const user = userEvent.setup();
    render(<CheckIn />);

    await signIn(user);

    await waitFor(() => expect(screen.getByText('Tunde Balogun')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /cits ↔ bariga/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cits ↔ yaba/i })).toBeInTheDocument();
  });

  it('shows an error message when verification fails', async () => {
    mockVerifyDriver.mockRejectedValue(new ApiError('Phone number or PIN is incorrect.'));
    const user = userEvent.setup();
    render(<CheckIn />);

    await signIn(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
  });

  it('lets the driver choose a starting stop once a route is picked', async () => {
    mockVerifyDriver.mockResolvedValue({ driver_id: 'driver-001', name: 'Tunde Balogun' });
    const user = userEvent.setup();
    render(<CheckIn />);

    await signInAndPickRoute(user);

    expect(screen.getByRole('button', { name: 'CITS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bariga' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yaba' })).not.toBeInTheDocument();
  });

  it('checks in as arrived at the chosen starting stop, then offers the on-route toggle', async () => {
    mockVerifyDriver.mockResolvedValue({ driver_id: 'driver-001', name: 'Tunde Balogun' });
    mockCheckIn.mockResolvedValueOnce({
      routeId: 'cits-bariga',
      driverId: 'driver-001',
      currentStop: 'cits',
      state: 'arrived',
      updatedAt: Date.now(),
      gps: { verified: true, distanceMeters: 20, accuracy: 15, lat: 0, lon: 0 },
    });
    const user = userEvent.setup();
    render(<CheckIn />);

    await signInAndPickRoute(user);
    await user.click(screen.getByRole('button', { name: 'CITS' }));

    await waitFor(() =>
      expect(mockCheckIn).toHaveBeenCalledWith('cits-bariga', 'driver-001', 'cits', 'arrived'),
    );
    expect(await screen.findByText(/arrived at cits/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /on route to bariga/i })).toBeInTheDocument();
  });

  it('does not block the check-in when GPS is unverified or unavailable', async () => {
    mockVerifyDriver.mockResolvedValue({ driver_id: 'driver-001', name: 'Tunde Balogun' });
    mockCheckIn.mockResolvedValueOnce({
      routeId: 'cits-bariga',
      driverId: 'driver-001',
      currentStop: 'cits',
      state: 'arrived',
      updatedAt: Date.now(),
      gps: { verified: false, distanceMeters: 900, accuracy: 40, lat: 0, lon: 0 },
    });
    const user = userEvent.setup();
    render(<CheckIn />);

    await signInAndPickRoute(user);
    await user.click(screen.getByRole('button', { name: 'CITS' }));

    expect(await screen.findByText(/arrived at cits/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('advances from on-route back to arrived at the destination', async () => {
    mockVerifyDriver.mockResolvedValue({ driver_id: 'driver-001', name: 'Tunde Balogun' });
    mockCheckIn.mockResolvedValueOnce({
      routeId: 'cits-bariga',
      driverId: 'driver-001',
      currentStop: 'cits',
      state: 'arrived',
      updatedAt: Date.now(),
    });
    const user = userEvent.setup();
    render(<CheckIn />);

    await signInAndPickRoute(user);
    await user.click(screen.getByRole('button', { name: 'CITS' }));
    await screen.findByRole('button', { name: /on route to bariga/i });

    mockCheckIn.mockResolvedValueOnce({
      routeId: 'cits-bariga',
      driverId: 'driver-001',
      currentStop: 'cits',
      state: 'on_route',
      updatedAt: Date.now(),
    });
    await user.click(screen.getByRole('button', { name: /on route to bariga/i }));

    await waitFor(() =>
      expect(mockCheckIn).toHaveBeenCalledWith('cits-bariga', 'driver-001', 'cits', 'on_route'),
    );
    expect(await screen.findByRole('button', { name: /arrived at bariga/i })).toBeInTheDocument();
  });
});
